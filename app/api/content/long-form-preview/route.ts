import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { draftId } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get draft with current version and all versions
    const { data: draft } = await supabase
      .from('content_drafts')
      .select(`
        *,
        agents!inner(
          *,
          spaces!inner(user_id)
        ),
        pain_point:audience_insights(*),
        current_version:content_versions!content_drafts_current_version_id_fkey(*)
      `)
      .eq('id', draftId)
      .single()
    
    if (!draft || draft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    
    // Get all versions for this draft
    const { data: versions } = await supabase
      .from('content_versions')
      .select('*')
      .eq('draft_id', draftId)
      .order('version_number', { ascending: false })
    
    return NextResponse.json({
      success: true,
      draft: {
        ...draft,
        versions: versions || []
      }
    })
  } catch (error: any) {
    console.error('Preview fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
