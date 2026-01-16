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
    
    // Fetch the pain point
    const { data: painPoint, error: ppError } = await supabase
      .from('audience_insights')
      .select('*, agents(spaces(user_id))')
      .eq('id', painPointId)
      .single()
    
    if (ppError || !painPoint || painPoint.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Pain point not found' }, { status: 404 })
    }
    
    // Generate recommendations using OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a social media strategist. Analyze pain points and recommend the best content formats.

Return JSON with this structure:
{
  "recommendations": [
    {
      "format": "reel|meme|deep_post|engagement_post|newsletter|thread",
      "score": 85,
      "reasoning": "why this format works well",
      "hook_suggestion": "suggested opening line"
    }
  ]
}

Rank by match score (0-100). Return top 3 formats.`
        },
        {
          role: 'user',
          content: `Recommend content formats for this pain point:

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}
Frequency: ${painPoint.frequency}x mentioned
${painPoint.raw_content ? `Original quote: "${painPoint.raw_content}"` : ''}`
        }
      ],
      response_format: { type: 'json_object' }
    })
    
    const result = JSON.parse(completion.choices[0].message.content || '{"recommendations":[]}')
    
    return NextResponse.json({ 
      success: true, 
      recommendations: result.recommendations || []
    })
  } catch (error: any) {
    console.error('Content recommendation error:', error)
    return NextResponse.json({ error: error.message || 'Recommendation failed' }, { status: 500 })
  }
}
