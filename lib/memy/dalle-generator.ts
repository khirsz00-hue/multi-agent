/**
 * DALL-E 3 Meme Image Generator
 * 
 * Generates meme images using OpenAI's DALL-E 3 API
 */

import OpenAI from 'openai'

/**
 * Generate meme image using DALL-E 3
 * 
 * @param prompt - The formatted prompt for image generation
 * @returns Buffer containing the PNG image data
 * @throws Error if generation fails or API key is missing
 */
export async function generujObrazekMemuDallE(prompt: string): Promise<Buffer> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY nie jest skonfigurowany')
  }
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  console.log('Generowanie obrazka mema z DALL-E 3...')
  console.log('Prompt:', prompt)
  
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json'
    })
    
    if (!response.data || !response.data[0]) {
      throw new Error('Brak obrazka z DALL-E')
    }
    
    const base64 = response.data[0].b64_json
    if (!base64) {
      throw new Error('Brak obrazka z DALL-E')
    }
    
    console.log('Obrazek wygenerowany pomyślnie')
    
    return Buffer.from(base64, 'base64')
  } catch (error: any) {
    console.error('Błąd generowania DALL-E 3:', error)
    
    // Provide specific error messages
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('Limit DALL-E 3 przekroczony. Spróbuj ponownie później.')
    }
    if (error.code === 'insufficient_quota') {
      throw new Error('Quota OpenAI przekroczona. Sprawdź swoje konto.')
    }
    if (error.status === 400) {
      throw new Error(`DALL-E 3 odrzucił prompt: ${error.message}`)
    }
    
    throw new Error(`Błąd generowania DALL-E 3: ${error.message}`)
  }
}
