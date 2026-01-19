'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Copy, Check, Sparkles, AlertCircle, Save, Clock, Edit, ChevronRight, History, Edit3 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { ScenarioEditor } from './ScenarioEditor'
import { type ReelScenario } from '@/lib/reel-validator'
import { EngineSelector, type Engine, type ImageEngine, type VideoEngine } from './EngineSelector'
import { VideoGenerationModal } from './VideoGenerationModal'
import { GeneratorMemow } from '@/components/GeneratorMemow'

interface ContentCreationModalProps {
  painPoint: {
    id: string
    pain_point: string
    category?: string
    frequency: number
    sentiment?: string
    raw_content?: string
  }
  contentType: string
  onClose: () => void
}

// Flow steps for different content types
const CONTENT_FLOWS = {
  meme: ['generate', 'preview', 'refine', 'finalize'],
  reel: ['draft', 'edit', 'finalize'],
  newsletter: ['generate', 'sections', 'versions', 'finalize'],
  deep_post: ['generate', 'sections', 'versions', 'finalize'],
  engagement_post: ['generate', 'quick_edit', 'finalize'],
  thread: ['generate', 'quick_edit', 'finalize']
}

export function ContentCreationModal({ 
  painPoint, 
  contentType, 
  onClose 
}: ContentCreationModalProps) {
  // Basic state
  const [tone, setTone] = useState('empathetic')
  const [goal, setGoal] = useState('engagement')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Flow state management
  const [currentStep, setCurrentStep] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [versions, setVersions] = useState<any[]>([])
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
  
  // Editable content state
  const [editedHook, setEditedHook] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [editedCta, setEditedCta] = useState('')
  const [editedHashtags, setEditedHashtags] = useState('')
  // Two-stage reel flow state
  const [reelStage, setReelStage] = useState<'config' | 'editing' | 'finalized'>('config')
  const [draftScenario, setDraftScenario] = useState<any>(null)
  const [validation, setValidation] = useState<any>(null)
  const [qualityScore, setQualityScore] = useState(0)
  
  // Engine selection state
  const [selectedEngine, setSelectedEngine] = useState<Engine>('dall-e-3')
  const [recommendedEngine, setRecommendedEngine] = useState<Engine | undefined>(undefined)
  const [showEngineSelector, setShowEngineSelector] = useState(false)
  
  // Video generation state
  const [videoJobId, setVideoJobId] = useState<string | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  
  // Meme image generation state
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  
  const contentTypeLabels: Record<string, string> = {
    reel: 'Instagram Reel/TikTok',
    meme: 'Meme',
    deep_post: 'Deep Post',
    engagement_post: 'Engagement Post',
    newsletter: 'Newsletter Section',
    thread: 'Twitter Thread'
  }
  
  // Determine if content type needs image or video engine
  const needsImageEngine = ['meme', 'deep_post', 'engagement_post'].includes(contentType)
  const needsVideoEngine = ['reel'].includes(contentType)
  const needsOptionalImageEngine = ['newsletter'].includes(contentType)
  
  const flowSteps = CONTENT_FLOWS[contentType as keyof typeof CONTENT_FLOWS] || ['generate', 'finalize']
  const totalSteps = flowSteps.length
  const progress = ((currentStep + 1) / totalSteps) * 100
  
  // Auto-save functionality
  const saveDraft = useCallback(async (showSuccessMessage = true) => {
    setSaving(true)
    setError(null)
    
    try {
      const currentContent = editMode ? {
        hook: editedHook,
        body: editedBody,
        cta: editedCta,
        hashtags: editedHashtags.split(' ').filter(h => h.trim()),
        visual_suggestions: generatedContent?.visual_suggestions
      } : generatedContent
      
      const res = await fetch('/api/content/drafts', {
        method: draftId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draftId,
          painPointId: painPoint.id,
          contentType,
          content: currentContent,
          tone,
          goal,
          additionalNotes
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save draft')
      }
      
      const data = await res.json()
      setDraftId(data.draft.id)
      
      if (showSuccessMessage) {
        // Show success toast or message
        console.log('Draft saved successfully')
      }
      
      // Reload versions
      await loadVersions(data.draft.id)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }, [editMode, editedHook, editedBody, editedCta, editedHashtags, generatedContent, draftId, painPoint.id, contentType, tone, goal, additionalNotes])
  
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }
    
    const timer = setTimeout(() => {
      // Auto-save when there's content (either generatedContent or in edit mode)
      if ((generatedContent || editMode) && draftId) {
        saveDraft(false)
      }
    }, 3000) // Auto-save after 3 seconds of inactivity
    
    setAutoSaveTimer(timer)
  }, [generatedContent, editMode, draftId, autoSaveTimer, saveDraft])
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [autoSaveTimer])
  
  // Update edited content when generatedContent changes
  useEffect(() => {
    if (generatedContent) {
      setEditedHook(generatedContent.hook || '')
      setEditedBody(generatedContent.body || '')
      setEditedCta(generatedContent.cta || '')
      setEditedHashtags(generatedContent.hashtags?.join(' ') || '')
    }
  }, [generatedContent])
  
  // Load AI recommendations
  useEffect(() => {
    loadRecommendations()
    // Get engine recommendation based on content type
    getEngineRecommendation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  const loadRecommendations = async () => {
    try {
      const res = await fetch('/api/content/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ painPointId: painPoint.id })
      })
      
      if (!res.ok) throw new Error('Failed to load recommendations')
      
      const data = await res.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Failed to load recommendations:', error)
    }
  }
  
  const loadVersions = async (id: string) => {
    try {
      const res = await fetch(`/api/content/drafts/${id}/versions`)
      
      if (!res.ok) return
      
      const data = await res.json()
      setVersions(data.versions || [])
    } catch (error) {
      console.error('Failed to load versions:', error)
    }
  }
  
  const getEngineRecommendation = async () => {
    try {
      // Set default engine based on content type
      if (needsImageEngine) {
        setSelectedEngine('dall-e-3')
        setRecommendedEngine('dall-e-3')
      } else if (needsVideoEngine) {
        // Default to remotion for video
        setSelectedEngine('remotion')
        setRecommendedEngine('remotion')
        // Could call video recommendation API here if we have a draft
      } else if (needsOptionalImageEngine) {
        setSelectedEngine('dall-e-3')
        setRecommendedEngine('dall-e-3')
      }
    } catch (error) {
      console.error('Failed to get engine recommendation:', error)
    }
  }
  
  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Build common options
      const generationOptions = { 
        tone, 
        goal, 
        additionalNotes, 
        engine: selectedEngine 
      }
      
      // For reels, use two-stage generation
      if (contentType === 'reel') {
        const res = await fetch('/api/content/draft-reel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            painPointId: painPoint.id,
            options: generationOptions
          })
        })
        
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Draft generation failed')
        }
        
        const data = await res.json()
        setDraftScenario(data.draft)
        setValidation(data.validation)
        setQualityScore(data.qualityScore)
        setReelStage('editing')
      } else {
        // For other content types, use unified generation
        const res = await fetch('/api/content/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            painPointId: painPoint.id,
            contentType,
            options: generationOptions
          })
        })
        
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Generation failed')
        }
        
        const data = await res.json()
        
        // Check if this is async video generation
        if (data.jobId && needsVideoEngine) {
          setVideoJobId(data.jobId)
          setShowVideoModal(true)
        } else {
          setGeneratedContent(data.draft)
        }
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const handleUpdateScenario = async (updatedScenario: ReelScenario, changedFields: any) => {
    if (!draftScenario?.id) return
    
    const res = await fetch(`/api/content/draft-reel/${draftScenario.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updatedScenario, changedFields })
    })
    
    if (!res.ok) {
      throw new Error('Failed to update scenario')
    }
    
    const data = await res.json()
    setDraftScenario(data.draft)
    setValidation(data.validation)
    setQualityScore(data.qualityScore)
  }
  
  const handleFinalizeReel = async () => {
    if (!draftScenario?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/content/finalize-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draftScenario.id })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Finalization failed')
      }
      
      const data = await res.json()
      setGeneratedContent(data.draft)
      
      // Move to next step based on content type
      if (currentStep === 0) {
        setCurrentStep(1)
      }
      
      // Auto-save the draft
      setTimeout(() => saveDraft(false), 500)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRegenerate = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          painPointId: painPoint.id,
          contentType,
          options: { 
            tone, 
            goal, 
            additionalNotes,
            regenerate: true,
            previousVersion: generatedContent
          }
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Regeneration failed')
      }
      
      const data = await res.json()
      setGeneratedContent(data.draft)
      
      // Save as new version
      setTimeout(() => saveDraft(false), 500)
      setGeneratedContent(data.finalDraft)
      setReelStage('finalized')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCopy = () => {
    const textToCopy = formatContentForCopy(editMode ? {
      hook: editedHook,
      body: editedBody,
      cta: editedCta,
      hashtags: editedHashtags.split(' ').filter(h => h.trim())
    } : generatedContent)
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const formatContentForCopy = (content: any) => {
    if (!content) return ''
    
    let text = ''
    if (content.hook) text += `${content.hook}\n\n`
    if (content.body) text += `${content.body}\n\n`
    if (content.cta) text += `${content.cta}\n\n`
    if (content.hashtags?.length) text += content.hashtags.join(' ')
    
    return text.trim()
  }
  
  const handleNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
      
      // Auto-save on step change
      if (generatedContent) {
        saveDraft(false)
      }
    }
  }
  
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handlePublish = async () => {
    if (!draftId) {
      await saveDraft(true)
    }
    
    // Mark as published
    try {
      await fetch(`/api/content/drafts/${draftId}/publish`, {
        method: 'POST'
      })
      
      // Close modal after successful publish
      onClose()
    } catch (error) {
      console.error('Failed to publish:', error)
    }
  }
  
  const toggleEditMode = () => {
    if (editMode) {
      // Exiting edit mode - save changes
      setGeneratedContent({
        ...generatedContent,
        hook: editedHook,
        body: editedBody,
        cta: editedCta,
        hashtags: editedHashtags.split(' ').filter(h => h.trim())
      })
      scheduleAutoSave()
    }
    setEditMode(!editMode)
  }
  
  const handleVideoComplete = (videoUrl: string) => {
    setVideoUrl(videoUrl)
    setShowVideoModal(false)
    // Fetch the completed content draft
    if (draftId) {
      // Reload the draft to get the video URL
      fetch(`/api/content/drafts/${draftId}`)
        .then(res => res.json())
        .then(data => {
          if (data.draft) {
            setGeneratedContent(data.draft)
          }
        })
        .catch(err => console.error('Failed to reload draft:', err))
    }
  }
  
  const handleVideoError = (error: string) => {
    setError(error)
    setShowVideoModal(false)
    setVideoJobId(null)
  }
  
  const getStepLabel = (step: string) => {
    const labels: Record<string, string> = {
      generate: 'Generate',
      preview: 'Preview',
      refine: 'Refine',
      draft: 'Draft Scenario',
      edit: 'Edit',
      sections: 'Edit Sections',
      versions: 'Versions',
      quick_edit: 'Quick Edit',
      finalize: 'Finalize'
    }
    return labels[step] || step
  }
  
  const currentRecommendation = recommendations.find(r => r.format === contentType)
  const currentStepName = flowSteps[currentStep]
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                Create {contentTypeLabels[contentType] || contentType}
              </DialogTitle>
              <DialogDescription>
                Generate AI-powered content from this pain point
              </DialogDescription>
            </div>
            {versions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
              >
                <History className="h-4 w-4 mr-1" />
                Versions ({versions.length})
              </Button>
            )}
          </div>
        </DialogHeader>
        
        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Step {currentStep + 1} of {totalSteps}: {getStepLabel(currentStepName)}
            </span>
            <span className="text-gray-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {flowSteps.map((step, idx) => (
              <div key={step} className="flex items-center">
                <div
                  className={`px-2 py-1 rounded text-xs ${
                    idx === currentStep
                      ? 'bg-blue-500 text-white'
                      : idx < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {getStepLabel(step)}
                </div>
                {idx < flowSteps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Content Area */}
          <div className={`${showVersionHistory ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-4`}>
          {/* Pain Point Preview */}
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-sm font-medium text-gray-700">Pain Point:</p>
            <p className="text-sm mt-1 text-gray-900">&quot;{painPoint.pain_point}&quot;</p>
            <div className="flex gap-2 mt-2 text-xs text-gray-600">
              {painPoint.category && (
                <span className="px-2 py-0.5 bg-white rounded border">{painPoint.category}</span>
              )}
              <span>Frequency: {painPoint.frequency}</span>
              {painPoint.sentiment && (
                <span className="capitalize">{painPoint.sentiment}</span>
              )}
            </div>
          </div>
          
          {/* AI Recommendation */}
          {currentRecommendation && currentStep === 0 && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900">
                    Rekomendacja AI ({currentRecommendation.score}% dopasowania)
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {currentRecommendation.reasoning}
                  </p>
                  {currentRecommendation.hook_suggestion && (
                    <p className="text-sm text-blue-600 mt-2 italic">
                      💡 Sugerowany haczyk: &quot;{currentRecommendation.hook_suggestion}&quot;
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Two-stage reel editing flow */}
          {contentType === 'reel' && reelStage === 'editing' && draftScenario && (
            <>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-3 rounded">
                <div className="flex items-start gap-2">
                  <Edit3 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Draft Scenario Generated!
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Review and edit the scenario below before finalizing. Make any changes you want, then click &ldquo;Finalize&rdquo; to generate the optimized reel.
                    </p>
                  </div>
                </div>
              </div>
              
              <ScenarioEditor
                draftId={draftScenario.id}
                initialScenario={draftScenario.draft_scenario}
                validation={validation}
                qualityScore={qualityScore}
                onUpdate={handleUpdateScenario}
                onFinalize={handleFinalizeReel}
                loading={loading}
              />
            </>
          )}
          
          {/* Configuration stage (for reels before draft or other content types) */}
          {(!generatedContent && reelStage === 'config') && (
            <>
              {/* Tone Selection */}
              <div>
                <Label className="text-sm font-medium mb-2 block">🎭 Ton</Label>
                <RadioGroup value={tone} onValueChange={setTone}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="humorous" id="humorous" />
                    <Label htmlFor="humorous" className="font-normal cursor-pointer">
                      😄 Humorystyczny (memowy, lekkostrawny)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="empathetic" id="empathetic" />
                    <Label htmlFor="empathetic" className="font-normal cursor-pointer">
                      🤝 Empatyczny (wyrozumiały, wspierający)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="controversial" id="controversial" />
                    <Label htmlFor="controversial" className="font-normal cursor-pointer">
                      🔥 Kontrowersyjny (debatowy, prowokacyjny)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="educational" id="educational" />
                    <Label htmlFor="educational" className="font-normal cursor-pointer">
                      📚 Edukacyjny (informatywny, praktyczny)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Goal Selection */}
              <div>
                <Label className="text-sm font-medium mb-2 block">🎯 Cel</Label>
                <RadioGroup value={goal} onValueChange={setGoal}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="viral" id="viral" />
                    <Label htmlFor="viral" className="font-normal cursor-pointer">
                      🚀 Zasięg wiralny (maksymalizuj udziały i zasięg)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="engagement" id="engagement" />
                    <Label htmlFor="engagement" className="font-normal cursor-pointer">
                      💬 Zaangażowanie (pobudzaj komentarze i dyskusje)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="education" id="education" />
                    <Label htmlFor="education" className="font-normal cursor-pointer">
                      🎓 Edukacja (zapewnij wartość i spostrzeżenia)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Engine Selection - Show for content types that need it */}
              {(needsImageEngine || needsVideoEngine || needsOptionalImageEngine) && (
                <EngineSelector
                  contentType={needsVideoEngine ? 'video' : 'image'}
                  selectedEngine={selectedEngine}
                  recommendedEngine={recommendedEngine}
                  onEngineChange={(engine) => setSelectedEngine(engine)}
                  showRecommendation={true}
                />
              )}
              
              {/* Additional Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
                  📝 Dodatkowe instrukcje (opcjonalnie)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Np. Załącz osobistą historię, wspomnij konkretne narzędzia, unikaj określonych tematów..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              
              {/* Generate Button */}
              <Button 
                onClick={handleGenerate} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generowanie treści...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generuj treść
                  </>
                )}
              </Button>
            </>
          )}
          
          {/* Generated Content Preview (for non-reel content or finalized reels) */}
          {generatedContent && reelStage !== 'editing' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-3 rounded">
                <p className="text-sm font-medium text-green-900">
                  ✅ Treść wygenerowana pomyślnie!
                </p>
              </div>
              
              {/* Hook */}
              {generatedContent.hook && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">
                    🎬 Haczyk
                  </Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    <p className="text-sm text-gray-900">{generatedContent.hook}</p>
                  </div>
                </div>
              )}
              
              {/* Body */}
              {generatedContent.body && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">
                    📝 Treść
                  </Label>
                  <div className="p-3 bg-gray-50 rounded border max-h-64 overflow-y-auto">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {generatedContent.body}
                    </p>
                  </div>
                </div>
              )}
              
              {/* CTA */}
              {generatedContent.cta && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">
                    🎯 Wezwanie do działania
                  </Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    <p className="text-sm text-gray-900">{generatedContent.cta}</p>
                  </div>
                </div>
              )}
              
              {/* Hashtags */}
              {generatedContent.hashtags?.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">
                    #️⃣ Hasztagi
                  </Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    <p className="text-sm text-blue-600">
                      {generatedContent.hashtags.join(' ')}
                    </p>
                  </div>
                  
                </div>
              )}
            </div>
          )}
          
          {/* Video Generation Progress */}
              
              {/* Visual Suggestions */}
              {generatedContent.visual_suggestions && (
                <div>
          {/* Visual Suggestions */}
          {generatedContent.visual_suggestions && (
            <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">
                    🎨 Sugestie wizualne
                  </Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    <pre className="text-xs whitespace-pre-wrap text-gray-700 font-mono">
                      {JSON.stringify(generatedContent.visual_suggestions, null, 2)}
                    </pre>
                  </div>
                  
                  <GeneratorMemow
                    topText={generatedContent.meme_top_text || ''}
                    bottomText={generatedContent.meme_bottom_text || ''}
                    draftId={draftId || undefined}
                    onSuccess={(url) => {
                      setImageUrl(url)
                      // Optionally: show success message
                    }}
                  />
                  
                  {imageUrl && (
                    <div>
                      <h3 className="font-semibold mb-2">✅ Wygenerowany Mem:</h3>
                      <div className="relative w-full aspect-square">
                        <img 
                          src={imageUrl} 
                          alt="Wygenerowany mem" 
                          className="w-full h-full rounded-lg border-2 border-green-500 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {currentStep > 0 && (
                  <Button
                    onClick={handlePrevStep}
                    variant="outline"
                    size="sm"
                  >
                    ← Previous
                  </Button>
                )}
                
                <Button 
                  onClick={handleCopy} 
                  variant="outline" 
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Skopiowano!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopiuj do schowka
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={() => saveDraft(true)}
                  variant="outline"
                  disabled={saving}
                >
                  Gotowe
                </Button>
                
                {currentStep < totalSteps - 1 ? (
                  <Button 
                    onClick={handleNextStep}
                    className="flex-1"
                  >
                    Next Step →
                  </Button>
                ) : (
                  <Button 
                    onClick={handlePublish}
                    className="flex-1"
                  >
                    Publish
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="flex-1"
                  size="sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setGeneratedContent(null)
                  setReelStage('config')
                  setDraftScenario(null)
                }}
                className="w-full"
                size="sm"
              >
                ← Generuj inną wersję
              </Button>
            </div>
          )}
        </div>
        
        {/* Version History Sidebar */}
        {showVersionHistory && versions.length > 0 && (
          <div className="lg:col-span-1 border-l pl-4">
            <h3 className="font-semibold text-sm mb-3">Version History</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {versions.map((version: any, idx: number) => (
                <div
                  key={version.id}
                  className="p-2 border rounded text-xs cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    setGeneratedContent(version.content)
                    setShowVersionHistory(false)
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Version {versions.length - idx}</span>
                    <span className="text-gray-500">
                      {new Date(version.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600 line-clamp-2">
                    {version.content?.hook || 'Untitled version'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </DialogContent>
      
      {/* Video Generation Modal */}
      {videoJobId && showVideoModal && (
        <VideoGenerationModal
          open={showVideoModal}
          jobId={videoJobId}
          estimatedTime={90} // Default 90 seconds, could be based on engine
          onComplete={handleVideoComplete}
          onError={handleVideoError}
          onClose={() => setShowVideoModal(false)}
        />
      )}
    </Dialog>
  )
}
