import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { versionId } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get the version to restore with access check
    const { data: versionToRestore } = await supabase
      .from('content_versions')
      .select(`
        *,
        content_drafts!inner(
          id,
          agents!inner(
            space_id,
            spaces!inner(user_id)
          )
        )
      `)
      .eq('id', versionId)
      .single()
    
    if (!versionToRestore || versionToRestore.content_drafts.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }
    
    const draftId = versionToRestore.content_drafts.id
    
    // Create new version with all sections from the version to restore
    const newVersionData = {
      draft_id: draftId,
      is_current: true,
      hook: versionToRestore.hook,
      body: versionToRestore.body,
      cta: versionToRestore.cta,
      visual_suggestions: versionToRestore.visual_suggestions,
      modified_sections: ['hook', 'body', 'cta', 'visual_suggestions'],
      change_reason: `Restored from version ${versionToRestore.version_number}`,
      changed_by_ai: false
    }
    
    const { data: newVersion, error: versionError } = await supabase
      .from('content_versions')
      .insert(newVersionData)
      .select()
      .single()
    
    if (versionError) throw versionError
    
    // Update draft with new current version
    await supabase
      .from('content_drafts')
      .update({ current_version_id: newVersion.id })
      .eq('id', draftId)
    
    return NextResponse.json({
      success: true,
      version: newVersion
    })
  } catch (error: any) {
    console.error('Version restore error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
