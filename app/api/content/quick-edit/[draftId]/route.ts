import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { draft } = await request.json()
    const { draftId } = await params
    
    if (!draft) {
      return NextResponse.json({ error: 'Draft content required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify draft access
    const { data: existingDraft } = await supabase
      .from('content_drafts')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', draftId)
      .single()
    
    if (!existingDraft || existingDraft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    
    // Update draft
    const { data: updated, error } = await supabase
      .from('content_drafts')
      .update({
        draft,
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ success: true, draft: updated })
  } catch (error: any) {
    console.error('Quick edit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
