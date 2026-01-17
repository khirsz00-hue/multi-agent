import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { restoreVersion, getVersion } from '@/lib/version-tracking'

export async function POST(
  request: Request,
  { params }: { params: { versionId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { versionId } = params
    
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
    
    // Restore the version
    const success = await restoreVersion(
      version.content_draft_id,
      versionId,
      user.id
    )
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to restore version' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Restore version error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
