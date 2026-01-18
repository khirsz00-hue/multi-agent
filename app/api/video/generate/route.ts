import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { draftId, videoSettings } = await request.json()
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
      // Get recommendation from the recommend API
      const recommendResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/video/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      })
      
      if (recommendResponse.ok) {
        const recommendData = await recommendResponse.json()
        videoRecommendation = recommendData.recommendation
      } else {
        // Default recommendation if API fails
        videoRecommendation = {
          recommended_type: 'text_only',
          recommended_engine: 'remotion',
          estimated_time_seconds: 60
        }
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
    simulateVideoGeneration(task.id, supabase)

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
async function simulateVideoGeneration(taskId: string, supabase: any) {
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
}
