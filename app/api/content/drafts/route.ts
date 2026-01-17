import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { painPointId, contentType, content, tone, goal, additionalNotes } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get pain point with agent access check
    const { data: painPoint } = await supabase
      .from('audience_insights')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', painPointId)
      .single()
    
    if (!painPoint || painPoint.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Pain point not found' }, { status: 404 })
    }
    
    // Save draft to database
    const { data: draft, error } = await supabase
      .from('content_drafts')
      .insert({
        agent_id: painPoint.agent_id,
        pain_point_id: painPointId,
        content_type: contentType,
        hook: content?.hook,
        body: content?.body,
        cta: content?.cta,
        hashtags: content?.hashtags,
        visual_suggestions: content?.visual_suggestions,
        tone: tone || 'empathetic',
        goal: goal || 'engagement',
        status: 'draft'
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ success: true, draft })
  } catch (error: any) {
    console.error('Draft creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, painPointId, contentType, content, tone, goal, additionalNotes } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify ownership through draft -> agent -> space
    const { data: existingDraft } = await supabase
      .from('content_drafts')
      .select('*, agents!inner(spaces!inner(user_id))')
      .eq('id', id)
      .single()
    
    if (!existingDraft || existingDraft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    
    // Update draft
    const { data: draft, error } = await supabase
      .from('content_drafts')
      .update({
        hook: content?.hook,
        body: content?.body,
        cta: content?.cta,
        hashtags: content?.hashtags,
        visual_suggestions: content?.visual_suggestions,
        tone: tone,
        goal: goal,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ success: true, draft })
  } catch (error: any) {
    console.error('Draft update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
