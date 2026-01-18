import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { jobId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Query video_jobs table for job status
    const { data: job, error } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id) // Ensure user owns this job
      .single()
    
    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    // Return job status
    return NextResponse.json({
      status: job.status, // 'pending' | 'processing' | 'completed' | 'failed'
      progress: job.progress || 0,
      videoUrl: job.video_url,
      error: job.error_message,
      estimatedCompletion: job.estimated_completion,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    })
  } catch (error: any) {
    console.error('Video status check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
