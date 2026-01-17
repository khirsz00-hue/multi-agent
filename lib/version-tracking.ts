import { createClient } from '@/lib/supabase/server'

export interface ContentVersion {
  id: string
  content_draft_id: string
  version_number: number
  version_type: 'generated' | 'user_edited' | 'ai_refined' | 'restored'
  content_snapshot: any
  edited_fields: string[]
  change_description?: string
  diff_data?: any
  created_by?: string
  created_at: string
}

export interface VersionDiff {
  field: string
  oldValue: any
  newValue: any
  changeType: 'added' | 'removed' | 'modified'
}

/**
 * Create a new version of a content draft
 */
export async function createVersion(
  contentDraftId: string,
  versionType: ContentVersion['version_type'],
  contentSnapshot: any,
  options?: {
    editedFields?: string[]
    changeDescription?: string
    userId?: string
  }
): Promise<ContentVersion | null> {
  try {
    const supabase = await createClient()
    
    // Get next version number
    const { data: maxVersion } = await supabase
      .from('content_versions')
      .select('version_number')
      .eq('content_draft_id', contentDraftId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()
    
    const nextVersionNumber = (maxVersion?.version_number || 0) + 1
    
    // Insert new version
    const { data, error } = await supabase
      .from('content_versions')
      .insert({
        content_draft_id: contentDraftId,
        version_number: nextVersionNumber,
        version_type: versionType,
        content_snapshot: contentSnapshot,
        edited_fields: options?.editedFields || [],
        change_description: options?.changeDescription,
        created_by: options?.userId
      })
      .select()
      .single()
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Error creating version:', error)
    return null
  }
}

/**
 * Get all versions for a content draft
 */
export async function getVersions(contentDraftId: string): Promise<ContentVersion[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('content_versions')
      .select('*')
      .eq('content_draft_id', contentDraftId)
      .order('version_number', { ascending: false })
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.error('Error getting versions:', error)
    return []
  }
}

/**
 * Get a specific version by ID
 */
export async function getVersion(versionId: string): Promise<ContentVersion | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('content_versions')
      .select('*')
      .eq('id', versionId)
      .single()
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Error getting version:', error)
    return null
  }
}

/**
 * Calculate diff between two versions
 */
export function calculateDiff(
  oldVersion: any,
  newVersion: any,
  fields: string[] = ['title', 'hook', 'body', 'cta', 'hashtags']
): VersionDiff[] {
  const diffs: VersionDiff[] = []
  
  for (const field of fields) {
    const oldValue = oldVersion?.[field]
    const newValue = newVersion?.[field]
    
    if (oldValue === undefined && newValue !== undefined) {
      diffs.push({
        field,
        oldValue: null,
        newValue,
        changeType: 'added'
      })
    } else if (oldValue !== undefined && newValue === undefined) {
      diffs.push({
        field,
        oldValue,
        newValue: null,
        changeType: 'removed'
      })
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diffs.push({
        field,
        oldValue,
        newValue,
        changeType: 'modified'
      })
    }
  }
  
  return diffs
}

/**
 * Generate automatic change description based on edited fields
 */
export function generateChangeDescription(editedFields: string[]): string {
  if (!editedFields || editedFields.length === 0) {
    return 'No changes'
  }
  
  const fieldLabels: Record<string, string> = {
    title: 'title',
    hook: 'hook',
    body: 'body content',
    cta: 'call-to-action',
    hashtags: 'hashtags',
    visual_suggestions: 'visual suggestions',
    tone: 'tone',
    goal: 'goal'
  }
  
  const changes = editedFields.map(field => fieldLabels[field] || field)
  
  if (changes.length === 1) {
    return `Updated ${changes[0]}`
  } else if (changes.length === 2) {
    return `Updated ${changes[0]} and ${changes[1]}`
  } else {
    const lastChange = changes.pop()
    return `Updated ${changes.join(', ')}, and ${lastChange}`
  }
}

/**
 * Restore a content draft to a specific version
 */
export async function restoreVersion(
  contentDraftId: string,
  versionId: string,
  userId?: string
): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    // Get the version to restore
    const version = await getVersion(versionId)
    if (!version) {
      throw new Error('Version not found')
    }
    
    // Verify version belongs to the draft
    if (version.content_draft_id !== contentDraftId) {
      throw new Error('Version does not belong to this draft')
    }
    
    // Get current draft data before update
    const { data: currentDraft } = await supabase
      .from('content_drafts')
      .select('*')
      .eq('id', contentDraftId)
      .single()
    
    if (!currentDraft) {
      throw new Error('Draft not found')
    }
    
    // Create a snapshot of current state before restoring
    const currentSnapshot = {
      title: currentDraft.title,
      hook: currentDraft.hook,
      body: currentDraft.body,
      cta: currentDraft.cta,
      hashtags: currentDraft.hashtags,
      visual_suggestions: currentDraft.visual_suggestions,
      tone: currentDraft.tone,
      goal: currentDraft.goal,
      target_platform: currentDraft.target_platform
    }
    
    // Create a version for the current state (before restore)
    await createVersion(
      contentDraftId,
      'user_edited',
      currentSnapshot,
      {
        changeDescription: `Before restoring to version ${version.version_number}`,
        userId
      }
    )
    
    // Update the draft with the restored content
    const restoredContent = version.content_snapshot
    const { error: updateError } = await supabase
      .from('content_drafts')
      .update({
        title: restoredContent.title,
        hook: restoredContent.hook,
        body: restoredContent.body,
        cta: restoredContent.cta,
        hashtags: restoredContent.hashtags,
        visual_suggestions: restoredContent.visual_suggestions,
        tone: restoredContent.tone,
        goal: restoredContent.goal,
        target_platform: restoredContent.target_platform,
        updated_at: new Date().toISOString()
      })
      .eq('id', contentDraftId)
    
    if (updateError) throw updateError
    
    // Create a new version marking this as a restoration
    await createVersion(
      contentDraftId,
      'restored',
      restoredContent,
      {
        changeDescription: `Restored to version ${version.version_number}`,
        userId
      }
    )
    
    return true
  } catch (error) {
    console.error('Error restoring version:', error)
    return false
  }
}

/**
 * Compare two versions and return detailed diff
 */
export async function compareVersions(
  versionId1: string,
  versionId2: string
): Promise<VersionDiff[]> {
  try {
    const version1 = await getVersion(versionId1)
    const version2 = await getVersion(versionId2)
    
    if (!version1 || !version2) {
      throw new Error('One or both versions not found')
    }
    
    return calculateDiff(
      version1.content_snapshot,
      version2.content_snapshot
    )
  } catch (error) {
    console.error('Error comparing versions:', error)
    return []
  }
}
