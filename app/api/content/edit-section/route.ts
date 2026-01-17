import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request) {
  try {
    const { versionId, section, content } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate section name
    const validSections = ['hook', 'body', 'cta', 'visual_suggestions']
    if (!validSections.includes(section)) {
      return NextResponse.json(
        { error: `Section must be one of: ${validSections.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Get current version with access check
    const { data: currentVersion } = await supabase
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
    
    if (!currentVersion || currentVersion.content_drafts.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }
    
    const draftId = currentVersion.content_drafts.id
    
    // Create new version with manually edited section
    const newVersionData: any = {
      draft_id: draftId,
      is_current: true,
      hook: currentVersion.hook,
      body: currentVersion.body,
      cta: currentVersion.cta,
      visual_suggestions: currentVersion.visual_suggestions,
      modified_sections: [section],
      change_reason: 'Manual edit',
      changed_by_ai: false
    }
    
    // Update the specific section
    newVersionData[section] = content
    
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
    console.error('Section edit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
