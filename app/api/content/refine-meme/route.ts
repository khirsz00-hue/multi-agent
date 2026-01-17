import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { memeImageId, refinementPrompt } = await request.json()
    
    if (!memeImageId || !refinementPrompt) {
      return NextResponse.json(
        { error: 'memeImageId and refinementPrompt are required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get original meme image with access check
    const { data: originalMeme, error: memeError } = await supabase
      .from('meme_images')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', memeImageId)
      .single()
    
    if (memeError || !originalMeme || originalMeme.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Meme image not found' }, { status: 404 })
    }
    
    // Generate refined meme concept
    const refinedContent = await generateRefinedMemeContent(
      originalMeme,
      refinementPrompt
    )
    
    // Generate new image
    const imageData = await generateMemeImage(refinedContent)
    
    // Upload new image to storage
    const storagePath = `${user.id}/memes/${Date.now()}-${Math.random().toString(36).substring(7)}.png`
    const imageUrl = await uploadImageToStorage(imageData.imageBuffer, storagePath)
    
    // Calculate next version number
    const nextVersion = originalMeme.version + 1
    
    // Save refined meme to database
    const { data: refinedMeme, error: refineError } = await supabase
      .from('meme_images')
      .insert({
        content_draft_id: originalMeme.content_draft_id,
        agent_id: originalMeme.agent_id,
        original_prompt: refinedContent.prompt,
        image_url: imageUrl,
        storage_path: storagePath,
        meme_format: refinedContent.meme_format,
        top_text: refinedContent.top_text,
        bottom_text: refinedContent.bottom_text,
        version: nextVersion,
        parent_version_id: memeImageId,
        refinement_prompt: refinementPrompt,
        raw_image_data: {
          model: imageData.model,
          generated_at: new Date().toISOString(),
          concept: refinedContent,
          refinement: refinementPrompt
        }
      })
      .select()
      .single()
    
    if (refineError) throw refineError
    
    // Update content draft to point to latest version
    if (originalMeme.content_draft_id) {
      await supabase
        .from('content_drafts')
        .update({ meme_image_id: refinedMeme.id })
        .eq('id', originalMeme.content_draft_id)
    }
    
    return NextResponse.json({
      success: true,
      memeImage: refinedMeme,
      imageUrl
    })
  } catch (error: any) {
    console.error('Meme refinement error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to refine meme' },
      { status: 500 }
    )
  }
}

async function generateRefinedMemeContent(originalMeme: any, refinementPrompt: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const systemPrompt = `You are a creative meme designer. Refine an existing meme based on user feedback.
Keep the core concept but apply the requested changes.

Return JSON:
{
  "meme_format": "Drake|Distracted Boyfriend|Two Buttons|Expanding Brain|Is This A Pigeon|Custom",
  "top_text": "Setup/first part text",
  "bottom_text": "Punchline/second part text",
  "concept": "Brief description of the refined meme visual",
  "prompt": "Detailed prompt for AI image generation"
}`

  const originalConcept = originalMeme.raw_image_data?.concept || {}
  
  const userPrompt = `Refine this meme based on user feedback:

Original Meme:
- Format: ${originalMeme.meme_format}
- Top Text: "${originalMeme.top_text}"
- Bottom Text: "${originalMeme.bottom_text}"
- Original Prompt: "${originalMeme.original_prompt}"
${originalConcept.concept ? `- Concept: ${originalConcept.concept}` : ''}

User Refinement Request: "${refinementPrompt}"

Apply the requested changes while maintaining the core humor and relatability.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' }
  })
  
  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('No refined content generated')
  
  return JSON.parse(content)
}

async function generateMemeImage(memeContent: any) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const imagePrompt = `Create a meme image: ${memeContent.prompt}
  
Format: ${memeContent.meme_format}
Top text overlay: "${memeContent.top_text}"
Bottom text overlay: "${memeContent.bottom_text}"

Style: Clean, modern, social-media ready. Include clear text overlays in Impact font style. High contrast, easy to read. Professional meme aesthetic.`

  const imageResponse = await openai.images.generate({
    model: 'dall-e-3',
    prompt: imagePrompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    response_format: 'b64_json'
  })
  
  if (!imageResponse.data || !imageResponse.data[0]) {
    throw new Error('No image data returned from DALL-E')
  }
  
  const b64Image = imageResponse.data[0].b64_json
  if (!b64Image) throw new Error('No image generated')
  
  const imageBuffer = Buffer.from(b64Image, 'base64')
  
  return {
    imageBuffer,
    model: 'dall-e-3'
  }
}

async function uploadImageToStorage(imageBuffer: Buffer, storagePath: string) {
  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data, error } = await supabaseAdmin
    .storage
    .from('meme-images')
    .upload(storagePath, imageBuffer, {
      contentType: 'image/png',
      upsert: false
    })
  
  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(`Failed to upload image: ${error.message}`)
  }
  
  const { data: urlData } = supabaseAdmin
    .storage
    .from('meme-images')
    .getPublicUrl(storagePath)
  
  return urlData.publicUrl
}
