import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * POST /api/content/generate-meme
 * 
 * Generate a meme with:
 * 1. OpenAI generates concept (hook, top_text, bottom_text, cta)
 * 2. Google AI Gemini generates image
 * 3. Save to Supabase Storage
 * 4. Store metadata in meme_images table
 */
export async function POST(request: Request) {
  try {
    const { painPointId, options } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate API keys
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }
    
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json({ error: 'Google AI API key not configured' }, { status: 500 })
    }
    
    // Get pain point with agent access check
    const { data: painPoint, error: painPointError } = await supabase
      .from('audience_insights')
      .select('*, agents!inner(id, space_id, spaces!inner(user_id))')
      .eq('id', painPointId)
      .single()
    
    if (painPointError || !painPoint || painPoint.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Pain point not found' }, { status: 404 })
    }
    
    const agentId = painPoint.agents.id
    const spaceId = painPoint.agents.space_id
    
    // Get brand settings (optional)
    const { data: brandSettings } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('space_id', spaceId)
      .single()
    
    // Step 1: Generate meme concept with OpenAI
    console.log('Generating meme concept with OpenAI...')
    const memeConcept = await generateMemeConcept({
      painPoint,
      options,
      brandSettings
    })
    
    // Step 2: Create content draft first
    const { data: contentDraft, error: draftError } = await supabase
      .from('content_drafts')
      .insert({
        agent_id: agentId,
        pain_point_id: painPointId,
        content_type: 'meme',
        hook: memeConcept.hook,
        body: `Top: ${memeConcept.top_text}\n\nBottom: ${memeConcept.bottom_text}`,
        cta: memeConcept.cta,
        hashtags: memeConcept.hashtags || [],
        tone: options?.tone || 'humorous',
        goal: options?.goal || 'viral',
        target_platform: 'instagram',
        visual_suggestions: {
          meme_format: memeConcept.meme_format,
          image_description: memeConcept.image_description
        },
        status: 'draft'
      })
      .select()
      .single()
    
    if (draftError) {
      console.error('Error creating content draft:', draftError)
      throw new Error('Failed to create content draft')
    }
    
    // Step 3: Generate image with Google AI
    console.log('Generating meme image with Google AI...')
    const imageData = await generateMemeImage({
      concept: memeConcept,
      options
    })
    
    // Step 4: Upload to Supabase Storage
    const timestamp = Date.now()
    const storagePath = `${agentId}/${contentDraft.id}/${timestamp}.png`
    
    console.log('Uploading image to Supabase Storage...')
    const { data: storageData, error: storageError } = await supabase.storage
      .from('meme-images')
      .upload(storagePath, Buffer.from(imageData, 'base64'), {
        contentType: 'image/png',
        cacheControl: '3600'
      })
    
    if (storageError) {
      console.error('Storage error:', storageError)
      throw new Error(`Failed to upload image: ${storageError.message}`)
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('meme-images')
      .getPublicUrl(storagePath)
    
    // Step 5: Store metadata in meme_images table
    const { data: memeImage, error: memeError } = await supabase
      .from('meme_images')
      .insert({
        content_draft_id: contentDraft.id,
        agent_id: agentId,
        original_prompt: memeConcept.image_description,
        meme_format: memeConcept.meme_format,
        top_text: memeConcept.top_text,
        bottom_text: memeConcept.bottom_text,
        image_url: publicUrl,
        storage_path: storagePath,
        version: 1,
        parent_version_id: null,
        refinement_prompt: null,
        raw_image_data: {
          generated_at: new Date().toISOString(),
          model: 'gemini-pro-vision',
          concept: memeConcept
        }
      })
      .select()
      .single()
    
    if (memeError) {
      console.error('Error saving meme image:', memeError)
      throw new Error('Failed to save meme image metadata')
    }
    
    return NextResponse.json({
      success: true,
      memeImage,
      contentDraft
    })
  } catch (error: any) {
    console.error('Meme generation error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate meme' 
    }, { status: 500 })
  }
}

/**
 * Generate meme concept using OpenAI
 */
async function generateMemeConcept({ painPoint, options, brandSettings }: any) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const systemPrompt = `You are an expert meme creator specializing in relatable, engaging memes about ADHD and neurodiversity.

Brand Voice: ${brandSettings?.brand_voice || 'humorous, empathetic, relatable'}
Target Audience: ${brandSettings?.target_audience || 'People with ADHD, 25-40 years old'}

Create a meme concept that is funny, relatable, and scroll-stopping.

Return JSON with this exact structure:
{
  "meme_format": "Name of meme format or 'Custom'",
  "top_text": "Setup text (keep short, 5-10 words max)",
  "bottom_text": "Punchline text (keep short, 5-10 words max)",
  "hook": "Instagram caption hook",
  "cta": "Call to action for comments",
  "hashtags": ["adhd", "relatable", "meme"],
  "image_description": "Detailed visual description for AI image generation (be specific about composition, colors, style, text placement)"
}`

  const userPrompt = `Create a ${options?.tone || 'humorous'} meme for ${options?.goal || 'viral'} engagement.

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}

Make it relatable and shareable. The image should be eye-catching and work well on Instagram.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8
    })
    
    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content generated from OpenAI')
    }
    
    const parsed = JSON.parse(content)
    
    // Validate required fields
    if (!parsed.top_text || !parsed.bottom_text || !parsed.image_description) {
      throw new Error('Generated concept missing required fields')
    }
    
    return parsed
  } catch (error: any) {
    console.error('OpenAI concept generation error:', error)
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('Rate limit exceeded. Please try again later.')
    }
    throw error
  }
}

/**
 * Generate meme image using Google AI Gemini
 * Note: Gemini Pro Vision can generate images from text prompts
 */
async function generateMemeImage({ concept, options }: any): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  
  // Note: Google AI's text-to-image capabilities are limited in the current SDK
  // For production, you would use Imagen API or similar
  // For now, this is a placeholder that would need the proper Imagen integration
  
  try {
    // Construct detailed image prompt
    const imagePrompt = `Create a ${concept.meme_format !== 'Custom' ? concept.meme_format + ' style' : ''} meme image.

Visual Description: ${concept.image_description}

Text to include:
- Top: "${concept.top_text}"
- Bottom: "${concept.bottom_text}"

Style: Modern meme aesthetic, bold sans-serif font (Impact or similar), white text with black stroke, high contrast, social media optimized (1080x1080 square format).

Make it eye-catching, funny, and shareable on Instagram/social media.`

    // For now, we'll create a simple mock response
    // In production, replace this with actual Imagen API call
    console.log('Image generation prompt:', imagePrompt)
    
    // Mock: Return a placeholder base64 image
    // In production, you would call Google's Imagen API here
    // Example: const result = await genAI.generateImage({ prompt: imagePrompt })
    
    // For development purposes, return a simple colored square as base64
    // This should be replaced with actual Imagen API integration
    throw new Error('Google AI image generation not yet fully integrated. Please configure Imagen API.')
    
    // Placeholder return (remove when implementing real API)
    // return 'base64_encoded_image_data_here'
  } catch (error: any) {
    console.error('Google AI image generation error:', error)
    throw new Error(`Image generation failed: ${error.message}`)
  }
}
