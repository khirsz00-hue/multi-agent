import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import type { MemeProposal } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const { proposal, engine, spaceId } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    let imageUrl: string
    
    if (engine === 'dall-e-3') {
      imageUrl = await generateWithDallE(proposal as MemeProposal)
    } else if (engine === 'google-imagen') {
      imageUrl = await generateWithImagen(proposal as MemeProposal)
    } else if (engine === 'replicate') {
      imageUrl = await generateWithReplicate(proposal as MemeProposal)
    } else {
      throw new Error('Unsupported engine')
    }
    
    return NextResponse.json({ success: true, imageUrl })
  } catch (error: any) {
    console.error('Meme generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateWithDallE(proposal: MemeProposal): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const prompt = `Create a meme image with the following text:
Top text: "${proposal.topText}"
${proposal.middleText ? `Middle text: "${proposal.middleText}"` : ''}
Bottom text: "${proposal.bottomText}"

${proposal.template !== 'custom' ? `Use the style of a ${proposal.template} meme.` : ''}

Make it funny, relatable, and visually clear. Use bold white text with black outline for readability.`
  
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard'
  })
  
  if (!response.data || !response.data[0]?.url) {
    throw new Error('Failed to generate image with DALL-E')
  }
  
  return response.data[0].url
}

async function generateWithImagen(proposal: MemeProposal): Promise<string> {
  // TODO: Implement Google Imagen
  // For now, fallback to DALL-E
  console.log('Google Imagen not implemented yet, using DALL-E')
  return generateWithDallE(proposal)
}

async function generateWithReplicate(proposal: MemeProposal): Promise<string> {
  // TODO: Implement Replicate SDXL
  // For now, fallback to DALL-E
  console.log('Replicate not implemented yet, using DALL-E')
  return generateWithDallE(proposal)
}
