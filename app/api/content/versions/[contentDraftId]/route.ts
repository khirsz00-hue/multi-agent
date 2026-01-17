import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getVersions } from '@/lib/version-tracking'

export async function GET(
  request: Request,
  context: { params: Promise<{ contentDraftId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { contentDraftId } = await context.params
    
    // Verify user owns this content draft
    const { data: draft } = await supabase
      .from('content_drafts')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', contentDraftId)
      .single()
    
    if (!draft || draft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 })
    }
    
    // Get all versions
    const versions = await getVersions(contentDraftId)
    
    return NextResponse.json({ versions })
  } catch (error: any) {
    console.error('Get versions error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
