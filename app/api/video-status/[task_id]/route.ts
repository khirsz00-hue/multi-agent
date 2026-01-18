import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pollVideoStatus, type VideoEngine } from '@/lib/video-generators/status-poller'

/**
 * GET /api/video-status/[task_id]?engine={runway|pika}
 * 
 * Poll video generation status from external API (Runway or Pika)
 * 
 * Features:
 * - Unified status response format
 * - Response caching (5 seconds)
 * - Rate limiting (1 req/5 sec per task)
 * - User ownership verification
 * - Error logging to database
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ task_id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { task_id } = await context.params
    const { searchParams } = new URL(request.url)
    const engine = searchParams.get('engine') as VideoEngine | null
    
    // Validate engine parameter
    if (!engine || (engine !== 'runway' && engine !== 'pika')) {
      return NextResponse.json({ 
        error: 'Invalid or missing engine parameter. Must be "runway" or "pika"' 
      }, { status: 400 })
    }
    
    // Get task from database and verify ownership
    const { data: task, error: taskError } = await supabase
      .from('video_generation_tasks')
      .select(`
        *,
        content_drafts!inner(
          id,
          agents!inner(
            id,
            spaces!inner(user_id)
          )
        )
      `)
      .eq('external_task_id', task_id)
      .eq('engine', engine)
      .single()
    
    if (taskError || !task) {
      return NextResponse.json({ 
        error: 'Task not found' 
      }, { status: 404 })
    }
    
    // Verify user owns the content draft
    const draft = task.content_drafts as any
    if (!draft || draft.agents?.spaces?.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized access to this task' 
      }, { status: 403 })
    }
    
    // Check rate limiting: max 1 request per 5 seconds per task
    const lastPolled = task.last_polled_at ? new Date(task.last_polled_at).getTime() : 0
    const now = Date.now()
    const timeSinceLastPoll = now - lastPolled
    
    if (timeSinceLastPoll < 5000) {
      // Return cached status from database
      return NextResponse.json({
        task_id: task.external_task_id,
        engine: task.engine,
        status: task.status,
        progress: task.progress || 0,
        eta_seconds: task.eta_seconds,
        error: task.error_message,
        video_url: task.video_url,
        cached: true,
        retry_after: Math.ceil((5000 - timeSinceLastPoll) / 1000)
      })
    }
    
    // Poll external API for status
    let statusResponse
    try {
      statusResponse = await pollVideoStatus(task_id, engine)
    } catch (pollError: any) {
      // Log polling error to database
      await supabase
        .from('video_generation_tasks')
        .update({
          error_message: pollError.message,
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)
      
      return NextResponse.json({
        error: pollError.message,
        suggestion: 'The video generation service may be temporarily unavailable. Please try again later.'
      }, { status: 500 })
    }
    
    // Update task in database
    const { error: updateError } = await supabase
      .from('video_generation_tasks')
      .update({
        status: statusResponse.status,
        progress: statusResponse.progress,
        eta_seconds: statusResponse.eta_seconds,
        error_message: statusResponse.error,
        video_url: statusResponse.video_url,
        last_polled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id)
    
    if (updateError) {
      console.error('Failed to update task status:', updateError)
    }
    
    // If completed, update content_draft with video URL
    if (statusResponse.status === 'completed' && statusResponse.video_url) {
      await supabase
        .from('content_drafts')
        .update({
          video_url: statusResponse.video_url,
          video_engine: engine,
          video_generated_at: new Date().toISOString()
        })
        .eq('id', task.content_draft_id)
    }
    
    return NextResponse.json(statusResponse)
  } catch (error: any) {
    console.error('Video status polling error:', error)
    
    // Log error to database if possible
    try {
      const supabase = await createClient()
      const { task_id } = await context.params
      const { searchParams } = new URL(request.url)
      const engine = searchParams.get('engine')
      
      if (task_id && engine) {
        await supabase
          .from('video_generation_tasks')
          .update({
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('external_task_id', task_id)
          .eq('engine', engine)
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to poll video status',
      suggestion: 'Please check your task ID and try again. If the problem persists, contact support.'
    }, { status: 500 })
  }
}
