import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { agentId, contentType, options } = await request.json()
    
    if (!['engagement_post', 'thread'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type. Must be engagement_post or thread' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify agent access
    const { data: agent } = await supabase
      .from('agents')
      .select('*, spaces!inner(user_id)')
      .eq('id', agentId)
      .single()
    
    if (!agent || agent.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    // Generate content with OpenAI
    const content = await generateQuickContent({
      contentType,
      options
    })
    
    // Save draft to database
    const { data: draft, error } = await supabase
      .from('content_drafts')
      .insert({
        agent_id: agentId,
        content_type: contentType,
        tone: options?.tone || 'empathetic',
        goal: options?.goal || 'engagement',
        draft: content,
        status: 'draft'
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ success: true, draft })
  } catch (error: any) {
    console.error('Quick content generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateQuickContent({ contentType, options }: any) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const systemPrompt = buildSystemPrompt(contentType)
  const userPrompt = buildUserPrompt(contentType, options)
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })
    
    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content generated from OpenAI')
    }
    
    const parsed = JSON.parse(content)
    
    // Validate required fields
    if (contentType === 'engagement_post' && (!parsed.hook || !parsed.body)) {
      throw new Error('Generated content missing required fields')
    }
    if (contentType === 'thread' && !parsed.tweets) {
      throw new Error('Generated thread missing tweets')
    }
    
    return parsed
  } catch (error: any) {
    console.error('OpenAI generation error:', error)
    throw error
  }
}

function buildSystemPrompt(contentType: string): string {
  if (contentType === 'engagement_post') {
    return `You are an expert social media content creator specializing in engagement posts.

Create a post designed to maximize comments and engagement.

Return JSON:
{
  "hook": "Provocative question or statement (max 100 chars)",
  "body": "Brief context or options (50-150 words)",
  "cta": "Clear instruction to comment (max 100 chars)",
  "hashtags": ["relevant", "hashtags"],
  "format_suggestion": "Poll | This or That | Fill in the blank | Question",
  "engagement_tips": ["tip1", "tip2"]
}`
  } else {
    return `You are an expert at creating Twitter/X threads.

Create an engaging thread with clear structure.

Return JSON:
{
  "tweets": [
    "Hook tweet (280 chars max)",
    "Tweet 2 (280 chars max)",
    "Tweet 3 (280 chars max)",
    "Final tweet with CTA (280 chars max)"
  ],
  "hashtags": ["relevant", "hashtags"],
  "thread_tips": ["tip1", "tip2"]
}`
  }
}

function buildUserPrompt(contentType: string, options: any): string {
  const topic = options?.topic || 'productivity and focus'
  const tone = options?.tone || 'empathetic'
  const goal = options?.goal || 'engagement'
  
  if (contentType === 'engagement_post') {
    return `Create an ${tone} engagement post about ${topic} with a ${goal} goal.

${options?.additionalNotes ? `Additional Instructions: ${options.additionalNotes}` : ''}

Generate engaging, scroll-stopping content that encourages people to comment and share their experience.`
  } else {
    return `Create a ${tone} Twitter thread about ${topic} with a ${goal} goal.

${options?.additionalNotes ? `Additional Instructions: ${options.additionalNotes}` : ''}

Structure: Hook → Value/Story → Actionable Insights → CTA
Keep each tweet under 280 characters.`
  }
}
