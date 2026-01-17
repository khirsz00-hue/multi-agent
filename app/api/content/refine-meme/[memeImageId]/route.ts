import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

/**
 * POST /api/content/refine-meme/[memeImageId]
 * 
 * Refine an existing meme:
 * 1. Get original meme concept and image
 * 2. Apply user refinement prompt
 * 3. Regenerate image with Google AI
 * 4. Create new version with parent_version_id
 * 5. Update content draft
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ memeImageId: string }> }
) {
  try {
    const { refinementPrompt } = await request.json()
    const { memeImageId } = await context.params
    
    if (!refinementPrompt || refinementPrompt.trim().length === 0) {
      return NextResponse.json({ error: 'Refinement prompt is required' }, { status: 400 })
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
    
    // Get existing meme image with authorization check
    const { data: existingMeme, error: fetchError } = await supabase
      .from('meme_images')
      .select(`
        *,
        agents!inner(id, space_id, spaces!inner(user_id)),
        content_drafts!inner(*)
      `)
      .eq('id', memeImageId)
      .single()
    
    if (fetchError || !existingMeme || existingMeme.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Meme image not found' }, { status: 404 })
    }
    
    const agentId = existingMeme.agent_id
    const contentDraftId = existingMeme.content_draft_id
    
    // Find the original meme (v1, parent_version_id = null)
    let originalMeme = existingMeme
    if (existingMeme.parent_version_id) {
      const { data: rootMeme } = await supabase
        .from('meme_images')
        .select('*')
        .eq('content_draft_id', contentDraftId)
        .is('parent_version_id', null)
        .single()
      
      if (rootMeme) {
        originalMeme = rootMeme
      }
    }
    
    // Get the highest version number for this content draft
    const { data: versions } = await supabase
      .from('meme_images')
      .select('version')
      .eq('content_draft_id', contentDraftId)
      .order('version', { ascending: false })
      .limit(1)
    
    const nextVersion = (versions?.[0]?.version || 1) + 1
    
    // Step 1: Refine concept with OpenAI
    console.log('Refining meme concept with OpenAI...')
    const refinedConcept = await refineMemeConcept({
      originalConcept: existingMeme.raw_image_data?.concept || {
        meme_format: existingMeme.meme_format,
        top_text: existingMeme.top_text,
        bottom_text: existingMeme.bottom_text,
        image_description: existingMeme.original_prompt
      },
      refinementPrompt,
      existingMeme
    })
    
    // Step 2: Generate new image with Google AI
    console.log('Generating refined meme image with Google AI...')
    const imageData = await generateMemeImage({
      concept: refinedConcept
    })
    
    // Step 3: Upload to Supabase Storage
    const timestamp = Date.now()
    const storagePath = `${agentId}/${contentDraftId}/${timestamp}.svg`
    
    console.log('Uploading refined image to Supabase Storage...')
    const { error: storageError } = await supabase.storage
      .from('meme-images')
      .upload(storagePath, Buffer.from(imageData, 'base64'), {
        contentType: 'image/svg+xml',
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
    
    // Step 4: Create new version in meme_images table
    const { data: newMemeVersion, error: memeError } = await supabase
      .from('meme_images')
      .insert({
        content_draft_id: contentDraftId,
        agent_id: agentId,
        original_prompt: refinedConcept.image_description,
        meme_format: refinedConcept.meme_format,
        top_text: refinedConcept.top_text,
        bottom_text: refinedConcept.bottom_text,
        image_url: publicUrl,
        storage_path: storagePath,
        version: nextVersion,
        parent_version_id: memeImageId, // Link to the meme we're refining
        refinement_prompt: refinementPrompt,
        raw_image_data: {
          generated_at: new Date().toISOString(),
          model: 'placeholder-svg',
          concept: refinedConcept,
          refined_from: memeImageId,
          note: 'Using placeholder image generation. Integrate Imagen API or DALL-E for production.'
        }
      })
      .select()
      .single()
    
    if (memeError) {
      console.error('Error saving refined meme:', memeError)
      throw new Error('Failed to save refined meme')
    }
    
    // Step 5: Update content draft with new version
    await supabase
      .from('content_drafts')
      .update({
        hook: refinedConcept.hook || existingMeme.content_drafts.hook,
        body: `Top: ${refinedConcept.top_text}\n\nBottom: ${refinedConcept.bottom_text}`,
        cta: refinedConcept.cta || existingMeme.content_drafts.cta,
        visual_suggestions: {
          meme_format: refinedConcept.meme_format,
          image_description: refinedConcept.image_description
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', contentDraftId)
    
    return NextResponse.json({
      success: true,
      memeImage: newMemeVersion,
      version: nextVersion
    })
  } catch (error: any) {
    console.error('Meme refinement error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to refine meme' 
    }, { status: 500 })
  }
}

/**
 * Refine meme concept using OpenAI
 */
