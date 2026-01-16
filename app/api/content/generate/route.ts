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
    
    // Fetch the pain point
    const { data: painPoint, error: ppError } = await supabase
      .from('audience_insights')
      .select('*, agents(spaces(user_id))')
      .eq('id', painPointId)
      .single()
    
    if (ppError || !painPoint || painPoint.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Pain point not found' }, { status: 404 })
    }
    
    // Generate content using OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const { tone = 'empathetic', goal = 'engagement', additionalNotes = '' } = options || {}
    
    const systemPrompt = buildSystemPrompt(contentType, tone, goal)
    const userPrompt = buildUserPrompt(painPoint, additionalNotes)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })
    
    const draft = JSON.parse(completion.choices[0].message.content || '{}')
    
    // Save the draft
    await supabase.from('content_drafts').insert({
      agent_id: painPoint.agent_id,
      pain_point_id: painPointId,
      content_type: contentType,
      tone,
      goal,
      draft,
      status: 'draft'
    })
    
    return NextResponse.json({ 
      success: true, 
      draft,
      painPoint: {
        id: painPoint.id,
        pain_point: painPoint.pain_point,
        category: painPoint.category
      }
    })
  } catch (error: any) {
    console.error('Content generation error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}

function buildSystemPrompt(contentType: string, tone: string, goal: string): string {
  const basePrompt = `You are a social media content creator specializing in creating engaging content from audience pain points.

Content Type: ${contentType}
Tone: ${tone}
Goal: ${goal}

Generate content in JSON format with the following structure:
{
  "hook": "attention-grabbing opening (1-2 sentences)",
  "body": "main content (appropriate length for ${contentType})",
  "cta": "call to action",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "visual_suggestions": { "type": "image/video", "description": "what to show", "style": "visual style" }
}

Content guidelines based on type:
- reel: Short, punchy, visual-first. Hook in first 3 seconds. Body 50-100 words.
- meme: Humorous, relatable. Simple text + visual description. Body 10-30 words.
- deep_post: Thoughtful, detailed. Hook + story + insights. Body 200-400 words.
- engagement_post: Question-focused, discussion-starter. Body 50-150 words.
- newsletter: Structured, valuable. Hook + sections + actionable tips. Body 300-500 words.
- thread: Multi-part story. Hook + numbered points. Body 150-300 words across 5-8 tweets.

Tone guidelines:
- humorous: Use memes, jokes, lighthearted language
- empathetic: Understanding, supportive, validating feelings
- controversial: Debate-starting, bold statements, challenge status quo
- educational: Informative, actionable, teach something valuable`

  return basePrompt
}

function buildUserPrompt(painPoint: any, additionalNotes: string): string {
  let prompt = `Create social media content addressing this pain point:

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}
Frequency: ${painPoint.frequency}x mentioned`

  if (painPoint.raw_content) {
    prompt += `\nOriginal quote: "${painPoint.raw_content}"`
  }
  
  if (additionalNotes) {
    prompt += `\n\nAdditional instructions: ${additionalNotes}`
  }
  
  return prompt
}
