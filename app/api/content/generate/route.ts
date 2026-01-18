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
    
    const engine = options?.engine
    const isVideoEngine = ['remotion', 'creatomate', 'd-id', 'heygen'].includes(engine)
    
    // For video engines, create async job
    if (isVideoEngine && contentType === 'reel') {
      // Create video generation job
      const { data: job, error: jobError } = await supabase
        .from('video_jobs')
        .insert({
          user_id: user.id,
          pain_point_id: painPointId,
          content_type: contentType,
          engine: engine,
          status: 'pending',
          options: options,
          estimated_completion: new Date(Date.now() + 120000).toISOString() // 2 minutes estimate
        })
        .select()
        .single()
      
      if (jobError) throw jobError
      
      // Return job ID for polling
      return NextResponse.json({ success: true, jobId: job.id, async: true })
    }
    
    // For sync generation (images, text-only content)
    // Generate content with OpenAI
    const content = await generateContent({
      painPoint,
      contentType,
      options,
      brandSettings,
      engine
    })
    
    // Save draft to database
    const { data: draft, error } = await supabase
      .from('content_drafts')
      .insert({
        agent_id: painPoint.agent_id,
        pain_point_id: painPointId,
        content_type: contentType,
        ...content,
        tone: options?.tone || 'empathetic',
        goal: options?.goal || 'engagement',
        target_platform: options?.platform || getDefaultPlatform(contentType),
        generation_engine: engine
      })
      .select()
      .single()
    
    if (error) throw error
    
    // If image engine, generate image now
    if (engine === 'dall-e-3' && content.visual_suggestions?.image_description) {
      try {
        const imageUrl = await generateImage(content.visual_suggestions.image_description, user.id, supabase)
        // Update draft with image URL
        await supabase
          .from('content_drafts')
          .update({ image_url: imageUrl })
          .eq('id', draft.id)
        draft.image_url = imageUrl
      } catch (imageError) {
        console.error('Image generation failed:', imageError)
        // Continue without image - non-blocking
      }
    }
    
    return NextResponse.json({ success: true, draft })
  } catch (error: any) {
    console.error('Content generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateContent({ painPoint, contentType, options, brandSettings, engine }: any) {
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
  "body": "Top text: [setup]\n\nBottom text: [punchline]",
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
  "body": "Tweet 2\n\nTweet 3\n\nTweet 4\n\nTweet 5",
  "cta": "Final tweet with CTA",
  "hashtags": ["relevant", "hashtags"]
}`,
  }

  return basePrompt + '\n\n' + (formatPrompts[contentType] || formatPrompts.deep_post)
}

function buildUserPrompt(painPoint: any, options: any): string {
  return `Create ${options?.tone || 'empathetic'} content with a ${options?.goal || 'engagement'} goal.

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}
Frequency: ${painPoint.frequency}
Example Quote: "${painPoint.raw_content || 'N/A'}"

${options?.additionalNotes ? `Additional Instructions: ${options.additionalNotes}` : ''}

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

async function generateImage(description: string, userId: string, supabase: any): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    // Generate image with DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: description,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json'
    })
    
    const b64Image = response.data?.[0]?.b64_json
    if (!b64Image) throw new Error('No image generated')
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(b64Image, 'base64')
    
    // Upload to Supabase Storage
    const fileName = `${userId}/generated/${Date.now()}-${Math.random().toString(36).substring(7)}.png`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('content-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600'
      })
    
    if (uploadError) throw uploadError
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('content-images')
      .getPublicUrl(fileName)
    
    return publicUrl
  } catch (error) {
    console.error('Image generation error:', error)
    throw error
  }
}