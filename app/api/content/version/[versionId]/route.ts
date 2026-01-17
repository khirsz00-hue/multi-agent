import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getVersion } from '@/lib/version-tracking'

export async function GET(
  request: Request,
  context: { params: Promise<{ versionId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { versionId } = await context.params
    
    // Get the version
    const version = await getVersion(versionId)
    
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }
    
    // Verify user owns this content draft
    const { data: draft } = await supabase
      .from('content_drafts')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', version.content_draft_id)
      .single()
    
    if (!draft || draft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    return NextResponse.json({ version })
  } catch (error: any) {
    console.error('Get version error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
