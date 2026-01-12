import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { spaceId } = await request.json()
    
    if (!spaceId) {
      return NextResponse.json({ error: 'spaceId required' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check space ownership
    const { data: space } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', spaceId)
      .eq('user_id', user.id)
      .single()

    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 })
    }

    const agents = []

    // 1. Strategic Planner
    const { data: strategicPlanner } = await supabase
      .from('agents')
      .insert({
        space_id: spaceId,
        name: 'Strategic Planner',
        type: 'strategic_planner',
        role: 'strategic_planner',
        description: 'Tracks business KPIs and goal progress',
        llm_provider: 'openai',
        llm_model: 'gpt-4',
        llm_temperature: 0.7,
        llm_max_tokens: 2000,
        system_instructions: 'You are a strategic business advisor. Help define and track KPIs.'
      })
      .select()
      .single()

    agents.push(strategicPlanner)

    // Create sample KPI
    await supabase.from('kpis').insert({
      agent_id: strategicPlanner.id,
      name: 'Reach 500 users',
      description: 'Grow user base to 500 active users',
      target_value: 500,
      current_value: 150,
      unit: 'users',
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active'
    })

    // 2. Audience Insights
    const { data: audienceInsights } = await supabase
      .from('agents')
      .insert({
        space_id: spaceId,
        name: 'Audience Insights',
        type: 'audience_insights',
        role: 'audience_insights',
        description: 'Analyzes audience pain points from social media',
        llm_provider: 'openai',
        llm_model: 'gpt-4',
        llm_temperature: 0.3,
        llm_max_tokens: 2000,
        system_instructions: 'Extract pain points and insights from user conversations.'
      })
      .select()
      .single()

    agents.push(audienceInsights)

    // Create sample pain points
    const samplePainPoints = [
      { pain_point: 'Nie mogę się skupić na pracy', category: 'focus', frequency: 23 },
      { pain_point: 'Prokrastynacja - odkładam ważne zadania', category: 'time_management', frequency: 18 },
      { pain_point: 'Brak organizacji w codziennych czynnościach', category: 'organization', frequency: 15 }
    ]

    for (const pp of samplePainPoints) {
      await supabase.from('audience_insights').insert({
        agent_id: audienceInsights.id,
        source: 'facebook',
        pain_point: pp.pain_point,
        category: pp.category,
        frequency: pp.frequency,
        sentiment: 'frustrated'
      })
    }

    // 3. Marketing Strategist
    const { data: marketingStrategist } = await supabase
      .from('agents')
      .insert({
        space_id: spaceId,
        name: 'Marketing Strategist',
        type: 'marketing_strategist',
        role: 'marketing_strategist',
        description: 'Creates content strategy based on insights and KPIs',
        llm_provider: 'openai',
        llm_model: 'gpt-4',
        llm_temperature: 0.8,
        llm_max_tokens: 3000,
        system_instructions: 'Create engaging content that addresses pain points and drives KPIs.',
        reads_from: [strategicPlanner.id, audienceInsights.id]
      })
      .select()
      .single()

    agents.push(marketingStrategist)

    // Create sample content for this week
    const today = new Date()
    const thisMonth = today.toISOString().slice(0, 7)
    
    for (let i = 0; i < 3; i++) {
      const publishDate = new Date(today)
      publishDate.setDate(today.getDate() + i * 2)
      
      await supabase.from('content_calendar').insert({
        agent_id: marketingStrategist.id,
        publish_date: publishDate.toISOString().split('T')[0],
        content_type: 'linkedin_post',
        title: `Post #${i + 1}: Focus Techniques`,
        content: `Nie możesz się skupić?\n\n5 technik które NAPRAWDĘ działają:\n\n1. Zmodyfikowane Pomodoro\n2. Body Doubling\n3. Interesujące vs Nudne\n4. Zewnętrzna odpowiedzialność\n5. Design środowiska\n\nKtórą wypróbujesz pierwszą? 💬`,
        month_group: thisMonth,
        week_in_month: Math.floor(i / 3) + 1,
        status: i === 0 ? 'approved' : 'draft',
        narrative_position: i + 1,
        narrative_phase: 'awareness'
      })
    }

    // 4. Content Executor
    const { data: contentExecutor } = await supabase
      .from('agents')
      .insert({
        space_id: spaceId,
        name: 'Content Executor',
        type: 'content_executor',
        role: 'content_executor',
        description: 'Delivers daily content and tracks performance',
        llm_provider: 'openai',
        llm_model: 'gpt-3.5-turbo',
        llm_temperature: 0.7,
        llm_max_tokens: 1500,
        system_instructions: 'Help execute content strategy with daily reminders.',
        reads_from: [marketingStrategist.id]
      })
      .select()
      .single()

    agents.push(contentExecutor)

    return NextResponse.json({
      success: true,
      message: 'All 4 agents created successfully',
      agents: agents.map(a => ({ id: a.id, name: a.name, role: a.role }))
    })

  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
