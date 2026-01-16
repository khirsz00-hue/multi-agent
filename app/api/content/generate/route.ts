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
    
    // Get pain point with agent access check
    const { data: painPoint } = await supabase
      .from('audience_insights')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', painPointId)
      .single()
    
    if (!painPoint || painPoint.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Pain point not found' }, { status: 404 })
    }
    
    // Get brand settings (optional)
    const { data: brandSettings } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('space_id', painPoint.agents.space_id)
      .single()
    
    // Generate content with OpenAI
    const content = await generateContent({
      painPoint,
      contentType,
      options,
      brandSettings
    })
    
    // Save draft to database
    const { data: draft, error } = await supabase
      .from('content_drafts')
      .insert({
        agent_id: painPoint.agent_id,
        pain_point_id: painPointId,
        content_type: contentType,
        ...content,
        tone: options.tone,
        goal: options.goal,
        target_platform: options.platform || getDefaultPlatform(contentType)
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ success: true, draft })
  } catch (error: any) {
    console.error('Content generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateContent({ painPoint, contentType, options, brandSettings }: any) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const systemPrompt = buildSystemPrompt(contentType, brandSettings)
  const userPrompt = buildUserPrompt(painPoint, options)
  
  try {
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
    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content generated from OpenAI')
    }
    
    const parsed = JSON.parse(content)
    
    // Validate required fields exist
    if (!parsed.hook && !parsed.body) {
      throw new Error('Generated content missing required fields')
    }
    
    return parsed
  } catch (error: any) {
    console.error('OpenAI generation error:', error)
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('Rate limit exceeded. Please try again later.')
    } else if (error instanceof SyntaxError) {
      throw new Error('Invalid response format from AI')
    }
    throw error
  }
}

function buildSystemPrompt(contentType: string, brandSettings: any): string {
  const basePrompt = `You are an expert social media content creator specializing in creating engaging content about ADHD and neurodiversity.

Brand Voice: ${brandSettings?.brand_voice || 'empathetic, humorous, relatable'}
Target Audience: ${brandSettings?.target_audience || 'People with ADHD, 25-40 years old'}
Guidelines: ${brandSettings?.content_guidelines || 'Focus on lived experience, be authentic'}
`

  const formatPrompts: Record<string, string> = {
    reel: `Create an Instagram Reel/TikTok script (15-60 seconds).

Return JSON:
{
  "hook": "Attention-grabbing first 3 seconds",
  "body": "Main content with clear structure",
  "cta": "Call to action that drives engagement",
  "hashtags": ["relevant", "hashtags"],
  "visual_suggestions": {
    "format": "talking head / b-roll / text overlay",
    "music_vibe": "upbeat / emotional / trending",
    "key_moments": ["moment 1 at 0-3s", "moment 2 at 3-15s"]
  }
}`,

    meme: `Create a relatable meme concept.

Return JSON:
{
  "hook": "Meme format name (e.g., Drake meme)",
  "body": "Top text: [setup]\\n\\nBottom text: [punchline]",
  "cta": "Instagram caption to accompany meme",
  "hashtags": ["relevant", "hashtags"],
  "visual_suggestions": {
    "meme_format": "Drake / Distracted Boyfriend / Custom",
    "image_description": "Detailed description of what image should show"
  }
}`,

    deep_post: `Create a thoughtful, story-driven Instagram/Facebook post.

Return JSON:
{
  "hook": "Opening line that stops scroll",
  "body": "Personal narrative or relatable scenario (150-300 words)",
  "cta": "Question or prompt for comments",
  "hashtags": ["relevant", "hashtags"],
  "visual_suggestions": {
    "formatting": "Use of emojis, line breaks, emphasis"
  }
}`,

    engagement_post: `Create a post designed to maximize comments and engagement.

Return JSON:
{
  "hook": "Provocative question or statement",
  "body": "Brief context or options (keep short, 50-100 words)",
  "cta": "Clear instruction to comment",
  "hashtags": ["relevant", "hashtags"],
  "visual_suggestions": {
    "engagement_type": "Poll / This or That / Fill in the blank"
  }
}`,

    newsletter: `Create a newsletter section with depth and value.

Return JSON:
{
  "hook": "Section headline",
  "body": "Opening paragraph + detailed exploration (300-500 words) + actionable tips",
  "cta": "Closing with resources or next steps",
  "hashtags": []
}`,

    thread: `Create a Twitter/X thread.

Return JSON:
{
  "hook": "Hook tweet (280 chars max)",
  "body": "Tweet 2\\n\\nTweet 3\\n\\nTweet 4\\n\\nTweet 5",
  "cta": "Final tweet with CTA",
  "hashtags": ["relevant", "hashtags"]
}`,
  }

  return basePrompt + '\n\n' + (formatPrompts[contentType] || formatPrompts.deep_post)
}

function buildUserPrompt(painPoint: any, options: any): string {
  return `Create ${options.tone || 'empathetic'} content with a ${options.goal || 'engagement'} goal.

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
Frequency: ${painPoint.frequency}
Example Quote: "${painPoint.raw_content || 'N/A'}"

${options.additionalNotes ? `Additional Instructions: ${options.additionalNotes}` : ''}

Generate engaging, scroll-stopping content that resonates with the target audience.`
}

function getDefaultPlatform(contentType: string): string {
  const platformMap: Record<string, string> = {
    reel: 'instagram',
    meme: 'instagram',
    deep_post: 'instagram',
    engagement_post: 'facebook',
    newsletter: 'email',
    thread: 'twitter'
  }
  return platformMap[contentType] || 'instagram'
}
