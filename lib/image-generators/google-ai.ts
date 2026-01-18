/**
 * Google AI Image Generation Service (Nano Banana)
 * 
 * Fast, real-time image generation using Google's Imagen model via Vertex AI
 * Best for: Quick memes, engagement posts
 * - Speed: Fastest
 * - Quality: Good
 * - Cost: Lower
 * Uses existing GOOGLE_AI_API_KEY
 * 
 * Note: Google's Imagen is available through Vertex AI. This implementation
 * provides a fallback structure that can be adapted based on API availability.
 */

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
 * Note: This implementation uses Vertex AI's Imagen API endpoint structure.
 * If you're using Google's Generative AI API directly, you may need to adjust
 * the endpoint and request format based on your specific setup.
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
    // Note: This endpoint structure is for Vertex AI's Imagen API
    // Adjust based on your Google Cloud project configuration
    const apiKey = process.env.GOOGLE_AI_API_KEY
    
    // For Vertex AI Imagen: Use your project's endpoint
    // Format: https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/imagen-3.0-generate-001:predict
    // For this implementation, we'll use the generativelanguage endpoint as a fallback
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/imageGeneration:generate'
    
    const requestBody = {
      prompt: prompt,
      ...(negativePrompt && { negativePrompt }),
      aspectRatio,
      numberOfImages: 1
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
    
    // Extract image from response
    // The response format may vary based on the API version and endpoint
    let base64Image: string | null = null
    
    // Try different response structures
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      base64Image = data.candidates[0].content
    } else if (data.images && data.images[0]) {
      base64Image = data.images[0]
    } else if (data.predictions && data.predictions[0]) {
      // Vertex AI format
      base64Image = data.predictions[0].bytesBase64Encoded || data.predictions[0].image
    } else if (typeof data === 'string') {
      base64Image = data
    }
    
    if (!base64Image) {
      console.error('Unexpected response format:', JSON.stringify(data).substring(0, 200))
      throw new Error('No image data returned from Google AI - response format not recognized')
    }
    
    const imageBuffer = Buffer.from(base64Image, 'base64')
    
    console.log('Google AI image generated successfully')
    
    return {
      imageBuffer,
      model: 'google-imagen'
    }
  } catch (error: any) {
    console.error('Google AI generation error:', error)
    
    // Check for common errors
    if (error.message.includes('403') || error.message.includes('API key')) {
      throw new Error('Google AI API key invalid or not authorized. Ensure GOOGLE_AI_API_KEY is configured correctly.')
    }
    if (error.message.includes('429') || error.message.includes('quota')) {
      throw new Error('Google AI rate limit exceeded. Please try again later.')
    }
    if (error.message.includes('404')) {
      throw new Error('Google AI image generation endpoint not available. You may need to configure Vertex AI.')
    }
    
    throw new Error(`Google AI generation failed: ${error.message}`)
  }
}
