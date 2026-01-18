/**
 * Supabase Storage Upload Utility
 * 
 * Handles uploading generated images to Supabase storage and returning signed URLs
 */

import { createClient } from '@supabase/supabase-js'

export interface StorageUploadResult {
  publicUrl: string
  storagePath: string
  contentType: string
}

/**
 * Upload image buffer to Supabase storage
 * 
 * @param imageBuffer - Image data as Buffer
 * @param agentId - Agent ID for folder organization
 * @param contentType - MIME type (image/png or image/jpeg)
 * @returns Storage metadata with public URL
 */
export async function uploadImageToStorage(
  imageBuffer: Buffer,
  agentId: string,
  contentType: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<StorageUploadResult> {
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured')
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  }
  
  // Use service role for storage operations
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  // Generate unique filename
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(7)
  const extension = contentType === 'image/jpeg' ? 'jpg' : 'png'
  const storagePath = `meme-images/${agentId}/${timestamp}-${randomId}.${extension}`
  
  console.log('Uploading image to Supabase Storage:', storagePath)
  
  // Upload to storage
  const { error: storageError } = await supabaseAdmin.storage
    .from('meme-images')
    .upload(storagePath, imageBuffer, {
      contentType,
      cacheControl: '3600',
      upsert: false
    })
  
  if (storageError) {
    console.error('Storage upload error:', storageError)
    throw new Error(`Failed to upload image: ${storageError.message}`)
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('meme-images')
    .getPublicUrl(storagePath)
  
  console.log('Image uploaded successfully, public URL:', publicUrl)
  
  return {
    publicUrl,
    storagePath,
    contentType
  }
}

/**
 * Convert base64 string to Buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64')
}

/**
 * Convert data URL to Buffer
 */
export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  
  if (!matches) {
    throw new Error('Invalid data URL format')
  }
  
  const contentType = matches[1]
  const base64Data = matches[2]
  
  return {
    buffer: Buffer.from(base64Data, 'base64'),
    contentType
  }
}
