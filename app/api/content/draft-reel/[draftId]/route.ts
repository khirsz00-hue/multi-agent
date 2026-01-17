import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateReelScenario, calculateQualityScore, type ReelScenario } from '@/lib/reel-validator'

interface EditRecord {
  timestamp: string
  field: string
  old_value: any
  new_value: any
}

export async function PUT(
  request: Request,
  { params }: { params: { draftId: string } }
) {
  try {
    const { updatedScenario, changedFields } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get existing draft with access check
    const { data: existingDraft } = await supabase
      .from('draft_reel_scenarios')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', params.draftId)
      .single()
    
    if (!existingDraft || existingDraft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    
    // Build edit history
    const currentScenario = existingDraft.draft_scenario as ReelScenario
    const editHistory = Array.isArray(existingDraft.edit_history) 
      ? existingDraft.edit_history 
      : []
    
    // Track changes
    const newEdits: EditRecord[] = []
    if (changedFields) {
      Object.keys(changedFields).forEach(field => {
        const oldValue = (currentScenario as any)[field]
        const newValue = changedFields[field]
        
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          newEdits.push({
            timestamp: new Date().toISOString(),
            field,
            old_value: oldValue,
            new_value: newValue
          })
        }
      })
    }
    
    const updatedEditHistory = [...editHistory, ...newEdits]
    
    // Validate the updated scenario
    const validation = validateReelScenario(updatedScenario)
    const qualityScore = calculateQualityScore(updatedScenario, validation)
    
    // Update the draft
    const { data: updatedDraft, error } = await supabase
      .from('draft_reel_scenarios')
      .update({
        draft_scenario: updatedScenario,
        edit_history: updatedEditHistory,
        validation_results: validation,
        estimated_quality_score: qualityScore,
        status: validation.overall_valid ? 'ready_to_finalize' : 'editing',
        version: existingDraft.version + 1
      })
      .eq('id', params.draftId)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true, 
      draft: updatedDraft,
      validation,
      qualityScore,
      editsCount: newEdits.length
    })
  } catch (error: any) {
    console.error('Draft update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { draftId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get draft with access check
    const { data: draft } = await supabase
      .from('draft_reel_scenarios')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', params.draftId)
      .single()
    
    if (!draft || draft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      draft
    })
  } catch (error: any) {
    console.error('Draft fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
