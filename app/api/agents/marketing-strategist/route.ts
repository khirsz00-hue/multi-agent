import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

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
      .eq('role', 'marketing_strategist')
      .single()
    
    if (!agent || agent.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    switch (action) {
      case 'generate_monthly_content':
        return await generateMonthlyContent(agentId, data, supabase)
      case 'regenerate_post':
        return await regeneratePost(agentId, data, supabase)
      case 'update_post':
        return await updatePost(agentId, data, supabase)
      case 'get_month_content':
        return await getMonthContent(agentId, data, supabase)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Marketing strategist error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateMonthlyContent(agentId: string, data: any, supabase: any) {
  const { month, postsPerWeek = 3, contentTypes = ['linkedin_post'] } = data
  
  // Get KPIs from Strategic Planner (if connected)
  const { data: agent } = await supabase
    .from('agents')
    .select('reads_from')
    .eq('id', agentId)
    .single()
  
  let kpiContext = null
  if (agent?.reads_from?.length > 0) {
    const { data: kpiOutputs } = await supabase
      .from('agent_outputs')
      .select('*')
      .in('agent_id', agent.reads_from)
      .eq('output_type', 'kpis')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (kpiOutputs?.length > 0) {
      kpiContext = kpiOutputs[0].data
    }
  }
  
  // Get pain points from Audience Insights
  const { data: painPoints } = await supabase
    .from('audience_insights')
    .select('*')
    .eq('agent_id', agentId)
    .order('frequency', { ascending: false })
    .limit(15)
  
  if (!painPoints || painPoints.length === 0) {
    return NextResponse.json({
      error: 'No pain points found. Run Audience Insights analysis first.'
    }, { status: 400 })
  }
  
  // Generate content with AI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const totalPosts = postsPerWeek * 4 // 4 weeks
  const posts = []
  
  const startDate = new Date(`${month}-01`)
  
  for (let i = 0; i < totalPosts; i++) {
    const week = Math.floor(i / postsPerWeek) + 1
    const painPoint = painPoints[i % painPoints.length]
    
    const publishDate = new Date(startDate)
    publishDate.setDate(publishDate.getDate() + (i * 2)) // Every 2-3 days
    
    const prompt = `Stwórz post na LinkedIn (max 250 słów) który:

- Adresuje ten konkretny pain point: "${painPoint.pain_point}"
- Kategoria: ${painPoint.category}
- Sentiment odbiorcy: ${painPoint.sentiment}
- Ton: profesjonalny, empatyczny, actionable
- Struktura: Hook → Problem → Solution → CTA
${kpiContext ? `- Cel biznesowy: ${kpiContext.goal}` : ''}

Zwróć JSON:
{
  "title": "krótki tytuł (5-7 słów)",
  "content": "pełna treść posta z emoji",
  "hook": "pierwsze zdanie (must grab attention)",
  "cta": "call to action"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'Jesteś ekspertem content marketingu.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
    
    const generated = JSON.parse(completion.choices[0].message.content || '{}')
    
    posts.push({
      agent_id: agentId,
      publish_date: publishDate.toISOString().split('T')[0],
      content_type: contentTypes[0],
      title: generated.title,
      content: generated.content,
      pain_point_id: painPoint.id,
      month_group: month,
      week_in_month: week,
      status: 'draft', // User must approve
      narrative_position: i + 1,
      narrative_phase: week <= 1 ? 'awareness' : week <= 2 ? 'education' : week <= 3 ? 'trust' : 'conversion',
      metadata: {
        version: 1,
        regenerated: false,
        edited: false,
        original_content: generated.content,
        hook: generated.hook,
        cta: generated.cta
      }
    })
    
    // Rate limiting
    if (i % 3 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  // Batch insert
  const { error } = await supabase
    .from('content_calendar')
    .insert(posts)
  
  if (error) throw error
  
  // Save output
  await supabase.from('agent_outputs').insert({
    agent_id: agentId,
    output_type: 'content_calendar',
    data: {
      month: month,
      posts_generated: posts.length,
      status: 'draft'
    }
  })
  
  return NextResponse.json({
    success: true,
    generated: posts.length,
    month: month
  })
}

async function regeneratePost(agentId: string, data: any, supabase: any) {
  const { postId, reason } = data
  
  // Get original post
  const { data: post } = await supabase
    .from('content_calendar')
    .select('*, audience_insights(*)')
    .eq('id', postId)
    .eq('agent_id', agentId)
    .single()
  
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }
  
  // Regenerate with AI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const prompt = `Przepisz ten post LinkedIn zachowując pain point ale dostosowując do uwag:

Original post:
${post.content}

Pain point: ${post.audience_insights?.pain_point}
User feedback: ${reason || 'Make it better'}

Zwróć JSON z nową wersją:
{
  "title": "...",
  "content": "...",
  "improvements": "co zmieniłeś"
}`
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: 'Jesteś ekspertem content marketingu.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  })
  
  const regenerated = JSON.parse(completion.choices[0].message.content || '{}')
  
  // Update post
  const { error } = await supabase
    .from('content_calendar')
    .update({
      title: regenerated.title,
      content: regenerated.content,
      metadata: {
        ...post.metadata,
        version: (post.metadata.version || 1) + 1,
        regenerated: true,
        regeneration_reason: reason
      }
    })
    .eq('id', postId)
  
  if (error) throw error
  
  return NextResponse.json({
    success: true,
    post: regenerated
  })
}

async function updatePost(agentId: string, data: any, supabase: any) {
  const { postId, updates } = data
  
  // Get existing post to merge metadata
  const { data: existingPost } = await supabase
    .from('content_calendar')
    .select('metadata')
    .eq('id', postId)
    .eq('agent_id', agentId)
    .single()
  
  const { error } = await supabase
    .from('content_calendar')
    .update({
      ...updates,
      metadata: {
        ...(existingPost?.metadata || {}),
        edited: true,
        edited_at: new Date().toISOString()
      }
    })
    .eq('id', postId)
    .eq('agent_id', agentId)
  
  if (error) throw error
  
  return NextResponse.json({ success: true })
}

async function getMonthContent(agentId: string, data: any, supabase: any) {
  const { month } = data
  
  const { data: posts } = await supabase
    .from('content_calendar')
    .select('*, audience_insights(*)')
    .eq('agent_id', agentId)
    .eq('month_group', month)
    .order('publish_date', { ascending: true })
  
  return NextResponse.json({ posts: posts || [] })
}
