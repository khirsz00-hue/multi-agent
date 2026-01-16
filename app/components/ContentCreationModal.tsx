'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Copy, Check, Sparkles, ChevronLeft } from 'lucide-react'

interface ContentCreationModalProps {
  painPoint: any
  contentType: string
  onClose: () => void
}

export function ContentCreationModal({ 
  painPoint, 
  contentType, 
  onClose 
}: ContentCreationModalProps) {
  const [tone, setTone] = useState('empathetic')
  const [goal, setGoal] = useState('engagement')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingRecommendations, setLoadingRecommendations] = useState(true)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  
  // Load AI recommendations on mount
  useEffect(() => {
    loadRecommendations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  const loadRecommendations = async () => {
    try {
      const res = await fetch('/api/content/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ painPointId: painPoint.id })
      })
      const data = await res.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Failed to load recommendations:', error)
    } finally {
      setLoadingRecommendations(false)
    }
  }
  
  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          painPointId: painPoint.id,
          contentType,
          options: { tone, goal, additionalNotes }
        })
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Generation failed')
      }
      
      const data = await res.json()
      setGeneratedContent(data.draft)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCopy = () => {
    const textToCopy = formatContentForCopy(generatedContent)
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
    
    return text
  }
  
  const getContentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      reel: 'Instagram Reel / TikTok',
      meme: 'Meme',
      deep_post: 'Deep Post',
      engagement_post: 'Engagement Post',
      newsletter: 'Newsletter Section',
      thread: 'Twitter Thread'
    }
    return labels[type] || type
  }
  
  const currentRecommendation = recommendations.find(r => r.format === contentType)
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Create {getContentTypeLabel(contentType)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5">
          {/* Pain Point Preview */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Pain Point
            </p>
            <p className="text-sm font-medium text-gray-900">
              &quot;{painPoint.pain_point}&quot;
            </p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 bg-white/70 rounded">
                {painPoint.category}
              </span>
              <span className="text-xs px-2 py-0.5 bg-white/70 rounded">
                {painPoint.sentiment}
              </span>
            </div>
          </div>
          
          {/* AI Recommendation */}
          {loadingRecommendations && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading AI recommendations...
            </div>
          )}
          
          {!loadingRecommendations && currentRecommendation && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 mb-1">
                    AI Recommendation ({currentRecommendation.score}% match)
                  </p>
                  <p className="text-sm text-yellow-800">
                    {currentRecommendation.reasoning}
                  </p>
                  {currentRecommendation.hook_suggestion && (
                    <div className="mt-2 p-2 bg-white/50 rounded border border-yellow-200">
                      <p className="text-xs font-medium text-yellow-900 mb-1">
                        💡 Suggested Hook:
                      </p>
                      <p className="text-sm text-yellow-800 italic">
                        &quot;{currentRecommendation.hook_suggestion}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {!generatedContent ? (
            <>
              {/* Tone Selection */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">
                  🎭 Select Tone
                </Label>
                <RadioGroup value={tone} onValueChange={setTone} className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="humorous" id="humorous" />
                    <Label htmlFor="humorous" className="font-normal cursor-pointer flex-1">
                      <span className="font-medium">😄 Humorous</span>
                      <span className="text-xs text-gray-600 block">
                        Lighthearted, meme-like, relatable
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="empathetic" id="empathetic" />
                    <Label htmlFor="empathetic" className="font-normal cursor-pointer flex-1">
                      <span className="font-medium">🤝 Empathetic</span>
                      <span className="text-xs text-gray-600 block">
                        Understanding, supportive, validating
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="controversial" id="controversial" />
                    <Label htmlFor="controversial" className="font-normal cursor-pointer flex-1">
                      <span className="font-medium">🔥 Controversial</span>
                      <span className="text-xs text-gray-600 block">
                        Debate-starting, provocative, bold
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="educational" id="educational" />
                    <Label htmlFor="educational" className="font-normal cursor-pointer flex-1">
                      <span className="font-medium">📚 Educational</span>
                      <span className="text-xs text-gray-600 block">
                        Informative, actionable, insightful
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Goal Selection */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">
                  🎯 Content Goal
                </Label>
                <RadioGroup value={goal} onValueChange={setGoal} className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="viral" id="viral" />
                    <Label htmlFor="viral" className="font-normal cursor-pointer flex-1">
                      <span className="font-medium">🚀 Viral Reach</span>
                      <span className="text-xs text-gray-600 block">
                        Maximize shares and reach
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="engagement" id="engagement" />
                    <Label htmlFor="engagement" className="font-normal cursor-pointer flex-1">
                      <span className="font-medium">💬 Engagement</span>
                      <span className="text-xs text-gray-600 block">
                        Drive comments and discussion
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="education" id="education" />
                    <Label htmlFor="education" className="font-normal cursor-pointer flex-1">
                      <span className="font-medium">🎓 Education</span>
                      <span className="text-xs text-gray-600 block">
                        Provide value and insights
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Additional Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm font-semibold mb-2 block">
                  📝 Additional Instructions (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="E.g., Include a personal story, mention specific tools, avoid certain topics..."
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
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Generated Content Display */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-green-900">
                    ✅ Content Generated Successfully!
                  </p>
                </div>
                
                {/* Hook */}
                {generatedContent.hook && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                      🎬 Hook
                    </Label>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm leading-relaxed">{generatedContent.hook}</p>
                    </div>
                  </div>
                )}
                
                {/* Body */}
                {generatedContent.body && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                      📝 Body
                    </Label>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {generatedContent.body}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* CTA */}
                {generatedContent.cta && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                      🎯 Call to Action
                    </Label>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm leading-relaxed">{generatedContent.cta}</p>
                    </div>
                  </div>
                )}
                
                {/* Hashtags */}
                {generatedContent.hashtags?.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                      #️⃣ Hashtags
                    </Label>
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium">
                        {generatedContent.hashtags.join(' ')}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Visual Suggestions */}
                {generatedContent.visual_suggestions && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                      🎨 Visual Suggestions
                    </Label>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <pre className="text-xs whitespace-pre-wrap text-purple-900 font-mono">
                        {JSON.stringify(generatedContent.visual_suggestions, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={handleCopy} 
                    variant="outline" 
                    className="flex-1 h-11"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={onClose}
                    className="flex-1 h-11"
                  >
                    Done
                  </Button>
                </div>
                
                <Button 
                  variant="ghost" 
                  onClick={() => setGeneratedContent(null)}
                  className="w-full"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Generate Different Version
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
