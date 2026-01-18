/**
 * POST /api/content/generate-static
 * 
 * Generate static image content with:
 * 1. Generate concept via OpenAI
 * 2. User selects image engine (or auto-select)
 * 3. Generate image via chosen engine (DALL-E, Google AI, or Replicate)
 * 4. Upload to Supabase storage
 * 5. Save to database
 * 6. Return draft with image
 * 
 * Features fallback chain: Primary → Secondary → Placeholder
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { generateWithDalle } from '@/lib/image-generators/dalle'
import { generateWithGoogleAI } from '@/lib/image-generators/google-ai'
import { generateWithReplicate } from '@/lib/image-generators/replicate'
import { uploadImageToStorage } from '@/lib/image-generators/storage-upload'

export type ImageEngine = 'dalle' | 'google-ai' | 'replicate' | 'auto'

interface GenerateStaticRequest {
  painPointId: string
  contentType?: 'meme' | 'engagement_post' | 'static_image'
  imageEngine?: ImageEngine
  options?: {
    tone?: string
    goal?: string
    style?: string
    aspectRatio?: '1:1' | '16:9' | '9:16'
  }
}

/**
 * POST handler for static content generation
 */
export async function POST(request: Request) {
  try {
    const body: GenerateStaticRequest = await request.json()
    const { painPointId, contentType = 'meme', imageEngine = 'auto', options = {} } = body
    
    // Validate required fields
    if (!painPointId) {
      return NextResponse.json({ error: 'painPointId is required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate API keys
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
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
    
    // Step 1: Generate concept with OpenAI
    console.log('Generating content concept with OpenAI...')
    const concept = await generateConcept({
      painPoint,
      contentType,
      options,
      brandSettings
    })
    
    // Step 2: Create content draft first
    const { data: contentDraft, error: draftError } = await supabase
      .from('content_drafts')
      .insert({
        agent_id: agentId,
        pain_point_id: painPointId,
        content_type: contentType,
        hook: concept.hook,
        body: concept.body || `${concept.top_text}\n\n${concept.bottom_text}`,
        cta: concept.cta,
        hashtags: concept.hashtags || [],
        tone: options.tone || 'humorous',
        goal: options.goal || 'engagement',
        target_platform: 'instagram',
        visual_suggestions: {
          image_description: concept.image_description,
          style: concept.style || options.style
        },
        status: 'draft'
      })
      .select()
      .single()
    
    if (draftError) {
      console.error('Error creating content draft:', draftError)
      throw new Error('Failed to create content draft')
    }
    
    // Step 3: Select and use image generation engine
    const selectedEngine = selectImageEngine(imageEngine, options)
    console.log(`Selected image engine: ${selectedEngine}`)
    
    let imageResult
    let generationError
    
    // Try primary engine
    try {
      imageResult = await generateImageWithEngine(selectedEngine, concept, options)
      console.log(`Image generated successfully with ${selectedEngine}`)
    } catch (error: any) {
      console.error(`Primary engine (${selectedEngine}) failed:`, error.message)
      generationError = error
      
      // Try fallback chain
      const fallbackEngines = getFallbackChain(selectedEngine)
      
      for (const fallbackEngine of fallbackEngines) {
        try {
          console.log(`Trying fallback engine: ${fallbackEngine}`)
          imageResult = await generateImageWithEngine(fallbackEngine, concept, options)
          console.log(`Image generated successfully with fallback engine: ${fallbackEngine}`)
          break
        } catch (fallbackError: any) {
          console.error(`Fallback engine (${fallbackEngine}) failed:`, fallbackError.message)
          generationError = fallbackError
        }
      }
    }
    
    // If all engines failed, throw error
    if (!imageResult) {
      throw new Error(`All image generation engines failed. Last error: ${generationError?.message}`)
    }
    
    // Step 4: Upload to Supabase Storage
    console.log('Uploading image to storage...')
    const storageResult = await uploadImageToStorage(
      imageResult.imageBuffer,
      agentId,
      'image/png'
    )
    
    // Step 5: Store metadata in meme_images table
    console.log('Saving image metadata to database...')
    const { data: memeImage, error: memeError } = await supabase
      .from('meme_images')
      .insert({
        content_draft_id: contentDraft.id,
        agent_id: agentId,
        original_prompt: concept.image_description,
        meme_format: concept.meme_format || 'Custom',
        top_text: concept.top_text || '',
        bottom_text: concept.bottom_text || '',
        image_url: storageResult.publicUrl,
        storage_path: storageResult.storagePath,
        version: 1,
        parent_version_id: null,
        refinement_prompt: null,
        raw_image_data: {
          generated_at: new Date().toISOString(),
          model: imageResult.model,
          engine: selectedEngine,
          concept,
          revised_prompt: imageResult.revisedPrompt
        }
      })
      .select()
      .single()
    
    if (memeError) {
      console.error('Error saving meme image:', memeError)
      throw new Error('Failed to save image metadata')
    }
    
    // Step 6: Link meme image to content draft
    const { error: updateError } = await supabase
      .from('content_drafts')
      .update({ meme_image_id: memeImage.id })
      .eq('id', contentDraft.id)
    
    if (updateError) {
      console.warn('Error linking meme to content draft:', updateError)
    }
    
    return NextResponse.json({
      success: true,
      memeImage,
      contentDraft: {
        ...contentDraft,
        meme_image_id: memeImage.id
      },
      engine: selectedEngine
    })
  } catch (error: any) {
    console.error('Static content generation error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate static content' 
    }, { status: 500 })
  }
}

/**
 * Generate content concept using OpenAI
 */
async function generateConcept({ painPoint, contentType, options, brandSettings }: any) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const systemPrompt = `You are an expert content creator specializing in engaging social media content.

Brand Voice: ${brandSettings?.brand_voice || 'humorous, empathetic, relatable'}
Target Audience: ${brandSettings?.target_audience || 'Social media users, 25-40 years old'}

Create a ${contentType} concept that is engaging, relatable, and scroll-stopping.

Return JSON with this exact structure:
{
  "meme_format": "Name of format or 'Custom'",
  "top_text": "Setup/top text (short, 5-10 words)",
  "bottom_text": "Punchline/bottom text (short, 5-10 words)",
  "hook": "Social media caption hook",
  "body": "Extended caption body (optional)",
  "cta": "Call to action for engagement",
  "hashtags": ["relevant", "hashtags"],
  "style": "visual style (e.g., 'modern meme aesthetic', 'minimalist design')",
  "image_description": "Detailed visual description for AI image generation"
}`

  const userPrompt = `Create a ${options?.tone || 'engaging'} ${contentType} for ${options?.goal || 'engagement'}.

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}

Make it relatable, shareable, and visually appealing.`

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
    
    return JSON.parse(content)
  } catch (error: any) {
    console.error('OpenAI concept generation error:', error)
    throw new Error(`Failed to generate concept: ${error.message}`)
  }
}

