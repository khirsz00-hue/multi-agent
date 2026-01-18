import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PikaService, validatePikaConfig, type PikaVideoConfig } from '@/lib/video-generators/pika'

interface GenerateVideoRequest {
  concept: string
  draftId?: string
  duration?: number // 15-60 seconds
  style?: PikaVideoConfig['style']
  quality?: PikaVideoConfig['quality']
  engine?: 'pika' | 'remotion' | 'creatomate' | 'd-id' | 'heygen'
}

export async function POST(request: Request) {
  try {
    const body: GenerateVideoRequest = await request.json()
    const { concept, draftId, duration, style, quality, engine = 'pika' } = body

    // Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate draft access if draftId provided
    if (draftId) {
      const { data: draft, error: draftError } = await supabase
        .from('content_drafts')
        .select('*, agents!inner(space_id, spaces!inner(user_id))')
        .eq('id', draftId)
        .single()
      
      if (draftError || !draft || draft.agents.spaces.user_id !== user.id) {
        return NextResponse.json({ error: 'Draft not found or access denied' }, { status: 404 })
      }
    }

    // Only support Pika for now (as per PR requirements)
    if (engine !== 'pika') {
      return NextResponse.json({ 
        error: 'Only Pika engine is currently supported for short-form video generation' 
      }, { status: 400 })
    }

    // Validate configuration
    const config: PikaVideoConfig = {
      prompt: concept,
      duration: duration || 30,
      style: style || 'default',
      quality: quality || 'standard',
      aspectRatio: '9:16', // Optimized for TikTok/Instagram Reels
      fps: 30
    }

    const validationErrors = validatePikaConfig(config)
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Invalid video configuration',
        details: validationErrors
      }, { status: 400 })
    }

    // Initialize Pika service
    const pikaService = new PikaService()

    // Create video generation task
    const taskResponse = await pikaService.createVideo(config)

    // Save task to database
    const { data: videoTask, error: taskError } = await supabase
      .from('video_tasks')
      .insert({
        user_id: user.id,
        draft_id: draftId || null,
        task_id: taskResponse.taskId,
        engine: 'pika',
        status: taskResponse.status,
        prompt: concept,
        duration_seconds: config.duration,
        style: config.style,
        quality: config.quality,
        config: {
          aspect_ratio: config.aspectRatio,
          fps: config.fps
        },
        progress: taskResponse.progress || 0,
        eta_seconds: taskResponse.eta,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (taskError) {
      console.error('Failed to save video task to database:', taskError)
      // Try to cancel the Pika task since we couldn't save it
      await pikaService.cancelTask(taskResponse.taskId).catch((cancelError) => {
        console.error('Failed to cancel Pika task after database error:', cancelError)
      })
      throw taskError
    }

    // Return task ID for client to poll
    return NextResponse.json({
      success: true,
      taskId: videoTask.id,
      pikaTaskId: taskResponse.taskId,
      status: taskResponse.status,
      progress: taskResponse.progress,
      eta: taskResponse.eta,
      message: 'Video generation started. Use the taskId to poll for status.'
    })

  } catch (error: any) {
    console.error('Generate video error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate video',
      details: error.toString()
    }, { status: 500 })
  }
}
