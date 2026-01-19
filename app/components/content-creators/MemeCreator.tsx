'use client'

import { useState } from 'react'
import { Laugh, Sparkles, Download, RefreshCw, Loader2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { InsightSelector } from './InsightSelector'
import type { Space, AudienceInsight, MemeProposal, MemeFeedbackHistory } from '@/lib/types'

interface MemeCreatorProps {
  space: Space
  insights: AudienceInsight[]
}

export function MemeCreator({ space, insights }: MemeCreatorProps) {
  const [step, setStep] = useState<'insight' | 'proposal' | 'generate' | 'preview'>('insight')
  const [selectedInsight, setSelectedInsight] = useState<AudienceInsight | null>(null)
  const [customInsight, setCustomInsight] = useState('')
  const [proposal, setProposal] = useState<MemeProposal | null>(null)
  const [loadingProposal, setLoadingProposal] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackHistory, setFeedbackHistory] = useState<MemeFeedbackHistory[]>([])
  const [selectedEngine, setSelectedEngine] = useState('dall-e-3')
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  const engines = [
    {
      id: 'dall-e-3',
      name: 'DALL-E 3',
      cost: 0.04,
      quality: 'Najlepsza',
      speed: 'Średnia',
      recommended: true
    },
    {
      id: 'google-imagen',
      name: 'Google Imagen',
      cost: 0.02,
      quality: 'Dobra',
      speed: 'Szybka'
    },
    {
      id: 'replicate',
      name: 'Replicate SDXL',
      cost: 0.01,
      quality: 'Średnia',
      speed: 'Szybka'
    }
  ]

  const handleGenerateProposal = async () => {
    setLoadingProposal(true)
    
    try {
      const insightText = selectedInsight?.pain_point || customInsight
      
      const res = await fetch('/api/memes/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insight: insightText,
          spaceId: space.id,
          previousProposal: proposal,
          feedback: feedback || undefined
        })
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Błąd generowania propozycji')
      }
      
      if (feedback && proposal) {
        setFeedbackHistory([...feedbackHistory, {
          proposal,
          feedback,
          timestamp: new Date()
        }])
      }
      
      setProposal(data.proposal)
      setStep('proposal')
      setFeedback('')
    } catch (error) {
      console.error('Failed to generate proposal:', error)
      alert('Błąd generowania propozycji')
    } finally {
      setLoadingProposal(false)
    }
  }

  const handleGenerateMeme = async () => {
    setGenerating(true)
    
    try {
      const res = await fetch('/api/memes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal,
          engine: selectedEngine,
          spaceId: space.id
        })
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Błąd generowania mema')
      }
      
      setGeneratedImage(data.imageUrl)
      setStep('preview')
    } catch (error) {
      console.error('Failed to generate meme:', error)
      alert('Błąd generowania mema')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Laugh className="h-8 w-8 text-blue-600" />
            Kreator Memów
          </h1>
          <p className="text-gray-600 mt-1">
            Generuj viralowe memy z AI w kilka sekund
          </p>
        </div>
        
        {step !== 'insight' && (
          <Button
            variant="outline"
            onClick={() => {
              setStep('insight')
              setProposal(null)
              setGeneratedImage(null)
              setFeedback('')
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Nowy Mem
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {['Insight', 'Propozycja', 'Generuj', 'Podgląd'].map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                ['insight', 'proposal', 'generate', 'preview'].indexOf(step) >= index
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {index + 1}
            </div>
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {index < 3 && <div className="w-8 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Insight Selection */}
      {step === 'insight' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">1. Wybierz Insight</h2>
          
          <InsightSelector
            insights={insights}
            selectedInsight={selectedInsight}
            onSelectInsight={setSelectedInsight}
            customInsight={customInsight}
            onCustomInsightChange={setCustomInsight}
          />

          <Button
            onClick={handleGenerateProposal}
            disabled={!selectedInsight && !customInsight}
            className="mt-6"
            size="lg"
          >
            {loadingProposal ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generuję propozycję...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Wygeneruj Propozycję Mema
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Step 2: Proposal Review & Feedback */}
      {step === 'proposal' && proposal && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proposal */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">💡 Propozycja AI</h2>
              {feedbackHistory.length > 0 && (
                <Badge variant="secondary">Wersja {feedbackHistory.length + 1}</Badge>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <Label className="text-xs text-gray-500">TOP TEXT</Label>
                <p className="text-lg font-semibold mt-1">{proposal.topText}</p>
              </div>

              {proposal.middleText && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-xs text-gray-500">MIDDLE TEXT</Label>
                  <p className="text-lg font-semibold mt-1">{proposal.middleText}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <Label className="text-xs text-gray-500">BOTTOM TEXT</Label>
                <p className="text-lg font-semibold mt-1">{proposal.bottomText}</p>
              </div>

              {proposal.template && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <Label className="text-xs text-blue-700">SUGEROWANY TEMPLATE</Label>
                  <p className="text-sm font-medium mt-1">{proposal.template}</p>
                </div>
              )}

              {proposal.reasoning && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <Label className="text-xs text-purple-700">DLACZEGO TO ZADZIAŁA</Label>
                  <p className="text-sm mt-1">{proposal.reasoning}</p>
                </div>
              )}
            </div>

            {/* Feedback */}
            <div className="mt-6 space-y-3">
              <Label>💬 Feedback dla AI (opcjonalnie)</Label>
              <Textarea
                placeholder="np. 'nie śmieszne, bardziej zabawnie' lub 'zmień top text na coś mocniejszego'"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
              />
              <Button
                variant="outline"
                onClick={handleGenerateProposal}
                disabled={!feedback || loadingProposal}
                className="w-full"
              >
                {loadingProposal ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Regeneruj z Feedbackiem
              </Button>
            </div>
          </Card>

          {/* Engine Selection */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">🎨 Wybierz AI Engine</h2>

            <RadioGroup value={selectedEngine} onValueChange={setSelectedEngine}>
              <div className="space-y-3">
                {engines.map((engine) => (
                  <div
                    key={engine.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedEngine === engine.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedEngine(engine.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value={engine.id} id={engine.id} />
                        <div>
                          <Label htmlFor={engine.id} className="font-medium cursor-pointer">
                            {engine.name}
                            {engine.recommended && (
                              <Badge className="ml-2" variant="default">Polecany</Badge>
                            )}
                          </Label>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                            <div>
                              <span className="text-gray-500">Koszt:</span>
                              <span className="ml-1 font-medium">${engine.cost}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Jakość:</span>
                              <span className="ml-1 font-medium">{engine.quality}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Prędkość:</span>
                              <span className="ml-1 font-medium">{engine.speed}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>

            <Button
              onClick={handleGenerateMeme}
              disabled={generating}
              className="w-full mt-6"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generuję... (~30s)
                </>
              ) : (
                <>
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Generuj Mema
                </>
              )}
            </Button>
          </Card>
        </div>
      )}

      {/* Step 3: Preview & Download */}
      {step === 'preview' && generatedImage && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">✅ Mem Wygenerowany!</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview */}
            <div>
              <div className="bg-gray-100 rounded-lg p-4 aspect-square flex items-center justify-center">
                <img
                  src={generatedImage}
                  alt="Generated meme"
                  className="max-w-full max-h-full rounded"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Gotowe do publikacji! 🎉</h3>
                <p className="text-sm text-green-700">
                  Twój mem został wygenerowany. Możesz go teraz pobrać i opublikować.
                </p>
              </div>

              <Button
                onClick={() => window.open(generatedImage, '_blank')}
                className="w-full"
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                Pobierz PNG
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setStep('proposal')
                  setGeneratedImage(null)
                }}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generuj Ponownie
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setStep('insight')
                  setProposal(null)
                  setGeneratedImage(null)
                  setFeedback('')
                  setFeedbackHistory([])
                }}
                className="w-full"
              >
                Stwórz Nowy Mem
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