/**
 * Select appropriate image generation engine
 */
function selectImageEngine(requested: ImageEngine, options: any): Exclude<ImageEngine, 'auto'> {
  if (requested !== 'auto') {
    return requested as Exclude<ImageEngine, 'auto'>
  }
  
  // Auto-select based on use case
  const goal = options?.goal?.toLowerCase() || ''
  const tone = options?.tone?.toLowerCase() || ''
  
  // Fast engagement content -> Google AI
  if (goal.includes('quick') || goal.includes('engagement') || tone.includes('casual')) {
    return 'google-ai'
  }
  
  // High quality, creative -> DALL-E
  if (goal.includes('viral') || goal.includes('creative') || tone.includes('artistic')) {
    return 'dalle'
  }
  
  // Balanced default -> Replicate
  return 'replicate'
}

/**
 * Generate image using specified engine
 */
async function generateImageWithEngine(
  engine: Exclude<ImageEngine, 'auto'>,
  concept: any,
  options: any
) {
  const prompt = buildImagePrompt(concept, options)
  
  switch (engine) {
    case 'dalle':
      return await generateWithDalle({
        prompt,
        size: options?.aspectRatio === '16:9' ? '1792x1024' : 
              options?.aspectRatio === '9:16' ? '1024x1792' : '1024x1024',
        quality: 'standard',
        style: concept.style?.includes('natural') ? 'natural' : 'vivid'
      })
      
    case 'google-ai':
      return await generateWithGoogleAI({
        prompt,
        aspectRatio: options?.aspectRatio || '1:1'
      })
      
    case 'replicate':
      const dimensions = getReplicateDimensions(options?.aspectRatio)
      return await generateWithReplicate({
        prompt,
        width: dimensions.width,
        height: dimensions.height,
        numInferenceSteps: 4,
        guidanceScale: 7.5
      })
      
    default:
      throw new Error(`Unknown engine: ${engine}`)
  }
}

/**
 * Build comprehensive image prompt
 */
function buildImagePrompt(concept: any, options: any): string {
  const parts = [concept.image_description]
  
  if (concept.style) {
    parts.push(`Style: ${concept.style}`)
  }
  
  if (concept.top_text && concept.bottom_text) {
    parts.push(`Include text: Top: "${concept.top_text}", Bottom: "${concept.bottom_text}"`)
  }
  
  if (options?.style) {
    parts.push(options.style)
  }
  
  return parts.join('. ')
}

/**
 * Get dimensions for Replicate based on aspect ratio
 */
function getReplicateDimensions(aspectRatio?: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1344, height: 768 }
    case '9:16':
      return { width: 768, height: 1344 }
    case '4:3':
      return { width: 1152, height: 896 }
    case '3:4':
      return { width: 896, height: 1152 }
    default:
      return { width: 1024, height: 1024 }
  }
}

/**
 * Get fallback chain for failed engine
 */
function getFallbackChain(primaryEngine: Exclude<ImageEngine, 'auto'>): Array<Exclude<ImageEngine, 'auto'>> {
  const chains: Record<Exclude<ImageEngine, 'auto'>, Array<Exclude<ImageEngine, 'auto'>>> = {
    'dalle': ['replicate', 'google-ai'],
    'google-ai': ['replicate', 'dalle'],
    'replicate': ['dalle', 'google-ai']
  }
  
  return chains[primaryEngine] || []
}
