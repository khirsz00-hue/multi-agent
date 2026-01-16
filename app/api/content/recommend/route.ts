import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { painPointId } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get the pain point
    const { data: painPoint, error: ppError } = await supabase
      .from('audience_insights')
      .select('*')
      .eq('id', painPointId)
      .single()
    
    if (ppError || !painPoint) {
      return NextResponse.json({ error: 'Pain point not found' }, { status: 404 })
    }
    
    // Get the agent associated with this pain point
    const { data: agent } = await supabase
      .from('agents')
      .select('*, spaces(user_id)')
      .eq('id', painPoint.agent_id)
      .single()
    
    if (!agent || agent.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Generate AI recommendations for best content formats
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const prompt = `Analyze this pain point and recommend the best content formats:

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}
Frequency: ${painPoint.frequency}

Recommend the top 6 content formats from: reel, meme, deep_post, engagement_post, newsletter, thread

For each recommendation, provide:
- format: the format type
- score: match score 0-100
- reasoning: why this format works well (1-2 sentences)
- hook_suggestion: a suggested opening hook (optional)

Return JSON array sorted by score (highest first):
[
  {
    "format": "engagement_post",
    "score": 95,
    "reasoning": "...",
    "hook_suggestion": "..."
  },
  ...
]`
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'You are an expert at matching pain points with optimal content formats for maximum engagement and impact.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })
    
    const result = JSON.parse(completion.choices[0].message.content || '{"recommendations": []}')
    const recommendations = result.recommendations || []
    
    return NextResponse.json({
      success: true,
      recommendations
    })
  } catch (error: any) {
    console.error('Content recommendation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get recommendations' }, { status: 500 })
  }
}
