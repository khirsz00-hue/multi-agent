'use client'

import { useState, useEffect } from 'react'
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
import { Loader2, Copy, Check, Sparkles, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ContentCreationModalProps {
  painPoint: {
    id: string
    pain_point: string
    category: string
    frequency: number
    sentiment: string
    raw_content?: string
  }
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
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const contentTypeLabels: Record<string, string> = {
    reel: 'Instagram Reel/TikTok',
    meme: 'Meme',
    deep_post: 'Deep Post',
    engagement_post: 'Engagement Post',
    newsletter: 'Newsletter Section',
    thread: 'Twitter Thread'
  }
  
  // Load AI recommendations
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
      
      if (!res.ok) throw new Error('Failed to load recommendations')
      
      const data = await res.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Failed to load recommendations:', error)
    }
  }
  
  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    
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
        const errorData = await res.json()
        throw new Error(errorData.error || 'Generation failed')
      }
      
      const data = await res.json()
      setGeneratedContent(data.draft)
    } catch (error: any) {
      setError(error.message)
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
    
    return text.trim()
  }
  
  const currentRecommendation = recommendations.find(r => r.format === contentType)
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create {contentTypeLabels[contentType] || contentType}
          </DialogTitle>
          <DialogDescription>
            Generate AI-powered content from this pain point
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Pain Point Preview */}
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-sm font-medium text-gray-700">Pain Point:</p>
            <p className="text-sm mt-1 text-gray-900">&quot;{painPoint.pain_point}&quot;</p>
            <div className="flex gap-2 mt-2 text-xs text-gray-600">
              <span className="px-2 py-0.5 bg-white rounded border">{painPoint.category}</span>
              <span>Frequency: {painPoint.frequency}</span>
              <span className="capitalize">{painPoint.sentiment}</span>
            </div>
          </div>
          
          {/* AI Recommendation */}
          {currentRecommendation && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900">
                    AI Recommendation ({currentRecommendation.score}% match)
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {currentRecommendation.reasoning}
                  </p>
                  {currentRecommendation.hook_suggestion && (
                    <p className="text-sm text-blue-600 mt-2 italic">
                      💡 Suggested hook: &quot;{currentRecommendation.hook_suggestion}&quot;
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
          
          {!generatedContent && (
            <>
              {/* Tone Selection */}
              <div>
                <Label className="text-sm font-medium mb-2 block">🎭 Tone</Label>
                <RadioGroup value={tone} onValueChange={setTone}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="humorous" id="humorous" />
                    <Label htmlFor="humorous" className="font-normal cursor-pointer">
                      😄 Humorous (mem-like, lighthearted)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="empathetic" id="empathetic" />
                    <Label htmlFor="empathetic" className="font-normal cursor-pointer">
                      🤝 Empathetic (understanding, supportive)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="controversial" id="controversial" />
                    <Label htmlFor="controversial" className="font-normal cursor-pointer">
                      🔥 Controversial (debate-starting, provocative)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="educational" id="educational" />
                    <Label htmlFor="educational" className="font-normal cursor-pointer">
                      📚 Educational (informative, actionable)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Goal Selection */}
              <div>
                <Label className="text-sm font-medium mb-2 block">🎯 Goal</Label>
                <RadioGroup value={goal} onValueChange={setGoal}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="viral" id="viral" />
                    <Label htmlFor="viral" className="font-normal cursor-pointer">
                      🚀 Viral Reach (maximize shares and reach)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="engagement" id="engagement" />
                    <Label htmlFor="engagement" className="font-normal cursor-pointer">
                      💬 Engagement (drive comments and discussion)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="education" id="education" />
                    <Label htmlFor="education" className="font-normal cursor-pointer">
                      🎓 Education (provide value and insights)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Additional Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
                  📝 Additional Instructions (optional)
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
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>
            </>
          )}
          
          {/* Generated Content Preview */}
          {generatedContent && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-3 rounded">
                <p className="text-sm font-medium text-green-900">
                  ✅ Content Generated Successfully!
                </p>
              </div>
              
              {/* Hook */}
              {generatedContent.hook && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">
                    🎬 Hook
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
                    📝 Body
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
                    🎯 Call to Action
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
                    #️⃣ Hashtags
                  </Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    <p className="text-sm text-blue-600">
                      {generatedContent.hashtags.join(' ')}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Visual Suggestions */}
              {generatedContent.visual_suggestions && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">
                    🎨 Visual Suggestions
                  </Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    <pre className="text-xs whitespace-pre-wrap text-gray-700 font-mono">
                      {JSON.stringify(generatedContent.visual_suggestions, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleCopy} 
                  variant="outline" 
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
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
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                onClick={() => setGeneratedContent(null)}
                className="w-full"
                size="sm"
              >
                ← Generate Different Version
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
