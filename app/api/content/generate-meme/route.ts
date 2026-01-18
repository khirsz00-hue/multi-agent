import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Image format for meme storage (PNG for DALL-E 3 images)
const MEME_IMAGE_FORMAT = 'png'
const MEME_CONTENT_TYPE = 'image/png'

/**
 * POST /api/content/generate-meme
 * 
 * Generate a meme with:
 * 1. OpenAI generates concept (hook, top_text, bottom_text, cta)
 * 2. DALL-E 3 generates image
 * 3. Save to Supabase Storage
 * 4. Store metadata in meme_images table
 */
export async function POST(request: Request) {
  try {
    const { painPointId, contentDraftId, options } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate API keys
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Supabase service role key not configured' }, { status: 500 })
    }
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Supabase URL not configured' }, { status: 500 })
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
    
    // Step 3: Generate image with DALL-E 3
    console.log('Generating meme image with DALL-E 3...')
    const imageData = await generateMemeImage({
      concept: memeConcept,
      options
    })
    
    console.log('Image generated successfully, uploading to storage...')
    
    // Step 4: Upload to Supabase Storage
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const storagePath = `${user.id}/memes/${timestamp}-${randomId}.${MEME_IMAGE_FORMAT}`
    
    console.log('Uploading image to Supabase Storage at:', storagePath)
    
    // Use service role for storage operations
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('meme-images')
      .upload(storagePath, imageData.imageBuffer, {
        contentType: MEME_CONTENT_TYPE,
        cacheControl: '3600',
        upsert: false
      })
    
    if (storageError) {
      console.error('Storage error:', storageError)
      throw new Error(`Failed to upload image: ${storageError.message}`)
    }
    
    console.log('Image uploaded successfully to storage')
    
    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('meme-images')
      .getPublicUrl(storagePath)
    
    console.log('Public URL obtained:', publicUrl)
    
    // Step 5: Store metadata in meme_images table
    console.log('Saving meme image metadata to database...')
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
          model: imageData.model,
          concept: memeConcept
        }
      })
      .select()
      .single()
    
    if (memeError) {
      console.error('Error saving meme image:', memeError)
      throw new Error('Failed to save meme image metadata')
    }
    
    console.log('Meme image metadata saved successfully, ID:', memeImage.id)
    
    // Step 6: Link meme image to content draft
    console.log('Linking meme image to content draft...')
    const { error: updateError } = await supabase
      .from('content_drafts')
      .update({ meme_image_id: memeImage.id })
      .eq('id', contentDraft.id)
    
    if (updateError) {
      console.error('Error linking meme to content draft:', updateError)
      // Don't throw here - image was created successfully
      console.warn('Meme image created but not linked to draft')
    } else {
      console.log('Successfully linked meme image to content draft')
    }
    
    return NextResponse.json({
      success: true,
      memeImage,
      contentDraft: {
        ...contentDraft,
        meme_image_id: memeImage.id
      }
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

Make it relatable, funny, and shareable. The image should be eye-catching and work well on Instagram.`

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
 * Generate meme image using OpenAI DALL-E 3
 */
async function generateMemeImage({ concept, options }: any): Promise<{ imageBuffer: Buffer; model: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  // Construct detailed image prompt
  const imagePrompt = `Create a ${concept.meme_format !== 'Custom' ? concept.meme_format + ' style' : ''} meme image.

Visual Description: ${concept.image_description}

Text to include:
- Top: "${concept.top_text}"
- Bottom: "${concept.bottom_text}"

Style: Modern meme aesthetic, bold sans-serif font (Impact or similar), white text with black stroke, high contrast, social media optimized (1080x1080 square format).`

  console.log('DALL-E 3 image generation prompt:', imagePrompt)
  
  try {
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json'
    })
    
    if (!imageResponse.data || !imageResponse.data[0]) {
      throw new Error('No image data returned from DALL-E 3')
    }
    
    const b64Image = imageResponse.data[0].b64_json
    if (!b64Image) {
      throw new Error('No base64 image data in DALL-E 3 response')
    }
    
    console.log('DALL-E 3 image generated successfully')
    
    const imageBuffer = Buffer.from(b64Image, 'base64')
    
    return {
      imageBuffer,
      model: 'dall-e-3'
    }
  } catch (error: any) {
    console.error('DALL-E 3 image generation error:', error)
    
    // Provide specific error messages
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('DALL-E 3 rate limit exceeded. Please try again later.')
    }
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI quota exceeded. Please check your account.')
    }
    if (error.status === 400) {
      throw new Error(`DALL-E 3 rejected the prompt: ${error.message}`)
    }
    
    throw new Error(`Failed to generate image with DALL-E 3: ${error.message}`)
  }
}

