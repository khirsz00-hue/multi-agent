import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      .eq('role', 'strategic_planner')
      .single()
    
    if (!agent || agent.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    switch (action) {
      case 'define_kpis':
        return await defineKPIs(agentId, data, supabase)
      case 'check_progress':
        return await checkProgress(agentId, supabase)
      case 'update_metric':
        return await updateMetric(agentId, data, supabase)
      case 'get_kpis':
        return await getKPIs(agentId, supabase)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Strategic planner error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function defineKPIs(agentId: string, data: any, supabase: any) {
  const { goal, targetValue, deadline, unit, description, milestones } = data
  
  const { data: kpi, error } = await supabase
    .from('kpis')
    .insert({
      agent_id: agentId,
      name: goal,
      description,
      target_value: targetValue,
      unit: unit || 'units',
      deadline,
      status: 'active'
    })
    .select()
    .single()
  
  if (error) throw error
  
  if (milestones?.length > 0) {
    await supabase.from('milestones').insert(
      milestones.map((m: any) => ({
        kpi_id: kpi.id,
        name: m.name,
        target_value: m.targetValue,
        deadline: m.deadline
      }))
    )
  }
  
  await supabase.from('agent_outputs').insert({
    agent_id: agentId,
    output_type: 'kpis',
    data: { kpi_id: kpi.id, goal, target: targetValue, unit, deadline }
  })
  
  return NextResponse.json({ success: true, kpi })
}

async function checkProgress(agentId: string, supabase: any) {
  const { data: kpis } = await supabase
    .from('kpis')
    .select('*, milestones(*)')
    .eq('agent_id', agentId)
    .eq('status', 'active')
  
  if (!kpis?.length) {
    return NextResponse.json({ progress: [] })
  }
  
  const progress = kpis.map((kpi: any) => {
    const percentage = Math.round((kpi.current_value / kpi.target_value) * 100)
    const daysLeft = Math.ceil((new Date(kpi.deadline).getTime() - Date.now()) / 86400000)
    const daysSinceStart = Math.ceil((Date.now() - new Date(kpi.created_at).getTime()) / 86400000)
    const totalDays = daysSinceStart + daysLeft
    const expectedProgress = Math.round((daysSinceStart / totalDays) * 100)
    
    let status = 'on_track'
    if (percentage >= expectedProgress * 1.1) status = 'ahead'
    else if (percentage < expectedProgress * 0.8) status = 'behind'
    
    return {
      kpi_id: kpi.id,
      name: kpi.name,
      current: kpi.current_value,
      target: kpi.target_value,
      unit: kpi.unit,
      percentage,
      expected_percentage: expectedProgress,
      daysLeft,
      status
    }
  })
  
  await supabase.from('agent_outputs').insert({
    agent_id: agentId,
    output_type: 'progress_check',
    data: { progress, checked_at: new Date().toISOString() }
  })
  
  return NextResponse.json({ success: true, progress })
}

async function updateMetric(agentId: string, data: any, supabase: any) {
  const { kpiId, newValue } = data
  
  const { data: kpi, error } = await supabase
    .from('kpis')
    .update({ current_value: newValue })
    .eq('id', kpiId)
    .eq('agent_id', agentId)
    .select()
    .single()
  
  if (error) throw error
  
  if (kpi.current_value >= kpi.target_value) {
    await supabase.from('kpis').update({ status: 'achieved' }).eq('id', kpiId)
  }
  
  return NextResponse.json({ success: true, kpi })
}

async function getKPIs(agentId: string, supabase: any) {
  const { data: kpis } = await supabase
    .from('kpis')
    .select('*, milestones(*)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
  
  return NextResponse.json({ success: true, kpis: kpis || [] })
}
