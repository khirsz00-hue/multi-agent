import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get content drafts for calendar
    const query = supabase
      .from('content_drafts')
      .select('*, audience_insights(pain_point, category)')
      .order('scheduled_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    
    if (agentId) {
      query.eq('agent_id', agentId)
    }
    
    const { data: drafts } = await query
    
    // Group by status
    const calendar = {
      drafts: drafts?.filter(d => d.status === 'draft') || [],
      ready: drafts?.filter(d => d.status === 'ready') || [],
      scheduled: drafts?.filter(d => d.status === 'scheduled') || [],
      posted: drafts?.filter(d => d.status === 'posted') || []
    }
    
    return NextResponse.json({ calendar })
  } catch (error: any) {
    console.error('Calendar error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { draftId, updates } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify user owns this draft through agent/space relationship
    const { data: draft } = await supabase
      .from('content_drafts')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', draftId)
      .single()
    
    if (!draft || draft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found or unauthorized' }, { status: 404 })
    }
    
    const { data, error } = await supabase
      .from('content_drafts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', draftId)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ success: true, draft: data })
  } catch (error: any) {
    console.error('Update draft error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
