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
    
    // Get pain point
    const { data: painPoint } = await supabase
      .from('audience_insights')
      .select('*')
      .eq('id', painPointId)
      .single()
    
    if (!painPoint) {
      return NextResponse.json({ error: 'Pain point not found' }, { status: 404 })
    }
    
    // AI recommendation
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a social media strategist. Analyze pain points and recommend the best content format.

Available formats:
- reel: Short video (15-60s), best for visual/relatable content
- meme: Humorous image, best for frustrated/relatable sentiments
- deep_post: Long-form post, best for storytelling/education
- engagement_post: Question-based, best for debate/opinions
- newsletter: In-depth exploration, best for complex topics
- thread: Twitter thread, best for step-by-step or listicles

Return JSON:
{
  "recommendations": [
    {
      "format": "reel",
      "score": 85,
      "reasoning": "Why this format fits",
      "hook_suggestion": "Example hook"
    }
  ]
}

Rank top 3 formats by match score (0-100).`
        },
        {
          role: 'user',
          content: `Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}
Frequency: ${painPoint.frequency}

What are the best content formats for this?`
        }
      ],
      response_format: { type: 'json_object' }
    })
    
    const analysis = JSON.parse(completion.choices[0].message.content || '{"recommendations":[]}')
    
    return NextResponse.json({ recommendations: analysis.recommendations })
  } catch (error: any) {
    console.error('Recommendation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
