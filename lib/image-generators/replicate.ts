/**
 * Replicate Image Generation Service
 * 
 * Text-to-image generation using Replicate's models (Stable Diffusion, Flux, etc.)
 * Best for: High-quality posts, newsletters
 * - Quality: High
 * - Speed: Balanced
 * - Cost: Moderate
 * Uses REPLICATE_API_KEY
 */

import Replicate from 'replicate'

export interface ReplicateGenerationOptions {
  prompt: string
  negativePrompt?: string
  model?: string
  width?: number
  height?: number
  numInferenceSteps?: number
  guidanceScale?: number
}

export interface ImageGenerationResult {
  imageBuffer: Buffer
  model: string
}

/**
 * Generate image using Replicate (Stable Diffusion / Flux)
 * 
 * Default model: FLUX.1 [schnell] - Fast, high-quality text-to-image
 * Alternative: stable-diffusion-xl-1024-v1-0
 * 
 * @param options - Generation options including prompt
 * @returns Image buffer and metadata
 */
export async function generateWithReplicate(
  options: ReplicateGenerationOptions
): Promise<ImageGenerationResult> {
  if (!process.env.REPLICATE_API_KEY) {
    throw new Error('REPLICATE_API_KEY not configured')
  }
  
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_KEY
  })
  
  const {
    prompt,
    negativePrompt,
    model = 'black-forest-labs/flux-schnell',
    width = 1024,
    height = 1024,
    numInferenceSteps = 4,
    guidanceScale = 7.5
  } = options
  
  console.log('Generating image with Replicate...')
  console.log('Model:', model)
  console.log('Prompt:', prompt)
  console.log('Size:', `${width}x${height}`)
  
  try {
    // Run the model
    const output = await replicate.run(
      model as `${string}/${string}`,
      {
        input: {
          prompt,
          ...(negativePrompt && { negative_prompt: negativePrompt }),
          width,
          height,
          num_inference_steps: numInferenceSteps,
          guidance_scale: guidanceScale,
          num_outputs: 1
        }
      }
    ) as any
    
    // Output is typically an array of image URLs
    if (!output || !Array.isArray(output) || output.length === 0) {
      throw new Error('No image data returned from Replicate')
    }
    
    const imageUrl = output[0]
    console.log('Replicate returned image URL:', imageUrl)
    
    // Download the image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`)
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)
    
    console.log('Replicate image generated and downloaded successfully')
    
    return {
      imageBuffer,
      model
    }
  } catch (error: any) {
    console.error('Replicate generation error:', error)
    
    // Check for common errors
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      throw new Error('Replicate API key invalid or not authorized')
    }
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      throw new Error('Replicate rate limit exceeded. Please try again later.')
    }
    if (error.message.includes('insufficient credits')) {
      throw new Error('Replicate account has insufficient credits')
    }
    
    throw new Error(`Replicate generation failed: ${error.message}`)
  }
}
