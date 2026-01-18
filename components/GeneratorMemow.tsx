/**
 * Meme Generator Component
 * 
 * UI component for generating memes with DALL-E 3
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Image as ImageIcon } from 'lucide-react'

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
        setBlad(data.blad || 'Błąd podczas generowania')
        return
      }
      
      setObraz(data.obraz_url)
      onSuccess?.(data.obraz_url)
      
    } catch (error: any) {
      setBlad(error.message)
    } finally {
      setGenerowanie(false)
    }
  }
  
  return (
    <div className="space-y-4">
      <Button 
        onClick={generujMema}
        disabled={generowanie}
        className="w-full"
      >
        {generowanie ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generuję mema...
          </>
        ) : (
          <>
            <ImageIcon className="mr-2 h-4 w-4" />
            Wygeneruj Mema
          </>
        )}
      </Button>
      
      {blad && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          ❌ {blad}
        </div>
      )}
      
      {obraz && (
        <div className="space-y-2">
          <p className="text-sm text-green-600">✅ Mem wygenerowany!</p>
          <img 
            src={obraz} 
            alt="Wygenerowany mem" 
            className="w-full rounded-lg border-2 border-green-500"
          />
        </div>
      )}
    </div>
  )
}
