import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/content/meme-versions/[contentDraftId]
 * 
 * Get all versions of a meme for a content draft
 * Returns versions ordered by version number (ascending)
 */
export async function GET(
  request: Request,
  { params }: { params: { contentDraftId: string } }
) {
  try {
    const { contentDraftId } = params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get content draft with authorization check
    const { data: contentDraft, error: draftError } = await supabase
      .from('content_drafts')
      .select(`
        *,
        agents!inner(id, space_id, spaces!inner(user_id))
      `)
      .eq('id', contentDraftId)
      .single()
    
    if (draftError || !contentDraft || contentDraft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Content draft not found' }, { status: 404 })
    }
    
    // Get all meme versions for this content draft
    const { data: versions, error: versionsError } = await supabase
      .from('meme_images')
      .select('*')
      .eq('content_draft_id', contentDraftId)
      .order('version', { ascending: true })
    
    if (versionsError) {
      console.error('Error fetching meme versions:', versionsError)
      throw new Error('Failed to fetch meme versions')
    }
    
    // Build version tree with parent-child relationships
    const versionTree = buildVersionTree(versions || [])
    
    return NextResponse.json({
      success: true,
      contentDraft,
      versions: versions || [],
      versionTree,
      latestVersion: versions?.[versions.length - 1] || null
    })
  } catch (error: any) {
    console.error('Get meme versions error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to get meme versions' 
    }, { status: 500 })
  }
}

/**
 * Build a tree structure showing parent-child relationships
 */
function buildVersionTree(versions: any[]) {
  const versionMap = new Map(versions.map(v => [v.id, { ...v, children: [] }]))
  const rootVersions: any[] = []
  
  versions.forEach(version => {
    const node = versionMap.get(version.id)
    if (!node) return
    
    if (version.parent_version_id) {
      const parent = versionMap.get(version.parent_version_id)
      if (parent) {
        parent.children.push(node)
      } else {
        // Parent not found, treat as root
        rootVersions.push(node)
      }
    } else {
      // This is a root version (v1)
      rootVersions.push(node)
    }
  })
  
  return rootVersions
}
