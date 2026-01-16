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
    
    // Get pain point with access check
    const { data: painPoint } = await supabase
      .from('audience_insights')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', painPointId)
      .single()
    
    if (!painPoint || painPoint.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Pain point not found or unauthorized' }, { status: 404 })
    }
    
    // AI recommendation
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    try {
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
      
      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('No recommendations generated from OpenAI')
      }
      
      const analysis = JSON.parse(content)
      
      // Validate response structure
      if (!analysis.recommendations || !Array.isArray(analysis.recommendations)) {
        throw new Error('Invalid recommendations format')
      }
      
      return NextResponse.json({ recommendations: analysis.recommendations })
    } catch (error: any) {
      console.error('OpenAI recommendation error:', error)
      if (error.code === 'rate_limit_exceeded') {
        return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 })
      } else if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 })
      }
      throw error
    }
  } catch (error: any) {
    console.error('Recommendation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
