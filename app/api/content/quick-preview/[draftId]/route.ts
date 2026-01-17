import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { draftId: string } }
) {
  try {
    const { draftId } = params
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get draft with access verification
    const { data: draft, error } = await supabase
      .from('content_drafts')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', draftId)
      .single()
    
    if (error || !draft || draft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    
    return NextResponse.json({ draft })
  } catch (error: any) {
    console.error('Preview fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
