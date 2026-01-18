/**
 * Supabase Storage Manager for Meme Images
 * 
 * Handles uploading meme images to Supabase Storage
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Upload meme image to Supabase Storage
 * 
 * @param bufor - Image buffer (PNG format)
 * @param userId - User ID for folder organization
 * @param supabase - Supabase client instance
 * @returns Public URL of the uploaded image
 * @throws Error if upload fails
 */
export async function wrzucObrazekDoStorage(
  bufor: Buffer,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  const sciezka = `memy/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`
  
  console.log('Wrzucanie obrazka do Supabase Storage:', sciezka)
  
  const { error } = await supabase.storage
    .from('meme-images')
    .upload(sciezka, bufor, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) {
    console.error('Błąd uploadu do storage:', error)
    throw new Error(`Nie udało się wrzucić obrazka: ${error.message}`)
  }
  
  const { data } = supabase.storage.from('meme-images').getPublicUrl(sciezka)
  
  console.log('Obrazek wrzucony pomyślnie, publiczny URL:', data.publicUrl)
  
  return data.publicUrl
}
