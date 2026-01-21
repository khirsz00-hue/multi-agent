'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card } from '@/components/ui/card'
import { Loader2, Sparkles, Download, RefreshCw, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import Image from 'next/image'
import type { AudienceInsight } from '@/lib/types'

const MEME_TEMPLATES = [
  { id: 'drake', name: 'Drake', preview: '🙅‍♂️➡️🙋‍♂️' },
  { id: 'distracted_boyfriend', name: 'Distracted Boyfriend', preview: '👨👀👩' },
  { id: 'two_buttons', name: 'Two Buttons', preview: '😰🔴🔵' },
  { id: 'expanding_brain', name: 'Expanding Brain', preview: '🧠📈' },
  { id: 'is_this', name: 'Is This?', preview: '🦋❓' },
  { id: 'change_my_mind', name: 'Change My Mind', preview: '🪧💬' }
]

const AI_ENGINES = [
  { 
    id: 'dall-e-3', 
    name: 'DALL-E 3', 
    cost: 0.04, 
    quality: 'Najlepsza', 
    speed: 'Średnia',
    recommended: true,
    enabled: true,
    description: 'OpenAI - najlepsze tła, tekst nakładany przez Sharp'
  },
  { 
    id: 'google-imagen', 
    name: 'Google Imagen 3', 
    cost: 0.02, 
    quality: 'Wysoka', 
    speed: 'Szybka',
    recommended: false,
    enabled: true,  // ENABLE THIS
    description: 'Google AI - szybsze, tańsze, tekst nakładany przez Sharp'
  },
  { 
    id: 'replicate', 
    name: 'Replicate SDXL', 
    cost: 0.01, 
    quality: 'Średnia', 
    speed: 'Szybka',
    recommended: false,
    enabled: false
  }
]

interface MemeCreatorWizardProps {
  insights?: AudienceInsight[]
  spaceId?: string
}

export function MemeCreatorWizard({ insights = [], spaceId }: MemeCreatorWizardProps) {
  const { showToast } = useToast()
  const [step, setStep] = useState<'input' | 'suggestion' | 'customize' | 'generate' | 'result'>('input')
  
  // Step 1: Input
  const [insightText, setInsightText] = useState('')
  
  // Step 2: Suggestion
  const [suggestion, setSuggestion] = useState<any>(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)
  const [feedback, setFeedback] = useState('')
  
  // Step 3: Customize
  const [topText, setTopText] = useState('')
  const [bottomText, setBottomText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('drake')
  const [selectedEngine, setSelectedEngine] = useState('dall-e-3')
  
  // Step 4: Generate
  const [generating, setGenerating] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState('')
  
  const handleGetSuggestion = async () => {
    setLoadingSuggestion(true)
    try {
      const res = await fetch('/api/meme/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightText })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate suggestion')
      }
      
      setSuggestion(data.suggestion)
      setTopText(data.suggestion.top_text)
      setBottomText(data.suggestion.bottom_text)
      setSelectedTemplate(data.suggestion.template)
      setStep('suggestion')
      showToast('Sugestia mema wygenerowana pomyślnie!', 'success')
    } catch (error: any) {
      showToast(error.message || 'Błąd generowania sugestii', 'error')
    } finally {
      setLoadingSuggestion(false)
    }
  }
  
  const handleRegenerate = async () => {
    if (!feedback.trim()) {
      showToast('Podaj feedback przed regeneracją', 'error')
      return
    }
    
    setLoadingSuggestion(true)
    try {
      const res = await fetch('/api/meme/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          insightText, 
          feedback,
          previousSuggestion: suggestion 
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to regenerate')
      }
      
      setSuggestion(data.suggestion)
      setTopText(data.suggestion.top_text)
      setBottomText(data.suggestion.bottom_text)
      setSelectedTemplate(data.suggestion.template)
      setFeedback('')
      showToast('Mem zregenerowany na podstawie feedbacku!', 'success')
    } catch (error: any) {
      showToast(error.message || 'Błąd regeneracji mema', 'error')
    } finally {
      setLoadingSuggestion(false)
    }
  }
  
  const handleGenerate = async () => {
    setGenerating(true)
    setStep('generate')
    
    try {
      const res = await fetch('/api/meme/generate-image', {  // NEW ENDPOINT
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topText,
          bottomText,
          template: selectedTemplate,
          engine: selectedEngine
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate meme')
      }
      
      setGeneratedImageUrl(data.imageUrl)
      setStep('result')
      showToast('Mem wygenerowany pomyślnie!', 'success')
    } catch (error: any) {
      showToast(error.message || 'Błąd generowania obrazu mema', 'error')
      setStep('customize')
    } finally {
      setGenerating(false)
    }
  }
  
  // STEP 1: Input
  if (step === 'input') {
    return (
      <Card className="p-8">
        <div className="space-y-6">
          <div>
            <Label className="text-lg font-semibold mb-2 block">
              1️⃣ Wybierz insight z Notion lub wpisz własny
            </Label>
            
            {/* NEW: Insights Selector */}
            {insights && insights.length > 0 && (
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">
                  💡 Insights z Notion:
                </Label>
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {insights.map((insight) => (
                    <button
                      key={insight.id}
                      onClick={() => setInsightText(insight.pain_point)}
                      className={`text-left p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors ${
                        insightText === insight.pain_point
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm flex-1">{insight.pain_point}</p>
                        <div className="flex gap-1 flex-shrink-0">
                          {insight.category && (
                            <Badge variant="outline" className="text-xs">
                              {insight.category}
                            </Badge>
                          )}
                          {insight.frequency && (
                            <Badge variant="secondary" className="text-xs">
                              {insight.frequency}x
                            </Badge>
                          )}
                        </div>
                      </div>
                      {insight.sentiment && (
                        <p className="text-xs text-gray-500 mt-1">
                          Sentyment: {insight.sentiment}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
                <div className="text-center my-3 text-sm text-gray-500">
                  — lub —
                </div>
              </div>
            )}
            
            {/* Existing Textarea */}
            <Textarea
              placeholder="Np: 'POV: Próbujesz zarządzać wieloma zadaniami ale ADHD ma inne plany...'"
              value={insightText}
              onChange={(e) => setInsightText(e.target.value)}
              rows={6}
              className="text-base"
            />
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleGetSuggestion}
              disabled={!insightText.trim() || loadingSuggestion}
              className="flex-1"
              size="lg"
            >
              {loadingSuggestion ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generuję sugestię...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generuj Sugestię AI
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    )
  }
  
  // STEP 2: Suggestion
  if (step === 'suggestion') {
    return (
      <div className="space-y-6">
        {/* AI Suggestion */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="bg-blue-600 rounded-lg p-3">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-3">💡 AI Sugestia:</h3>
              
              <div className="bg-white rounded-lg p-4 mb-4">
                <div className="text-center mb-3">
                  <Badge className="mb-2">{MEME_TEMPLATES.find(t => t.id === suggestion.template)?.name}</Badge>
                  <div className="text-4xl mb-2">
                    {MEME_TEMPLATES.find(t => t.id === suggestion.template)?.preview}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="font-semibold">Top Text:</span>
                    <p className="text-lg mt-1">{suggestion.top_text}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="font-semibold">Bottom Text:</span>
                    <p className="text-lg mt-1">{suggestion.bottom_text}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-700 mb-4">
                <strong>Dlaczego to działa:</strong> {suggestion.reasoning}
              </div>
              
              <div className="flex gap-4 text-sm">
                <div>
                  <Badge variant="outline">Humor: {suggestion.humor_score}%</Badge>
                </div>
                <div>
                  <Badge variant="outline">Relatable: {suggestion.relatability_score}%</Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Feedback */}
        <Card className="p-6">
          <Label className="text-base font-semibold mb-2 block">
            💬 Nie podoba Ci się? Daj feedback:
          </Label>
          <Textarea
            placeholder="Np: 'W ogóle mnie to nie śmieszy, spróbuj bardziej zabawnie' lub 'Zmień template na expanding brain'"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
          />
          
          <div className="flex gap-3 mt-4">
            <Button 
              onClick={handleRegenerate}
              disabled={loadingSuggestion}
              variant="outline"
            >
              {loadingSuggestion ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Regeneruję...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regeneruj z Feedbackiem
                </>
              )}
            </Button>
            
            <Button onClick={() => setStep('customize')} className="flex-1">
              ✅ Akceptuję - Przejdź Dalej
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  // STEP 3: Customize
  if (step === 'customize') {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">✏️ Dostosuj Tekst:</h3>
          
          <div className="space-y-4">
            <div>
              <Label>Top Text</Label>
              <Textarea
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                rows={2}
                maxLength={60}
              />
              <p className="text-xs text-gray-500 mt-1">{topText.length}/60</p>
            </div>
            
            <div>
              <Label>Bottom Text</Label>
              <Textarea
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                rows={2}
                maxLength={60}
              />
              <p className="text-xs text-gray-500 mt-1">{bottomText.length}/60</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">🎨 Wybierz Template:</h3>
          
          <div className="grid grid-cols-3 gap-3">
            {MEME_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  selectedTemplate === template.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-2">{template.preview}</div>
                <div className="text-sm font-medium">{template.name}</div>
              </button>
            ))}
          </div>
        </Card>
        
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">⚡ Wybierz AI Engine:</h3>
          
          <RadioGroup value={selectedEngine} onValueChange={setSelectedEngine}>
            <div className="space-y-3">
              {AI_ENGINES.filter(engine => engine.enabled).map((engine) => (
                <div 
                  key={engine.id}
                  className="flex items-center space-x-3 border rounded-lg p-4"
                >
                  <RadioGroupItem value={engine.id} id={engine.id} />
                  <Label htmlFor={engine.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {engine.name}
                          {engine.recommended && (
                            <Badge className="bg-green-600">Polecany</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          Jakość: {engine.quality} • Szybkość: {engine.speed}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        ${engine.cost.toFixed(2)}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </Card>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('suggestion')}>
            ← Wróć
          </Button>
          <Button onClick={handleGenerate} className="flex-1" size="lg">
            <Zap className="h-5 w-5 mr-2" />
            Generuj Mema!
          </Button>
        </div>
      </div>
    )
  }
  
  // STEP 4: Generating
  if (step === 'generate') {
    return (
      <Card className="p-12 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">🎨 Tworzę Twojego Mema...</h3>
        <p className="text-gray-600 mb-6">
          {selectedEngine === 'dall-e-3' && 'DALL-E 3 generuje obraz...'}
          {selectedEngine === 'google-imagen' && 'Google Imagen pracuje...'}
          {selectedEngine === 'replicate' && 'Replicate renderuje...'}
        </p>
        <div className="space-y-2 text-sm text-gray-600">
          <p>✅ Tekst przygotowany</p>
          <p>✅ Template wybrany</p>
          <p>⏳ Generowanie obrazu...</p>
        </div>
      </Card>
    )
  }
  
  // STEP 5: Result
  if (step === 'result') {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="text-2xl font-bold mb-4 text-center">
            🎉 Twój Mem Jest Gotowy!
          </h3>
          
          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            {generatedImageUrl && (
              <Image
                src={generatedImageUrl}
                alt="Generated meme"
                width={512}
                height={512}
                className="w-full h-auto rounded-lg"
              />
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => window.open(generatedImageUrl, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Pobierz
            </Button>
            <Button variant="outline" onClick={() => {
              setStep('input')
              setInsightText('')
              setSuggestion(null)
              setGeneratedImageUrl('')
            }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Nowy Mem
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  return null
}
