import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get all versions of the same content (same pain_point_id and content_type)
    const { data: baseDraft } = await supabase
      .from('content_drafts')
      .select('pain_point_id, content_type, agents!inner(spaces!inner(user_id))')
      .eq('id', params.id)
      .single()
    
    if (!baseDraft || baseDraft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    
    // Get all drafts with same pain point and content type
    const { data: versions, error } = await supabase
      .from('content_drafts')
      .select('*')
      .eq('pain_point_id', baseDraft.pain_point_id)
      .eq('content_type', baseDraft.content_type)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Format versions for display
    const formattedVersions = versions?.map(v => ({
      id: v.id,
      created_at: v.created_at,
      content: {
        hook: v.hook,
        body: v.body,
        cta: v.cta,
        hashtags: v.hashtags,
        visual_suggestions: v.visual_suggestions
      }
    })) || []
    
    return NextResponse.json({ success: true, versions: formattedVersions })
  } catch (error: any) {
    console.error('Versions fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
