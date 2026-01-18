import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pollVideoStatus, type VideoEngine } from '@/lib/video-generators/status-poller'

// Type for nested database query result
interface VideoTaskWithDraft {
  id: string
  content_draft_id: string
  external_task_id: string
  engine: string
  status: string
  progress: number
  eta_seconds: number | null
  error_message: string | null
  video_url: string | null
  last_polled_at: string | null
  content_drafts: {
    id: string
    agents: {
      id: string
      spaces: {
        user_id: string
      }
    }
  }
}

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
  const supabase = await createClient()
  const { task_id } = await context.params
  const { searchParams } = new URL(request.url)
  const engine = searchParams.get('engine')
  
  try {
import { PikaService } from '@/lib/video-generators/pika'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ task_id: string }> }
) {
  try {
    const { task_id } = await params
    const { searchParams } = new URL(request.url)
    const engine = searchParams.get('engine') || 'pika'

    // Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
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
      .single<VideoTaskWithDraft>()
    
    if (taskError || !task) {
      return NextResponse.json({ 
        error: 'Task not found' 
      }, { status: 404 })
    }
    
    // Verify user owns the content draft
    const draft = task.content_drafts
    if (!draft || !draft.agents || !draft.agents.spaces || draft.agents.spaces.user_id !== user.id) {
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
      statusResponse = await pollVideoStatus(task_id, engine as VideoEngine)
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
    if (task_id && engine) {
      try {
        await supabase
          .from('video_generation_tasks')
          .update({
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('external_task_id', task_id)
          .eq('engine', engine)
      } catch (logError) {
        console.error('Failed to log error:', logError)
      }
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to poll video status',
      suggestion: 'Please check your task ID and try again. If the problem persists, contact support.'
    }, { status: 500 })
  }
}

    // Fetch video task from database
    const { data: videoTask, error: taskError } = await supabase
      .from('video_tasks')
      .select('*')
      .eq('id', task_id)
      .eq('user_id', user.id)
      .single()

    if (taskError || !videoTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check if task is already completed or failed
    if (videoTask.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        progress: 100,
        video_url: videoTask.video_url,
        thumbnail_url: videoTask.thumbnail_url,
        completed_at: videoTask.completed_at
      })
    }

    if (videoTask.status === 'failed' || videoTask.status === 'timeout') {
      return NextResponse.json({
        status: videoTask.status,
        error: videoTask.error_message,
        progress: videoTask.progress
      })
    }

    // Check for timeout (5 minutes max)
    const startedAt = new Date(videoTask.started_at || videoTask.created_at)
    const now = new Date()
    const elapsedMs = now.getTime() - startedAt.getTime()
    const timeoutMs = 5 * 60 * 1000 // 5 minutes

    if (elapsedMs > timeoutMs) {
      // Mark as timeout
      await supabase
        .from('video_tasks')
        .update({
          status: 'timeout',
          error_message: 'Video generation timed out after 5 minutes'
        })
        .eq('id', task_id)

      return NextResponse.json({
        status: 'timeout',
        error: 'Video generation timed out after 5 minutes',
        progress: videoTask.progress
      })
    }

    // Poll the video service for status update
    if (engine === 'pika') {
      const pikaService = new PikaService()
      
      try {
        const statusResponse = await pikaService.getTaskStatus(videoTask.task_id)

        // Update database with latest status
        const updateData: any = {
          status: statusResponse.status,
          progress: statusResponse.progress || videoTask.progress,
          eta_seconds: statusResponse.eta,
        }

        if (statusResponse.status === 'completed') {
          updateData.video_url = statusResponse.videoUrl
          updateData.thumbnail_url = statusResponse.thumbnailUrl
          updateData.completed_at = new Date().toISOString()
          updateData.progress = 100
        } else if (statusResponse.status === 'failed') {
          updateData.error_message = statusResponse.error || 'Video generation failed'
        }

        await supabase
          .from('video_tasks')
          .update(updateData)
          .eq('id', task_id)

        // If completed, update the content draft if associated
        if (statusResponse.status === 'completed' && videoTask.draft_id && statusResponse.videoUrl) {
          await supabase
            .from('content_drafts')
            .update({
              video_url: statusResponse.videoUrl,
              video_engine: 'pika',
              video_type: 'short-form',
              video_generated_at: new Date().toISOString(),
              video_settings: {
                duration: videoTask.duration_seconds,
                style: videoTask.style,
                quality: videoTask.quality,
                ...videoTask.config
              }
            })
            .eq('id', videoTask.draft_id)
        }

        // Calculate estimated time remaining
        const etaFormatted = statusResponse.eta 
          ? formatETA(statusResponse.eta)
          : null

        return NextResponse.json({
          status: statusResponse.status,
          progress: statusResponse.progress || 0,
          eta: statusResponse.eta,
          eta_formatted: etaFormatted,
          video_url: statusResponse.videoUrl,
          thumbnail_url: statusResponse.thumbnailUrl,
          error: statusResponse.error,
          updated_at: new Date().toISOString()
        })

      } catch (error: any) {
        console.error('Pika status polling error:', error)
        
        // Increment retry count
        const newRetryCount = (videoTask.retry_count || 0) + 1
        
        // If too many retries, mark as failed
        if (newRetryCount >= 3) {
          await supabase
            .from('video_tasks')
            .update({
              status: 'failed',
              error_message: `Failed to poll status after ${newRetryCount} attempts: ${error.message}`,
              retry_count: newRetryCount
            })
            .eq('id', task_id)

          return NextResponse.json({
            status: 'failed',
            error: `Failed to poll status: ${error.message}`,
            progress: videoTask.progress
          })
        }

        // Update retry count and continue
        await supabase
          .from('video_tasks')
          .update({ retry_count: newRetryCount })
          .eq('id', task_id)

        // Return current known status
        return NextResponse.json({
          status: videoTask.status,
          progress: videoTask.progress || 0,
          eta: videoTask.eta_seconds,
          eta_formatted: videoTask.eta_seconds ? formatETA(videoTask.eta_seconds) : null,
          message: 'Temporary polling error, will retry'
        })
      }
    } else {
      return NextResponse.json({ 
        error: 'Unsupported video engine' 
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Video status error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to get video status',
      details: error.toString()
    }, { status: 500 })
  }
}

/**
 * Format ETA seconds into human-readable string
 */
function formatETA(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s remaining`
  }
  
  const minutes = Math.ceil(seconds / 60)
  if (minutes === 1) {
    return '~1 min remaining'
  }
  
  return `~${minutes} min remaining`
}
