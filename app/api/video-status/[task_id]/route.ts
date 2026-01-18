import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PikaService } from '@/lib/video-generators/pika'

interface VideoStatusParams {
  params: {
    task_id: string
  }
}

export async function GET(
  request: Request,
  { params }: VideoStatusParams
) {
  try {
    const { task_id } = params
    const { searchParams } = new URL(request.url)
    const engine = searchParams.get('engine') || 'pika'

    // Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
