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
      .eq('role', 'audience_insights')
      .single()
    
    if (!agent || agent.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    switch (action) {
      case 'analyze_notion_posts':
        return await analyzeNotionPosts(agentId, data, supabase)
      case 'get_top_pain_points':
        return await getTopPainPoints(agentId, supabase)
      case 'get_by_category':
        return await getByCategory(agentId, data, supabase)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Audience insights error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function analyzeNotionPosts(agentId: string, data: any, supabase: any) {
  const notionApiKey = process.env.NOTION_API_KEY
  const notionDbId = data?.notionDatabaseId || process.env.NOTION_DATABASE_ID
  
  if (!notionApiKey) {
    throw new Error('Notion API key not configured')
  }
  
  // Fetch from Notion
  const { Client } = require('@notionhq/client')
  const notion = new Client({ auth: notionApiKey })
  
  const response = await notion.databases.query({
    database_id: notionDbId
  })
  
  // Extract content
  const posts = []
  for (const page of response.results) {
    const props = page.properties
    const content = props['Treść']?.rich_text?.[0]?.text?.content || ''
    const comments = props['Komentarze']?.rich_text?.[0]?.text?.content || ''
    
    if (content) {
      posts.push({
        id: page.id,
        content: content,
        comments: comments,
        combined: `${content}\n\n${comments}`
      })
    }
  }
  
  if (posts.length === 0) {
    return NextResponse.json({ error: 'No posts found in Notion database' }, { status: 400 })
  }
  
  // AI analysis with OpenAI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const allContent = posts.map(p => p.combined).join('\n\n---\n\n')
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: `Jesteś ekspertem od analizy social media. Przeanalizuj posty i wyciągnij konkretne pain pointy (bolączki, problemy) które ludzie mają.

Zwróć JSON array w formacie:
{
  "pain_points": [
    {
      "pain_point": "krótki opis problemu",
      "category": "focus/time_management/organization/motivation/overwhelm/other",
      "sentiment": "frustrated/confused/seeking_help/desperate",
      "frequency": liczba (ile razy wspomniane),
      "example_quote": "cytat z posta"
    }
  ]
}

Zidentyfikuj 10-15 najważniejszych pain pointów.`
      },
      {
        role: 'user',
        content: allContent
      }
    ],
    response_format: { type: 'json_object' }
  })
  
  const analysis = JSON.parse(completion.choices[0].message.content || '{"pain_points":[]}')
  const painPoints = analysis.pain_points || []
  
  // Save to database
  const insightsToInsert = painPoints.map((pp: any) => ({
    agent_id: agentId,
    source: 'notion',
    source_id: notionDbId,
    pain_point: pp.pain_point,
    category: pp.category,
    frequency: pp.frequency || 1,
    sentiment: pp.sentiment,
    raw_content: pp.example_quote,
    metadata: { analyzed_posts: posts.length }
  }))
  
  const { error } = await supabase
    .from('audience_insights')
    .insert(insightsToInsert)
  
  if (error) throw error
  
  // Save as agent output
  await supabase.from('agent_outputs').insert({
    agent_id: agentId,
    output_type: 'pain_points',
    data: {
      total_posts_analyzed: posts.length,
      pain_points_found: painPoints.length,
      top_categories: getTopCategories(painPoints)
    }
  })
  
  return NextResponse.json({
    success: true,
    pain_points: painPoints,
    posts_analyzed: posts.length,
    message: `Analyzed ${posts.length} posts and found ${painPoints.length} pain points`
  })
}

async function getTopPainPoints(agentId: string, supabase: any) {
  const { data: insights } = await supabase
    .from('audience_insights')
    .select('*')
    .eq('agent_id', agentId)
    .order('frequency', { ascending: false })
    .limit(10)
  
  return NextResponse.json({ pain_points: insights || [] })
}

async function getByCategory(agentId: string, data: any, supabase: any) {
  const { category } = data
  
  const { data: insights } = await supabase
    .from('audience_insights')
    .select('*')
    .eq('agent_id', agentId)
    .eq('category', category)
    .order('frequency', { ascending: false })
  
  return NextResponse.json({ pain_points: insights || [] })
}

function getTopCategories(painPoints: any[]) {
  const categories: any = {}
  painPoints.forEach(pp => {
    categories[pp.category] = (categories[pp.category] || 0) + (pp.frequency || 1)
  })
  return Object.entries(categories)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, freq]) => ({ category: cat, frequency: freq }))
}
