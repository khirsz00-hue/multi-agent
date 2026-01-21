import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import sharp from 'sharp'
import { GoogleGenAI } from '@google/genai'

export async function POST(request: Request) {
  try {
    const { topText, bottomText, template, engine = 'dall-e-3' } = await request.json()
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 1. Generate background (NO TEXT)
    let bgUrl: string
    
    if (engine === 'dall-e-3') {
      bgUrl = await generateDallEBackground(template)
    } else if (engine === 'google-imagen') {
      bgUrl = await generateImagenBackground(template)
    } else {
      throw new Error(`Unsupported engine: ${engine}`)
    }
    
    // 2. Download background
    const bgResponse = await fetch(bgUrl)
    const bgBuffer = Buffer.from(await bgResponse.arrayBuffer())
    
    // 3. Create SVG text overlay
    const textSvg = createMemeTextSVG(topText, bottomText, 1024, 1024)
    
    // 4. Composite: background + text
    const finalImage = await sharp(bgBuffer)
      .composite([{
        input: Buffer.from(textSvg),
        top: 0,
        left: 0
      }])
      .png()
      .toBuffer()
    
    // 5. Upload to Supabase Storage
    const fileName = `meme-${Date.now()}.png`
    const { data: upload, error: uploadError } = await supabase.storage
      .from('memes')
      .upload(fileName, finalImage, {
        contentType: 'image/png',
        upsert: false
      })
    
    if (uploadError) throw uploadError
    
    const { data: { publicUrl } } = supabase.storage
      .from('memes')
      .getPublicUrl(upload.path)
    
    return NextResponse.json({ 
      success: true, 
      imageUrl: publicUrl,
      engine 
    })
    
  } catch (error: any) {
    console.error('Meme image generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateDallEBackground(template: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const templateDescriptions: Record<string, string> = {
    drake: 'Drake meme template: Drake disapproving gesture in top panel, approving gesture in bottom panel',
    distracted_boyfriend: 'Distracted boyfriend meme: man looking at another woman while girlfriend looks disapproving',
    two_buttons: 'Two buttons meme: person sweating choosing between two red buttons',
    expanding_brain: 'Expanding brain meme: brain glowing brighter across panels',
    is_this: 'Is this a pigeon meme: man pointing at butterfly',
    change_my_mind: 'Change my mind meme: man sitting at table with blank sign'
  }
  
  const prompt = `Create a clean meme template background in the style of "${templateDescriptions[template] || template}".
  NO TEXT on the image. Just the background scene/characters.
  High quality, 1024x1024, clean meme aesthetic, suitable for adding text overlay.`
  
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    size: '1024x1024',
    quality: 'standard'
  })
  
  if (!response.data?.[0]?.url) {
    throw new Error('Failed to generate DALL-E background')
  }
  
  return response.data[0].url
}

async function generateImagenBackground(template: string): Promise<string> {
  // Implement Google Imagen 3 API
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('GEMINI_API_KEY not found, using DALL-E fallback')
      return generateDallEBackground(template)
    }

    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    
    const templateDescriptions: Record<string, string> = {
      drake: 'Drake meme template: Drake disapproving gesture in top panel, approving gesture in bottom panel',
      distracted_boyfriend: 'Distracted boyfriend meme: man looking at another woman while girlfriend looks disapproving',
      two_buttons: 'Two buttons meme: person sweating choosing between two red buttons',
      expanding_brain: 'Expanding brain meme: brain glowing brighter across panels',
      is_this: 'Is this a pigeon meme: man pointing at butterfly',
      change_my_mind: 'Change my mind meme: man sitting at table with blank sign'
    }
    
    const prompt = `Create a clean meme template background in the style of "${templateDescriptions[template] || template}".
    NO TEXT on the image. Just the background scene/characters.
    High quality, 1024x1024, clean meme aesthetic, suitable for adding text overlay.`
    
    const response = await genai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1'
      }
    })
    
    // Extract image from response
    const generatedImage = response?.generatedImages?.[0]
    
    if (!generatedImage?.image) {
      throw new Error('No image returned from Imagen 3')
    }
    
    // If image is in imageBytes (base64), convert to data URL
    if (generatedImage.image.imageBytes) {
      const mimeType = generatedImage.image.mimeType || 'image/png'
      return `data:${mimeType};base64,${generatedImage.image.imageBytes}`
    }
    
    // If image is in GCS URI, return the URI
    if (generatedImage.image.gcsUri) {
      return generatedImage.image.gcsUri
    }
    
    throw new Error('No image data found in Imagen 3 response')
  } catch (error) {
    console.error('Google Imagen error:', error)
    console.log('Falling back to DALL-E')
    return generateDallEBackground(template)
  }
}

function createMemeTextSVG(
  topText: string,
  bottomText: string,
  width: number,
  height: number
): string {
  const topLines = wrapText(topText.toUpperCase(), 20)
  const bottomLines = wrapText(bottomText.toUpperCase(), 20)
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          text {
            font-family: Impact, 'Arial Black', sans-serif;
            font-size: 64px;
            font-weight: bold;
            text-anchor: middle;
            fill: white;
            stroke: black;
            stroke-width: 4;
            paint-order: stroke;
          }
        </style>
      </defs>
      
      ${topLines.map((line, i) => `
        <text x="${width/2}" y="${80 + i * 70}">${escapeXml(line)}</text>
      `).join('')}
      
      ${bottomLines.map((line, i) => `
        <text x="${width/2}" y="${height - 120 + i * 70}">${escapeXml(line)}</text>
      `).join('')}
    </svg>
  `
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  for (const word of words) {
    if ((currentLine + word).length > maxChars) {
      if (currentLine) lines.push(currentLine.trim())
      currentLine = word + ' '
    } else {
      currentLine += word + ' '
    }
  }
  
  if (currentLine) lines.push(currentLine.trim())
  return lines
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