async function refineMemeConcept({ 
  originalConcept, 
  refinementPrompt, 
  existingMeme 
}: any) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const systemPrompt = `You are an expert meme creator. You're refining an existing meme based on user feedback.

Original Meme:
- Format: ${originalConcept.meme_format}
- Top Text: "${originalConcept.top_text}"
- Bottom Text: "${originalConcept.bottom_text}"
- Image: ${originalConcept.image_description}

Apply the user's refinement request while maintaining the meme's core message and humor.

Return JSON with this exact structure:
{
  "meme_format": "Name of meme format or 'Custom'",
  "top_text": "Setup text (keep short, 5-10 words max)",
  "bottom_text": "Punchline text (keep short, 5-10 words max)",
  "hook": "Instagram caption hook (if changed)",
  "cta": "Call to action (if changed)",
  "hashtags": ["adhd", "relatable", "meme"],
  "image_description": "Detailed visual description incorporating refinement"
}`

  const userPrompt = `User refinement request: "${refinementPrompt}"

Modify the meme concept accordingly. Keep what works, improve what the user asked for.`

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
      throw new Error('Refined concept missing required fields')
    }
    
    // Preserve fields if not updated
    if (!parsed.hook) parsed.hook = originalConcept.hook
    if (!parsed.cta) parsed.cta = originalConcept.cta
    if (!parsed.hashtags) parsed.hashtags = originalConcept.hashtags
    
    return parsed
  } catch (error: any) {
    console.error('OpenAI refinement error:', error)
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('Rate limit exceeded. Please try again later.')
    }
    throw error
  }
}

/**
 * Generate meme image using Google AI Gemini
 * Note: This is currently a PLACEHOLDER implementation
 * For production, integrate Imagen API, DALL-E, or similar service
 */
async function generateMemeImage({ concept }: any): Promise<string> {
  // Construct detailed image prompt for logging
  const imagePrompt = `Create a ${concept.meme_format !== 'Custom' ? concept.meme_format + ' style' : ''} meme image.

Visual Description: ${concept.image_description}

Text to include:
- Top: "${concept.top_text}"
- Bottom: "${concept.bottom_text}"

Style: Modern meme aesthetic, bold sans-serif font (Impact or similar), white text with black stroke, high contrast, social media optimized (1080x1080 square format).`

  console.log('Image generation prompt:', imagePrompt)
  
  // PLACEHOLDER: Generate a simple text-based meme image
  // In production, replace this with actual Imagen API, DALL-E, or similar
  console.warn('Using placeholder image generation. For production, integrate Imagen API or DALL-E.')
  
  try {
    // Create a simple SVG-based meme image as placeholder
    const width = 1080
    const height = 1080
    
    // Generate a simple gradient background based on meme format
    const colors = getColorScheme(concept.meme_format || 'Custom')
    
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.start};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.end};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
      
      <!-- Top Text -->
      <text x="${width/2}" y="150" 
            font-family="Impact, Arial Black, sans-serif" 
            font-size="72" 
            font-weight="bold"
            fill="white" 
            stroke="black" 
            stroke-width="3"
            text-anchor="middle"
            style="text-transform: uppercase;">
        ${escapeXml(concept.top_text)}
      </text>
      
      <!-- Bottom Text -->
      <text x="${width/2}" y="${height - 100}" 
            font-family="Impact, Arial Black, sans-serif" 
            font-size="72" 
            font-weight="bold"
            fill="white" 
            stroke="black" 
            stroke-width="3"
            text-anchor="middle"
            style="text-transform: uppercase;">
        ${escapeXml(concept.bottom_text)}
      </text>
      
      <!-- Watermark -->
      <text x="${width/2}" y="${height/2}" 
            font-family="Arial, sans-serif" 
            font-size="24" 
            fill="rgba(255,255,255,0.3)"
            text-anchor="middle">
        Placeholder Meme - Integrate Imagen API
      </text>
    </svg>`
    
    // Convert SVG to base64
    const base64 = Buffer.from(svg).toString('base64')
    return base64
    
  } catch (error: any) {
    console.error('Placeholder image generation error:', error)
    throw new Error(`Image generation failed: ${error.message}`)
  }
}

/**
 * Get color scheme based on meme format
 */
function getColorScheme(format: string): { start: string; end: string } {
  const schemes: Record<string, { start: string; end: string }> = {
    'Drake': { start: '#1a1a2e', end: '#16213e' },
    'Distracted Boyfriend': { start: '#e94560', end: '#0f3460' },
    'Custom': { start: '#4a148c', end: '#6a1b9a' },
    'default': { start: '#2c3e50', end: '#3498db' }
  }
  return schemes[format] || schemes['default']
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
