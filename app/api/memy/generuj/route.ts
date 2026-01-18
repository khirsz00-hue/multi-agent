/**
 * POST /api/memy/generuj
 * 
 * Generate meme image with DALL-E 3 integration
 * Endpoint for creating memes with top/bottom text
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generujPromptDlaDallE } from '@/lib/memy/prompt-generator'
import { generujObrazekMemuDallE } from '@/lib/memy/dalle-generator'
import { wrzucObrazekDoStorage } from '@/lib/memy/storage-manager'

export async function POST(request: Request) {
  try {
    const { meme_top_text, meme_bottom_text, styl, content_draft_id } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { blad: 'Brak autoryzacji' }, 
        { status: 401 }
      )
    }
    
    // Walidacja - co najmniej jeden tekst musi być podany
    if (!meme_top_text && !meme_bottom_text) {
      return NextResponse.json(
        { blad: 'Tekst mema nie może być pusty' },
        { status: 400 }
      )
    }
    
    // Generuj prompt dla DALL-E
    const prompt = generujPromptDlaDallE(
      meme_top_text || '',
      meme_bottom_text || '',
      styl
    )
    
    // Generuj obrazek z DALL-E 3 (z retry)
    let bufor: Buffer | undefined
    let retries = 2
    let lastError: Error | null = null
    
    while (retries > 0) {
      try {
        bufor = await generujObrazekMemuDallE(prompt)
        break
      } catch (error: any) {
        lastError = error
        retries--
        
        if (retries > 0 && (error.message.includes('timeout') || error.message.includes('rate_limit'))) {
          console.log(`Retry generowania obrazka, pozostało prób: ${retries}`)
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2s delay
        } else {
          throw error
        }
      }
    }
    
    if (!bufor) {
      throw lastError || new Error('Nie udało się wygenerować obrazka po 3 próbach')
    }
    
    // Wrzuć obrazek do Supabase Storage
    const url_obrazka = await wrzucObrazekDoStorage(bufor, user.id, supabase)
    
    // Update draft (jeśli podano ID)
    if (content_draft_id) {
      const { error: updateError } = await supabase
        .from('content_drafts')
        .update({
          image_url: url_obrazka,
          image_engine: 'dalle',
          generation_cost: 0.02  // Przybliżony koszt DALL-E 3
        })
        .eq('id', content_draft_id)
      
      if (updateError) {
        console.error('Błąd aktualizacji drafta:', updateError)
        // Nie rzucamy błędu - obrazek został wygenerowany pomyślnie
      }
    }
    
    return NextResponse.json({
      sukces: true,
      obraz_url: url_obrazka,
      draft_id: content_draft_id
    })
    
  } catch (error: any) {
    console.error('[Błąd Generowania Mema]', error)
    
    // Szczegółowe komunikaty błędów
    let statusCode = 500
    let errorMessage = error.message || 'Błąd podczas generowania mema'
    
    if (error.message?.includes('Brak dostępu do storage')) {
      statusCode = 500
      errorMessage = 'Brak dostępu do storage'
    } else if (error.message?.includes('API')) {
      errorMessage = `Błąd API: ${error.message}`
    }
    
    return NextResponse.json(
      { blad: errorMessage },
      { status: statusCode }
    )
  }
}
