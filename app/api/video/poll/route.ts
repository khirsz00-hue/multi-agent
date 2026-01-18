import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRunwayClient } from '@/lib/video-generators/runway'
import { PollingOptions } from '@/lib/video-generators/types'

/**
 * POST /api/video/poll
 * 
 * Poll for video completion with exponential backoff.
 * This endpoint will wait until the video is complete or timeout.
 * 
 * Body:
 * - taskId: Runway task ID or database video task ID
 * - options: Optional polling configuration
 */
export async function POST(request: Request) {
  try {
    const { taskId, options } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }
    
    // Validate API key is configured
    if (!process.env.RUNWAY_API_KEY) {
      return NextResponse.json(
        { error: 'Runway API key not configured' },
        { status: 500 }
      )
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
    
    // Check if already completed
    if (videoTask.status === 'completed') {
      return NextResponse.json({
        success: true,
        videoTask,
        message: 'Video already completed'
      })
    }
    
    // Check if already failed
    if (videoTask.status === 'failed') {
      return NextResponse.json({
        success: false,
        videoTask,
        error: videoTask.error_message || 'Video generation failed'
      }, { status: 400 })
    }
    
    console.log('Starting video polling for task:', taskId)
    
    // Poll with Runway client
    const runwayClient = createRunwayClient()
    
    const pollingOptions: Partial<PollingOptions> = {
      initialDelay: 5000, // 5 seconds
      maxDelay: 60000, // 60 seconds
      maxAttempts: 60, // ~5 minutes
      backoffMultiplier: 1.5,
      ...options
    }
    
    try {
      const statusResponse = await runwayClient.pollTaskStatus(
        taskId,
        pollingOptions
      )
      
      console.log('Video task completed:', statusResponse)
      
      // Update database with completed status
      const updates: any = {
        status: statusResponse.status,
        error_message: statusResponse.error_message
      }
      
      // Download and upload video if successful
      if (statusResponse.status === 'completed' && statusResponse.video_url) {
        console.log('Downloading and uploading video...')
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
          updates.status = 'failed'
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
        throw new Error('Failed to update video task')
      }
      
      console.log('Video task updated in database')
      
      return NextResponse.json({
        success: true,
        videoTask: updatedTask,
        message: 'Video generation completed successfully'
      })
      
    } catch (error: any) {
      console.error('Polling error:', error)
      
      // Update database with error
      await supabase
        .from('video_tasks')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', videoTask.id)
      
      return NextResponse.json({
        error: error.message || 'Video generation failed',
        videoTask: {
          ...videoTask,
          status: 'failed',
          error_message: error.message
        }
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error('Video polling error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to poll video status'
    }, { status: 500 })
  }
}
