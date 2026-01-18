'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, Calendar, Loader2, Video, ImageIcon, FileText, Mail, Twitter, Sparkles, RefreshCw } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface ContentCreationModalProps {
  open: boolean
  onClose: () => void
  painPoint: any
}

export default function ContentCreationModal({ open, onClose, painPoint }: ContentCreationModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [selectedType, setSelectedType] = useState<string>('')
  const [tone, setTone] = useState('empathetic')
  const [goal, setGoal] = useState('engagement')
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  
  // Meme-specific state
  const [memeImage, setMemeImage] = useState<any>(null)
  const [memeVersions, setMemeVersions] = useState<any[]>([])
  const [refinementPrompt, setRefinementPrompt] = useState('')
  const [refining, setRefining] = useState(false)
  const [generatingMeme, setGeneratingMeme] = useState(false)
  const [refiningMeme, setRefiningMeme] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  const getRecommendations = async () => {
    if (!painPoint) return
    
    setLoadingRecommendations(true)
    try {
      const res = await fetch('/api/content/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ painPointId: painPoint.id })
      })
      
      if (!res.ok) throw new Error('Failed to get recommendations')
      
      const data = await res.json()
      setRecommendations(data.recommendations || [])
      if (data.recommendations?.[0]) {
        setSelectedType(data.recommendations[0].format)
      }
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoadingRecommendations(false)
    }
  }
  
  const generateContent = async () => {
    if (!painPoint || !selectedType) return
    
    setLoading(true)
    try {
      // Check if it's a meme - use different endpoint
      if (selectedType === 'meme') {
        const res = await fetch('/api/content/generate-meme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            painPointId: painPoint.id,
            options: { tone, goal }
          })
        })
        
        if (!res.ok) throw new Error('Failed to generate meme')
        
        const data = await res.json()
        setGeneratedContent(data.contentDraft)
        setMemeImage(data.memeImage)
        // Load all versions
        await loadMemeVersions(data.contentDraft.id)
      } else {
        const res = await fetch('/api/content/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            painPointId: painPoint.id,
            contentType: selectedType,
            options: { tone, goal }
          })
        })
        
        if (!res.ok) throw new Error('Failed to generate content')
        
        const data = await res.json()
        setGeneratedContent(data.draft)
      }
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const loadMemeVersions = async (contentDraftId: string) => {
    setLoadingVersions(true)
    try {
      const res = await fetch(`/api/content/meme-versions/${contentDraftId}`)
      if (!res.ok) throw new Error('Failed to load versions')
      
      const data = await res.json()
      setMemeVersions(data.versions || [])
    } catch (error: any) {
      console.error('Error loading versions:', error)
    } finally {
      setLoadingVersions(false)
    }
  }
  
  const refineMeme = async () => {
    if (!memeImage || !refinementPrompt.trim()) return
    
    setRefining(true)
    try {
      const res = await fetch(`/api/content/refine-meme/${memeImage.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refinementPrompt })
      })
      
      if (!res.ok) throw new Error('Failed to refine meme')
      
      const data = await res.json()
      setMemeImage(data.memeImage)
      setRefinementPrompt('')
      // Reload versions
      await loadMemeVersions(memeImage.content_draft_id)
      setSuccessMessage('Meme refined successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setGeneratedContent(data.draft)
      
      // If it's a meme, automatically generate the image
      if (selectedType === 'meme' && data.draft) {
        await generateMemeImage(data.draft.id)
      }
    } catch (error: any) {
      setSuccessMessage(`Error: ${error.message}`)
      setTimeout(() => setSuccessMessage(''), 5000)
    } finally {
      setRefining(false)
    }
  }
  
  const selectVersion = (version: any) => {
    setMemeImage(version)
  }
  
  const generateMemeImage = async (contentDraftId?: string) => {
    if (!painPoint) return
    
    setGeneratingMeme(true)
    try {
      const res = await fetch('/api/content/generate-meme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          painPointId: painPoint.id,
          contentDraftId: contentDraftId || generatedContent?.id
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to generate meme image')
      }
      
      const data = await res.json()
      
      setGeneratedContent(data.draft)
      setMemeImage(data.memeImage)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setGeneratingMeme(false)
    }
  }
  
  const refineMemeImage = async () => {
    if (!memeImage || !refinementPrompt.trim()) return
    
    setRefiningMeme(true)
    try {
      const res = await fetch('/api/content/refine-meme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memeImageId: memeImage.id,
          refinementPrompt: refinementPrompt.trim()
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to refine meme')
      }
      
      const data = await res.json()
      setMemeImage(data.memeImage)
      setRefinementPrompt('')
    } catch (error: any) {
      alert(error.message)
    } finally {
      setRefiningMeme(false)
    }
  }
  
  const copyToClipboard = () => {
    if (!generatedContent) return
    
    let text = ''
    if (generatedContent.hook) text += `${generatedContent.hook}\n\n`
    if (generatedContent.body) text += `${generatedContent.body}\n\n`
    if (generatedContent.cta) text += `${generatedContent.cta}\n\n`
    if (generatedContent.hashtags?.length) text += generatedContent.hashtags.join(' ')
    
    navigator.clipboard.writeText(text)
    alert('Content copied to clipboard!')
  }
  
  const getContentIcon = (type: string) => {
    const icons: Record<string, any> = {
      reel: Video,
      meme: ImageIcon,
      deep_post: FileText,
      engagement_post: FileText,
      newsletter: Mail,
      thread: Twitter
    }
    return icons[type] || FileText
  }
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Content</DialogTitle>
          <DialogDescription>
            Create engaging content based on audience pain point
          </DialogDescription>
        </DialogHeader>
        
        {painPoint && (
          <div className="space-y-4">
            {/* Pain Point Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{painPoint.category}</Badge>
                  <Badge variant="outline">{painPoint.sentiment}</Badge>
                </div>
                <p className="font-medium">{painPoint.pain_point}</p>
              </CardContent>
            </Card>
            
            {/* Recommendations */}
            {!generatedContent && (
              <>
                {recommendations.length === 0 ? (
                  <div className="text-center py-4">
                    <Button 
                      onClick={getRecommendations}
                      disabled={loadingRecommendations}
                    >
                      {loadingRecommendations ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Getting Recommendations...
                        </>
                      ) : (
                        'Get Content Format Recommendations'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Label>Recommended Content Formats</Label>
                    <div className="grid gap-2">
                      {recommendations.map((rec, idx) => {
                        const Icon = getContentIcon(rec.format)
                        return (
                          <Card 
                            key={idx}
                            className={`cursor-pointer transition ${
                              selectedType === rec.format ? 'border-blue-500 bg-blue-50' : ''
                            }`}
                            onClick={() => setSelectedType(rec.format)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Icon className="h-5 w-5 text-blue-600 mt-1" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium capitalize">
                                      {rec.format.replace('_', ' ')}
                                    </span>
                                    <Badge variant="secondary">{rec.score}%</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">{rec.reasoning}</p>
                                  <p className="text-xs text-gray-500 mt-1 italic">
                                    {`"${rec.hook_suggestion}"`}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                    
                    {/* Options */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tone</Label>
                        <Select value={tone} onValueChange={setTone}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="empathetic">Empathetic</SelectItem>
                            <SelectItem value="humorous">Humorous</SelectItem>
                            <SelectItem value="educational">Educational</SelectItem>
                            <SelectItem value="controversial">Controversial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Goal</Label>
                        <Select value={goal} onValueChange={setGoal}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="engagement">Engagement</SelectItem>
                            <SelectItem value="viral">Viral</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={generateContent}
                      disabled={loading || !selectedType}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Generate Content'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
            
            {/* Generated Content */}
            {generatedContent && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Generated Content</h3>
                  <Badge>{generatedContent.content_type}</Badge>
                </div>
                
                {/* Meme Image Section */}
                {selectedType === 'meme' && (
                  <div className="space-y-3">
                    {generatingMeme ? (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                          <p className="text-sm text-gray-600">Generating meme image...</p>
                        </CardContent>
                      </Card>
                    ) : memeImage ? (
                      <div className="space-y-3">
                        <Card>
                          <CardContent className="pt-4">
                            <div className="relative w-full aspect-square">
                              <Image
                                src={memeImage.image_url}
                                alt="Generated meme"
                                fill
                                className="rounded-lg object-cover"
                                unoptimized
                              />
                            </div>
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Format:</span>
                                <Badge variant="secondary">{memeImage.meme_format}</Badge>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Version:</span>
                                <Badge variant="outline">v{memeImage.version}</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Refinement Section */}
                        <Card>
                          <CardContent className="pt-4 space-y-3">
                            <Label>Refine Meme Image</Label>
                            <p className="text-xs text-gray-500">
                              Request changes like &quot;Add a dog&quot;, &quot;Change colors to blue&quot;, etc.
                            </p>
                            <Input
                              placeholder="e.g., Make it funnier, change background color..."
                              value={refinementPrompt}
                              onChange={(e) => setRefinementPrompt(e.target.value)}
                              disabled={refiningMeme}
                            />
                            <Button
                              onClick={refineMemeImage}
                              disabled={refiningMeme || !refinementPrompt.trim()}
                              variant="outline"
                              className="w-full"
                            >
                              {refiningMeme ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Refining...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Refine Image
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <Button
                            onClick={() => generateMemeImage()}
                            variant="outline"
                            className="w-full"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Meme Image
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
                
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    {generatedContent.hook && (
                      <div>
                        <Label className="text-xs text-gray-500">Hook</Label>
                        <p className="font-medium">{generatedContent.hook}</p>
                      </div>
                    )}
                    
                    {generatedContent.body && (
                      <div>
                        <Label className="text-xs text-gray-500">Body</Label>
                        <p className="whitespace-pre-wrap">{generatedContent.body}</p>
                      </div>
                    )}
                    
                    {generatedContent.cta && (
                      <div>
                        <Label className="text-xs text-gray-500">Call to Action</Label>
                        <p className="font-medium">{generatedContent.cta}</p>
                      </div>
                    )}
                    
                    {generatedContent.hashtags?.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-500">Hashtags</Label>
                        <p className="text-blue-600">{generatedContent.hashtags.join(' ')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Meme-specific content */}
                {generatedContent.content_type === 'meme' && memeImage && (
                  <div className="space-y-4">
                    {/* Meme Image Display */}
                    <Card>
                      <CardContent className="pt-4">
                        <Label className="text-xs text-gray-500 mb-2 block">Generated Meme Image</Label>
                        <div className="relative w-full aspect-square">
                          <Image 
                            src={memeImage.image_url} 
                            alt="Generated meme"
                            fill
                            className="rounded-lg border object-cover"
                          />
                          <Badge className="absolute top-2 right-2">
                            v{memeImage.version}
                          </Badge>
                        </div>
                        
                        {memeImage.top_text && memeImage.bottom_text && (
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <p className="text-sm">
                              <span className="font-medium">Top:</span> {memeImage.top_text}
                            </p>
                            <p className="text-sm mt-1">
                              <span className="font-medium">Bottom:</span> {memeImage.bottom_text}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Refinement Input */}
                    <div className="space-y-2">
                      <Label>Refine Meme</Label>
                      <Textarea
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        placeholder="e.g., 'Add a dog', 'Make it funnier', 'Change to blue colors'"
                        rows={2}
                        className="resize-none"
                      />
                      <div className="flex gap-2 items-center">
                        <Button
                          onClick={refineMeme}
                          disabled={refining || !refinementPrompt.trim()}
                          size="sm"
                          variant="outline"
                        >
                          {refining ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Refining...
                            </>
                          ) : (
                            'Refine Image'
                          )}
                        </Button>
                        {successMessage && (
                          <span className={`text-sm ${successMessage.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                            {successMessage}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Version History */}
                    {memeVersions.length > 1 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Version History ({memeVersions.length} versions)</Label>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {memeVersions.map((version) => (
                            <div
                              key={version.id}
                              className={`flex-shrink-0 cursor-pointer border-2 rounded-lg p-2 transition ${
                                version.id === memeImage.id ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => selectVersion(version)}
                            >
                              <div className="relative w-24 h-24">
                                <Image
                                  src={version.image_url}
                                  alt={`Version ${version.version}`}
                                  fill
                                  className="object-cover rounded"
                                />
                              </div>
                              <p className="text-xs text-center mt-1">v{version.version}</p>
                              {version.refinement_prompt && (
                                <p className="text-xs text-gray-500 text-center truncate w-24">
                                  {version.refinement_prompt}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={copyToClipboard}
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Content
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      router.push('/dashboard/content-calendar')
                      onClose()
                    }}
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View in Calendar
                  </Button>
                </div>
                
                <Button 
                  onClick={() => {
                    setGeneratedContent(null)
                    setRecommendations([])
                    setMemeImage(null)
                    setMemeVersions([])
                    setRefinementPrompt('')
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  Generate Another
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
