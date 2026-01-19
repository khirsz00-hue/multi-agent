import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { 
      topText, 
      bottomText, 
      template, 
      engine,
      draftId 
    } = await request.json()
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    let imageUrl: string
    
    if (engine === 'dall-e-3') {
      imageUrl = await generateWithDALLE(topText, bottomText, template)
    } else if (engine === 'google-imagen') {
      imageUrl = await generateWithImagen(topText, bottomText, template)
    } else if (engine === 'replicate') {
      imageUrl = await generateWithReplicate(topText, bottomText, template)
    } else {
      throw new Error('Unsupported engine')
    }
    
    // Save to database if draftId provided
    if (draftId) {
      await supabase
        .from('content_drafts')
        .update({
          meme_top_text: topText,
          meme_bottom_text: bottomText,
          meme_template: template,
          meme_image_url: imageUrl,
          meme_engine: engine,
          content_type: 'meme',
          updated_at: new Date().toISOString()
        })
        .eq('id', draftId)
    }
    
    return NextResponse.json({ success: true, imageUrl })
  } catch (error: any) {
    console.error('Meme generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateWithDALLE(topText: string, bottomText: string, template: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const templateDescriptions: Record<string, string> = {
    drake: 'Drake meme format: Drake disapproving in top panel, Drake approving in bottom panel',
    distracted_boyfriend: 'Distracted boyfriend meme: man looking at another woman while his girlfriend looks disapproving',
    two_buttons: 'Two buttons meme: person sweating choosing between two buttons',
    expanding_brain: 'Expanding brain meme: brain getting bigger across 4 panels showing increasing intelligence',
    is_this: 'Is this a pigeon meme: man pointing at butterfly',
    change_my_mind: 'Change my mind meme: man sitting at table with sign'
  }
  
  const prompt = `Create a meme in the style of "${templateDescriptions[template] || template}".

Top text: "${topText}"
Bottom text: "${bottomText}"

Style: Clean, high quality meme format, bold Impact font white text with black outline, professional meme aesthetic, realistic photo style.`
  
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard'
  })
  
  if (!response.data || !response.data[0] || !response.data[0].url) {
    throw new Error('Failed to generate image with DALL-E 3')
  }
  
  return response.data[0].url
}

async function generateWithImagen(topText: string, bottomText: string, template: string): Promise<string> {
  // TODO: Implement Google Imagen
  // For now, return error to user
  throw new Error('Google Imagen is not yet implemented. Please select DALL-E 3.')
}

async function generateWithReplicate(topText: string, bottomText: string, template: string): Promise<string> {
  // TODO: Implement Replicate SDXL
  // For now, return error to user
  throw new Error('Replicate is not yet implemented. Please select DALL-E 3.')
}
