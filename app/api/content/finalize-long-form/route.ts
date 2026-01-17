import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { draftId, status } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate status
    const validStatuses = ['ready', 'scheduled', 'posted']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Get draft with access check
    const { data: draft } = await supabase
      .from('content_drafts')
      .select(`
        *,
        agents!inner(
          *,
          spaces!inner(user_id)
        )
      `)
      .eq('id', draftId)
      .single()
    
    if (!draft || draft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    
    // Update draft status
    const { data: updatedDraft, error: updateError } = await supabase
      .from('content_drafts')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId)
      .select()
      .single()
    
    if (updateError) throw updateError
    
    return NextResponse.json({
      success: true,
      draft: updatedDraft
    })
  } catch (error: any) {
    console.error('Finalize error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
