/**
 * Prompt Generator for DALL-E Meme Generation
 * 
 * Generates optimized prompts for DALL-E 3 to create meme images
 * with text overlays in the classic meme format.
 */

export interface MemePromptOptions {
  topText: string
  bottomText: string
  styl?: string
}

/**
 * Generate a DALL-E 3 optimized prompt for meme creation
 * 
 * @param topText - Text to appear at the top of the meme
 * @param bottomText - Text to appear at the bottom of the meme
 * @param styl - Optional style description (default: 'klasycznym')
 * @returns Formatted prompt for DALL-E 3
 */
export function generujPromptDlaDallE(
  topText: string,
  bottomText: string,
  styl?: string
): string {
  const stylOpis = styl || 'klasycznym'
  
  return `Mem internetowy w stylu ${stylOpis}. 
Tekst u góry: "${topText}"
Tekst u dołu: "${bottomText}"
Format: 1024x1024, białe litery z czarnym konturem (Impact font).
Śmieszny, viral, pozytywny nastrój.`
}
