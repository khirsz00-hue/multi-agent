import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch task with access check
    const { data: task, error: taskError } = await supabase
      .from('video_generation_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()
    
    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      task
    })
  } catch (error: any) {
    console.error('Video status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
