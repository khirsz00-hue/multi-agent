/**
 * Meme Generator Component
 * 
 * UI component for generating memes with DALL-E 3
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Loader2, ImageIcon } from 'lucide-react'

interface GeneratorMemowProps {
  topText: string
  bottomText: string
  draftId?: string
  onSuccess?: (imageUrl: string) => void
}

export function GeneratorMemow({ 
  topText, 
  bottomText, 
  draftId, 
  onSuccess 
}: GeneratorMemowProps) {
  const [generowanie, setGenerowanie] = useState(false)
  const [obraz, setObraz] = useState<string | null>(null)
  const [blad, setBlad] = useState<string | null>(null)
  
  async function generujMema() {
    // Walidacja
    if (!topText && !bottomText) {
      setBlad('Minimum jeden tekst musi być ustawiony!')
      return
    }
    
    setGenerowanie(true)
    setBlad(null)
    
    try {
      const response = await fetch('/api/memy/generuj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meme_top_text: topText,
          meme_bottom_text: bottomText,
          content_draft_id: draftId
        })
      })
      
      const data = await response.json()
      
      if (!data.sukces) {
        setBlad(data.blad || 'Błąd podczas generowania mema')
        return
      }
      
      setObraz(data.obraz_url)
      onSuccess?.(data.obraz_url)
      
    } catch (error: any) {
      setBlad(error.message || 'Nieznany błąd')
    } finally {
      setGenerowanie(false)
    }
  }
  
  return (
    <div className="space-y-4">
      <Button 
        onClick={generujMema}
        disabled={generowanie || (!topText && !bottomText)}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
      >
        {generowanie ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generuję mema... (może chwilę potrwać)
          </>
        ) : (
          <>
            <ImageIcon className="mr-2 h-4 w-4" />
            🎨 Wygeneruj Mem za pomocą DALL-E
          </>
        )}
      </Button>
      
      {blad && (
        <div className="p-3 bg-red-100 text-red-700 rounded border border-red-300">
          <p className="font-semibold">❌ Błąd</p>
          <p className="text-sm">{blad}</p>
        </div>
      )}
      
      {obraz && (
        <div className="space-y-2">
          <p className="text-sm text-green-600 font-semibold">✅ Mem wygenerowany pomyślnie!</p>
          <div className="relative w-full aspect-square">
            <Image 
              src={obraz} 
              alt="Wygenerowany mem" 
              fill
              className="rounded-lg border-2 border-green-500 shadow-lg object-contain"
            />
          </div>
          <p className="text-xs text-gray-500">Mem został zapisany do bazy danych. Możesz go teraz opublikować!</p>
        </div>
      )}
    </div>
  )
}
