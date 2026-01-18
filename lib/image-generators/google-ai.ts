/**
 * Google AI Image Generation Service (Nano Banana)
 * 
 * Fast, real-time image generation using Google's Imagen model
 * Best for: Quick memes, engagement posts
 * - Speed: Fastest
 * - Quality: Good
 * - Cost: Lower
 * Uses existing GOOGLE_AI_API_KEY
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface GoogleAIGenerationOptions {
  prompt: string
  negativePrompt?: string
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
}

export interface ImageGenerationResult {
  imageBuffer: Buffer
  model: string
}

/**
 * Generate image using Google AI (Imagen)
 * 
 * Note: As of implementation, Google's Generative AI SDK primarily supports text
 * generation. For image generation, we'll use the Imagen API if available,
 * or fall back to a placeholder implementation.
 * 
 * @param options - Generation options including prompt
 * @returns Image buffer and metadata
 */
export async function generateWithGoogleAI(
  options: GoogleAIGenerationOptions
): Promise<ImageGenerationResult> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY not configured')
  }
  
  const { prompt, negativePrompt, aspectRatio = '1:1' } = options
  
  console.log('Generating image with Google AI (Imagen)...')
  console.log('Prompt:', prompt)
  console.log('Aspect Ratio:', aspectRatio)
  if (negativePrompt) {
    console.log('Negative Prompt:', negativePrompt)
  }
  
  try {
    // Use Google's Imagen API endpoint
    // Note: This uses the REST API directly as the SDK may not have full image generation support
    const apiKey = process.env.GOOGLE_AI_API_KEY
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict'
    
    const requestBody = {
      instances: [{
        prompt: prompt,
        ...(negativePrompt && { negativePrompt }),
        sampleImageSize: aspectRatio === '1:1' ? '1024' : '1024x1024',
        sampleCount: 1,
        aspectRatio
      }],
      parameters: {
        sampleCount: 1
      }
    }
    
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google AI API error:', response.status, errorText)
      throw new Error(`Google AI API returned ${response.status}: ${errorText}`)
    }
    
    const data = await response.json()
    
    // Extract base64 image from response
    if (!data.predictions || !data.predictions[0] || !data.predictions[0].bytesBase64Encoded) {
      throw new Error('No image data returned from Google AI')
    }
    
    const base64Image = data.predictions[0].bytesBase64Encoded
    const imageBuffer = Buffer.from(base64Image, 'base64')
    
    console.log('Google AI image generated successfully')
    
    return {
      imageBuffer,
      model: 'imagen-3.0-generate-001'
    }
  } catch (error: any) {
    console.error('Google AI generation error:', error)
    
    // Check for common errors
    if (error.message.includes('403') || error.message.includes('API key')) {
      throw new Error('Google AI API key invalid or not authorized')
    }
    if (error.message.includes('429') || error.message.includes('quota')) {
      throw new Error('Google AI rate limit exceeded. Please try again later.')
    }
    
    throw new Error(`Google AI generation failed: ${error.message}`)
  }
}
