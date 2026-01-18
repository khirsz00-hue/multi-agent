/**
 * DALL-E Image Generation Service
 * 
 * High-quality, creative image generation using OpenAI's DALL-E 3
 * Best for: Memes with creative elements
 * - Size: 1024x1024
 * - Quality: High
 * - Speed: Slower
 * - Cost: Higher
 */

import OpenAI from 'openai'
import { base64ToBuffer } from './storage-upload'

export interface DalleGenerationOptions {
  prompt: string
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
}

export interface ImageGenerationResult {
  imageBuffer: Buffer
  model: string
  revisedPrompt?: string
}

/**
 * Generate image using DALL-E 3
 * 
 * @param options - Generation options including prompt
 * @returns Image buffer and metadata
 */
export async function generateWithDalle(
  options: DalleGenerationOptions
): Promise<ImageGenerationResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const { prompt, size = '1024x1024', quality = 'standard', style = 'vivid' } = options
  
  console.log('Generating image with DALL-E 3...')
  console.log('Prompt:', prompt)
  console.log('Size:', size, 'Quality:', quality, 'Style:', style)
  
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality,
      style,
      response_format: 'b64_json'
    })
    
    if (!response.data || !response.data[0]) {
      throw new Error('No image data returned from DALL-E 3')
    }
    
    const b64Image = response.data[0].b64_json
    const revisedPrompt = response.data[0].revised_prompt
    
    if (!b64Image) {
      throw new Error('No base64 image data in DALL-E 3 response')
    }
    
    console.log('DALL-E 3 image generated successfully')
    if (revisedPrompt) {
      console.log('Revised prompt:', revisedPrompt)
    }
    
    const imageBuffer = base64ToBuffer(b64Image)
    
    return {
      imageBuffer,
      model: 'dall-e-3',
      revisedPrompt
    }
  } catch (error: any) {
    console.error('DALL-E 3 generation error:', error)
    
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
    
    throw new Error(`DALL-E 3 generation failed: ${error.message}`)
  }
}
