import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { painPointId, contentDraftId } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get pain point with agent access check
    const { data: painPoint, error: ppError } = await supabase
      .from('audience_insights')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', painPointId)
      .single()
    
    if (ppError || !painPoint || painPoint.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Pain point not found' }, { status: 404 })
    }
    
    // Get content draft if provided
    let contentDraft = null
    if (contentDraftId) {
      const { data } = await supabase
        .from('content_drafts')
        .select('*')
        .eq('id', contentDraftId)
        .single()
      contentDraft = data
    }
    
    // Step 1: Generate meme concept using OpenAI
    const memeContent = await generateMemeContent(painPoint, contentDraft)
    
    // Step 2: Generate image using Google AI (Gemini)
    const imageData = await generateMemeImage(memeContent)
    
    // Step 3: Upload image to Supabase Storage
    const storagePath = `${user.id}/memes/${Date.now()}-${Math.random().toString(36).substring(7)}.png`
    const imageUrl = await uploadImageToStorage(imageData.imageBuffer, storagePath)
    
    // Step 4: Save to database
    const { data: memeImage, error: memeError } = await supabase
      .from('meme_images')
      .insert({
        content_draft_id: contentDraftId || null,
        agent_id: painPoint.agent_id,
        original_prompt: memeContent.prompt,
        image_url: imageUrl,
        storage_path: storagePath,
        meme_format: memeContent.meme_format,
        top_text: memeContent.top_text,
        bottom_text: memeContent.bottom_text,
        version: 1,
        raw_image_data: {
          model: imageData.model,
          generated_at: new Date().toISOString(),
          concept: memeContent
        }
      })
      .select()
      .single()
    
    if (memeError) throw memeError
    
    // Update content draft if provided
    if (contentDraftId) {
      await supabase
        .from('content_drafts')
        .update({ meme_image_id: memeImage.id })
        .eq('id', contentDraftId)
    }
    
    return NextResponse.json({
      success: true,
      memeImage,
      imageUrl
    })
  } catch (error: any) {
    console.error('Meme generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate meme' },
      { status: 500 }
    )
  }
}

async function generateMemeContent(painPoint: any, contentDraft: any) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const systemPrompt = `You are a creative meme designer specializing in relatable ADHD and neurodiversity content.
Generate a meme concept that's humorous, relatable, and resonates with the target audience.

Popular meme formats:
- Drake: Two panel - dismissing one thing, approving another
- Distracted Boyfriend: Looking at something new while with the old
- Two Buttons: Difficult choice between two options
- Expanding Brain: Progressive levels of sophistication
- Is This A Pigeon: Misidentifying something obvious
- Custom: Create a unique format

Return JSON:
{
  "meme_format": "Drake|Distracted Boyfriend|Two Buttons|Expanding Brain|Is This A Pigeon|Custom",
  "top_text": "Setup/first part text",
  "bottom_text": "Punchline/second part text",
  "concept": "Brief description of the meme visual",
  "prompt": "Detailed prompt for AI image generation describing the exact visual to create"
}`

  const userPrompt = `Create a meme concept for this pain point:

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}
${contentDraft ? `Context from draft: ${contentDraft.hook || ''} ${contentDraft.body || ''}` : ''}

Make it relatable, funny, and shareable.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' }
  })
  
  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('No meme content generated')
  
  return JSON.parse(content)
}

async function generateMemeImage(memeContent: any) {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY not configured')
  }
  
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  // Create a detailed prompt for image generation
  const imagePrompt = `Create a meme image: ${memeContent.prompt}
  
Format: ${memeContent.meme_format}
Top text overlay: "${memeContent.top_text}"
Bottom text overlay: "${memeContent.bottom_text}"

Style: Clean, modern, social-media ready. Include clear text overlays in Impact font style. High contrast, easy to read. Professional meme aesthetic.`

  // Note: Gemini 1.5 Flash doesn't directly generate images, only text
  // We'll use a workaround by generating a detailed description and then
  // use a simpler approach or placeholder
  // For production, you'd want to use a proper image generation API like DALL-E
  
  // Generate with OpenAI DALL-E instead
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
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
  // Use service role key for storage uploads
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
  
  // Get public URL
  const { data: urlData } = supabaseAdmin
    .storage
    .from('meme-images')
    .getPublicUrl(storagePath)
  
  return urlData.publicUrl
}
