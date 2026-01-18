import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createRunwayClient } from '@/lib/video-generators/runway'
import {
  VideoGenerationConfig,
  RunwayError,
  RunwayErrorType
} from '@/lib/video-generators/types'

/**
 * POST /api/video/generate
 * 
 * Generate a video using Runway API:
 * 1. Validate user and input
 * 2. Create video generation task with Runway
 * 3. Store task in database for tracking
 * 4. Return task_id for client to poll status
 */
export async function POST(request: Request) {
  try {
    const { prompt, contentDraftId, config } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Valid prompt is required' }, { status: 400 })
    }
    
    // Validate API key is configured
    if (!process.env.RUNWAY_API_KEY) {
      return NextResponse.json(
        { error: 'Runway API key not configured' },
        { status: 500 }
      )
    }
    
    // If contentDraftId is provided, validate access
    if (contentDraftId) {
      const { data: contentDraft, error: draftError } = await supabase
        .from('content_drafts')
        .select('id, agents!inner(space_id, spaces!inner(user_id))')
        .eq('id', contentDraftId)
        .single()
      
      if (draftError || !contentDraft) {
        return NextResponse.json(
          { error: 'Content draft not found or access denied' },
          { status: 404 }
        )
      }
      
      // Type assertion: agents is an array but should only have one element due to !inner join
      const agent = Array.isArray(contentDraft.agents) ? contentDraft.agents[0] : contentDraft.agents
      const space = Array.isArray(agent?.spaces) ? agent.spaces[0] : agent?.spaces
      
      if (!space || space.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Content draft not found or access denied' },
          { status: 404 }
        )
      }
    }
    
    // Create Runway client and generate video task
    console.log('Creating video generation task with Runway...')
    const runwayClient = createRunwayClient()
    
    // Default configuration for Instagram Reels
    const videoConfig: Partial<VideoGenerationConfig> = {
      resolution: '1080p',
      duration: 30,
      codec: 'h264',
      bitrate: 5000,
      promptingStrategy: 'creative',
      ...config
    }
    
    // Create task with Runway
    const taskResponse = await runwayClient.createVideoTask(prompt, videoConfig)
    console.log('Runway task created:', taskResponse.task_id)
    
    // Store task in database
    const { data: videoTask, error: taskError } = await supabase
      .from('video_tasks')
      .insert({
        content_draft_id: contentDraftId || null,
        task_id: taskResponse.task_id,
        status: taskResponse.status,
        prompt: prompt,
        config: videoConfig,
        estimated_time: taskResponse.estimated_time || 180
      })
      .select()
      .single()
    
    if (taskError) {
      console.error('Error storing video task:', taskError)
      throw new Error('Failed to store video task in database')
    }
    
    console.log('Video task stored in database:', videoTask.id)
    
    return NextResponse.json({
      success: true,
      videoTask: {
        id: videoTask.id,
        task_id: taskResponse.task_id,
        status: taskResponse.status,
        estimated_time: taskResponse.estimated_time,
        message: taskResponse.message
      }
    })
  } catch (error: any) {
    console.error('Video generation error:', error)
    
    // Handle Runway-specific errors
    if (error instanceof RunwayError) {
      let status = 500
      switch (error.type) {
        case RunwayErrorType.AUTHENTICATION_FAILED:
          status = 401
          break
        case RunwayErrorType.RATE_LIMIT_EXCEEDED:
          status = 429
          break
        case RunwayErrorType.INVALID_PROMPT:
          status = 400
          break
      }
      
      return NextResponse.json({
        error: error.message,
        type: error.type
      }, { status })
    }
    
    return NextResponse.json({
      error: error.message || 'Failed to generate video'
    }, { status: 500 })
  }
}
/**
 * GET /api/video/generate?taskId=xxx
 * 
 * Get status of a video generation task
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!taskId) {
      return NextResponse.json({ error: 'taskId parameter is required' }, { status: 400 })
    }
    
    // Get task from database
    const { data: videoTask, error: taskError } = await supabase
      .from('video_tasks')
      .select('*')
      .eq('task_id', taskId)
      .single()
    
    if (taskError || !videoTask) {
      return NextResponse.json({ error: 'Video task not found' }, { status: 404 })
    }
    
    // If task is still pending or processing, check with Runway
    if (videoTask.status === 'pending' || videoTask.status === 'processing') {
      console.log('Checking task status with Runway:', taskId)
      const runwayClient = createRunwayClient()
      
      try {
        const statusResponse = await runwayClient.getTaskStatus(taskId)
        console.log('Runway status response:', statusResponse)
        
        // Update database with new status
        const updates: any = {
          status: statusResponse.status,
          error_message: statusResponse.error_message
        }
        
        // If completed, download and upload video
        if (statusResponse.status === 'completed' && statusResponse.video_url) {
          console.log('Task completed, downloading and uploading video...')
          const uploadResult = await runwayClient.downloadAndUploadVideo(
            statusResponse.video_url,
            user.id,
            taskId
          )
          
          if (uploadResult.success) {
            updates.video_url = statusResponse.video_url
            updates.storage_path = uploadResult.storagePath
            updates.supabase_url = uploadResult.publicUrl
            updates.completed_at = new Date().toISOString()
          } else {
            console.error('Failed to upload video:', uploadResult.error)
            updates.error_message = uploadResult.error
          }
        }
        
        // Update database
        const { data: updatedTask, error: updateError } = await supabase
          .from('video_tasks')
          .update(updates)
          .eq('id', videoTask.id)
          .select()
          .single()
        
        if (updateError) {
          console.error('Error updating video task:', updateError)
        } else {
          return NextResponse.json({
            success: true,
            videoTask: updatedTask
          })
        }
      } catch (error) {
        console.error('Error checking Runway status:', error)
        // Continue to return existing database status
      }
    }
    
    return NextResponse.json({
      success: true,
      videoTask
    })
  } catch (error: any) {
    console.error('Video status check error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to check video status'
    }, { status: 500 })
  }
}
