import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { painPointId, contentType, options } = await request.json()
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
    
    // Generate content using OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const { tone = 'empathetic', goal = 'engagement', additionalNotes = '' } = options || {}
    
    const contentTypeLabels: Record<string, string> = {
      reel: 'Instagram Reel / TikTok script',
      meme: 'Meme caption and concept',
      deep_post: 'Deep, thought-provoking LinkedIn post',
      engagement_post: 'Engagement-focused social media post',
      newsletter: 'Newsletter section',
      thread: 'Twitter/X thread'
    }
    
    const prompt = `Create ${contentTypeLabels[contentType] || contentType} that addresses this pain point:

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}

Content Settings:
- Tone: ${tone}
- Goal: ${goal}
${additionalNotes ? `- Additional Instructions: ${additionalNotes}` : ''}

Generate engaging content optimized for ${contentType}. Return JSON with:
{
  "hook": "attention-grabbing opening (1-2 sentences)",
  "body": "main content (adapt length to format)",
  "cta": "call to action",
  "hashtags": ["array", "of", "relevant", "hashtags"],
  "visual_suggestions": {
    "type": "type of visual",
    "description": "what to show",
    "colors": ["color palette"],
    "text_overlay": "suggested text overlay if applicable"
  }
}

Keep the content authentic, relatable, and actionable.`
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'You are an expert content creator specializing in social media and marketing content that resonates with audiences.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8
    })
    
    const draft = JSON.parse(completion.choices[0].message.content || '{}')
    
    // Save the generated content to database
    await supabase.from('agent_outputs').insert({
      agent_id: agent.id,
      output_type: 'content_draft',
      data: {
        pain_point_id: painPointId,
        content_type: contentType,
        draft,
        options: { tone, goal, additionalNotes },
        created_at: new Date().toISOString()
      }
    })
    
    return NextResponse.json({
      success: true,
      draft
    })
  } catch (error: any) {
    console.error('Content generation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 })
  }
}
