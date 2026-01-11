import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { agentId, action, data } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: agent } = await supabase
      .from('agents')
      .select('*, spaces(user_id)')
      .eq('id', agentId)
      .eq('role', 'content_executor')
      .single()
    
    if (!agent || agent.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    switch (action) {
      case 'get_today':
        return await getTodaysContent(agentId, supabase, user)
      case 'get_upcoming':
        return await getUpcomingContent(agentId, data, supabase)
      case 'mark_published':
        return await markPublished(agentId, data, supabase)
      case 'get_stats':
        return await getStats(agentId, supabase)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Content executor error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function getTodaysContent(agentId: string, supabase: any, user: any) {
  const today = new Date().toISOString().split('T')[0]
  
  const { data: todaysContent } = await supabase
    .from('content_calendar')
    .select('*, audience_insights(*)')
    .eq('publish_date', today)
    .in('status', ['draft', 'approved'])
    .order('narrative_position', { ascending: true })
    .limit(1)
  
  // Get KPI progress
  const { data: kpis } = await supabase
    .from('kpis')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
  
  let kpiProgress = null
  if (kpis && kpis.length > 0) {
    const kpi = kpis[0]
    const percentage = Math.round((kpi.current_value / kpi.target_value) * 100)
    const daysLeft = Math.ceil(
      (new Date(kpi.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    
    kpiProgress = {
      name: kpi.name,
      current: kpi.current_value,
      target: kpi.target_value,
      unit: kpi.unit,
      percentage: percentage,
      daysLeft: daysLeft
    }
  }
  
  return NextResponse.json({
    today: todaysContent && todaysContent.length > 0 ? todaysContent[0] : null,
    kpi_progress: kpiProgress,
    user_email: user.email
  })
}

async function getUpcomingContent(agentId: string, data: any, supabase: any) {
  const days = data?.days || 7
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + days)
  
  const { data: upcoming } = await supabase
    .from('content_calendar')
    .select('*, audience_insights(*)')
    .gte('publish_date', today.toISOString().split('T')[0])
    .lte('publish_date', endDate.toISOString().split('T')[0])
    .in('status', ['draft', 'approved'])
    .order('publish_date', { ascending: true })
  
  return NextResponse.json({ upcoming: upcoming || [] })
}

async function markPublished(agentId: string, data: any, supabase: any) {
  const { contentId, performance } = data
  
  if (!contentId) {
    return NextResponse.json({ error: 'contentId required' }, { status: 400 })
  }
  
  const { error } = await supabase
    .from('content_calendar')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      metadata: {
        published_via: 'content_executor',
        performance: performance || {}
      }
    })
    .eq('id', contentId)
  
  if (error) throw error
  
  return NextResponse.json({ success: true })
}

async function getStats(agentId: string, supabase: any) {
  // Get this month's stats
  const thisMonth = new Date().toISOString().slice(0, 7)
  
  const { data: monthContent } = await supabase
    .from('content_calendar')
    .select('status')
    .eq('month_group', thisMonth)
  
  const total = monthContent?.length || 0
  const published = monthContent?.filter((c: any) => c.status === 'published').length || 0
  const draft = monthContent?.filter((c: any) => c.status === 'draft').length || 0
  
  // Get streak (consecutive days published)
  const { data: recentPublished } = await supabase
    .from('content_calendar')
    .select('publish_date')
    .eq('status', 'published')
    .order('publish_date', { ascending: false })
    .limit(30)
  
  let streak = 0
  if (recentPublished && recentPublished.length > 0) {
    const today = new Date()
    for (let i = 0; i < recentPublished.length; i++) {
      const publishDate = new Date(recentPublished[i].publish_date)
      const daysDiff = Math.floor((today.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff === i) {
        streak++
      } else {
        break
      }
    }
  }
  
  return NextResponse.json({
    stats: {
      month: thisMonth,
      total: total,
      published: published,
      draft: draft,
      completion_rate: total > 0 ? Math.round((published / total) * 100) : 0,
      streak: streak
    }
  })
}
