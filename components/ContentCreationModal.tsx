'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Copy, Calendar, Loader2, Video, ImageIcon, FileText, Mail, Twitter } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
      // Use long-form generation for newsletter and deep_post
      const isLongForm = ['newsletter', 'deep_post'].includes(selectedType)
      const endpoint = isLongForm ? '/api/content/generate-long-form' : '/api/content/generate'
      
      const res = await fetch(endpoint, {
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
      
      // For long-form content, redirect to editor
      if (isLongForm && data.draft?.id) {
        router.push(`/dashboard/long-form-editor/${data.draft.id}`)
        onClose()
      } else {
        setGeneratedContent(data.draft)
      }
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
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
                                    &ldquo;{rec.hook_suggestion}&rdquo;
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
