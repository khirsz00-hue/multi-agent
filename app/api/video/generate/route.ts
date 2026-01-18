import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { draftId, videoSettings } = await request.json()
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
    
    // Fetch draft with access check
    const { data: draft, error: draftError } = await supabase
      .from('content_drafts')
      .select('*, agents!inner(space_id, spaces!inner(user_id))')
      .eq('id', draftId)
      .single()
    
    if (draftError || !draft || draft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Get or create video recommendation
    let videoRecommendation = draft.ai_video_recommendation
    if (!videoRecommendation) {
      // Default recommendation if not already present
      videoRecommendation = {
        recommended_type: 'text_only',
        recommended_engine: 'remotion',
        estimated_time_seconds: 60
      }
    }

    // Create video generation task
    const { data: task, error: taskError } = await supabase
      .from('video_generation_tasks')
      .insert({
        content_draft_id: draftId,
        user_id: user.id,
        status: 'queued',
        progress: 0,
        engine: videoSettings?.engine || videoRecommendation.recommended_engine,
        video_type: videoSettings?.type || videoRecommendation.recommended_type,
        estimated_completion_time: videoRecommendation.estimated_time_seconds || 60,
        metadata: {
          hook: draft.hook,
          body: draft.body,
          cta: draft.cta,
          settings: videoSettings || {}
        }
      })
      .select()
      .single()

    if (taskError) {
      console.error('Task creation error:', taskError)
      throw new Error('Failed to create video generation task')
    }

    // In a real implementation, you would trigger the actual video generation here
    // For now, we'll simulate it by updating the task status
    // This would typically be handled by a background worker or queue
    // Fire and forget intentionally - background processing
    simulateVideoGeneration(task.id, supabase).catch(async (err) => {
      console.error('Background video generation error:', err)
      // Update task status to failed on error
      await supabase
        .from('video_generation_tasks')
        .update({ 
          status: 'failed',
          error_message: err.message || 'Video generation failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)
    })

    return NextResponse.json({ 
      success: true, 
      taskId: task.id,
      task
    })
  } catch (error: any) {
    console.error('Video generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Simulate video generation progress
// In production, this would be replaced with actual video generation service integration
async function simulateVideoGeneration(taskId: string, supabase: SupabaseClient) {
  // Simulate processing stages
  const stages = [
    { progress: 10, time: 2000 },
    { progress: 25, time: 3000 },
    { progress: 50, time: 5000 },
    { progress: 75, time: 4000 },
    { progress: 90, time: 2000 },
    { progress: 100, time: 1000 }
  ]

  // Start processing
  await supabase
    .from('video_generation_tasks')
    .update({ 
      status: 'processing', 
      updated_at: new Date().toISOString() 
    })
    .eq('id', taskId)

  // Simulate progress updates
  for (const stage of stages) {
    await new Promise(resolve => setTimeout(resolve, stage.time))
    
    const remainingStages = stages.slice(stages.indexOf(stage) + 1)
    const estimatedTime = remainingStages.reduce((sum, s) => sum + s.time / 1000, 0)
    
    await supabase
      .from('video_generation_tasks')
      .update({ 
        progress: stage.progress,
        estimated_completion_time: Math.ceil(estimatedTime),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
  }

  // Complete the task with a sample video URL
  await supabase
    .from('video_generation_tasks')
    .update({ 
      status: 'completed',
      progress: 100,
      video_url: 'https://www.w3schools.com/html/mov_bbb.mp4', // Sample video for demo
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
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
      
      if (draftError || !contentDraft || contentDraft.agents.spaces.user_id !== user.id) {
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
