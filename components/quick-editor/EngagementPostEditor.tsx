'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, X, Lightbulb } from 'lucide-react'

interface EngagementPostEditorProps {
  content: any
  onChange: (content: any) => void
}

export default function EngagementPostEditor({ 
  content, 
  onChange 
}: EngagementPostEditorProps) {
  const [newHashtag, setNewHashtag] = useState('')

  const updateField = (field: string, value: any) => {
    onChange({ ...content, [field]: value })
  }

  const addHashtag = () => {
    if (!newHashtag.trim()) return
    
    const hashtag = newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`
    const hashtags = content.hashtags || []
    
    if (!hashtags.includes(hashtag)) {
      updateField('hashtags', [...hashtags, hashtag])
    }
    
    setNewHashtag('')
  }

  const removeHashtag = (index: number) => {
    const hashtags = [...(content.hashtags || [])]
    hashtags.splice(index, 1)
    updateField('hashtags', hashtags)
  }

  const hookLength = content.hook?.length || 0
  const bodyWordCount = content.body?.trim().split(/\s+/).filter(Boolean).length || 0
  const ctaLength = content.cta?.length || 0

  const formatSuggestions = [
    { type: 'Poll', emoji: '📊', example: 'Option A or Option B?' },
    { type: 'This or That', emoji: '🤔', example: 'Coffee ☕ or Tea 🍵?' },
    { type: 'Fill in the blank', emoji: '✍️', example: 'My biggest struggle is ____' },
    { type: 'Question', emoji: '❓', example: 'What\'s your experience with...?' }
  ]

  return (
    <div className="space-y-6">
      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit" className="space-y-4">
          {/* Hook */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Hook</CardTitle>
                <span className={`text-xs ${hookLength > 150 ? 'text-red-600' : 'text-gray-500'}`}>
                  {hookLength}/150 chars
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content.hook || ''}
                onChange={(e) => updateField('hook', e.target.value)}
                placeholder="Enter your attention-grabbing hook..."
                className="min-h-[80px]"
              />
              <p className="text-xs text-gray-500 mt-2">
                Start with a provocative question or statement to stop the scroll
              </p>
            </CardContent>
          </Card>

          {/* Body */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Body</CardTitle>
                <span className={`text-xs ${
                  bodyWordCount < 10 ? 'text-yellow-600' : 
                  bodyWordCount > 150 ? 'text-red-600' : 
                  'text-gray-500'
                }`}>
                  {bodyWordCount} words
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content.body || ''}
                onChange={(e) => updateField('body', e.target.value)}
                placeholder="Enter the main content..."
                className="min-h-[120px]"
              />
              <p className="text-xs text-gray-500 mt-2">
                Keep it concise (50-150 words) and engaging
              </p>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Call to Action</CardTitle>
                <span className={`text-xs ${ctaLength > 150 ? 'text-red-600' : 'text-gray-500'}`}>
                  {ctaLength}/150 chars
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content.cta || ''}
                onChange={(e) => updateField('cta', e.target.value)}
                placeholder="Enter your call to action..."
                className="min-h-[60px]"
              />
              <p className="text-xs text-gray-500 mt-2">
                Clear instruction to comment (e.g., &quot;Drop a 👍 if you agree!&quot;)
              </p>
            </CardContent>
          </Card>

          {/* Hashtags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Hashtags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  placeholder="Add hashtag..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addHashtag()
                    }
                  }}
                />
                <Button onClick={addHashtag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {(content.hashtags || []).map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => removeHashtag(index)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              {(!content.hashtags || content.hashtags.length === 0) && (
                <p className="text-xs text-gray-500">No hashtags added yet</p>
              )}
            </CardContent>
          </Card>

          {/* Format Suggestions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-medium text-blue-900">
                  Engagement Format Suggestions
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {formatSuggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-white rounded-lg border border-blue-100"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{suggestion.emoji}</span>
                      <span className="font-medium text-sm">{suggestion.type}</span>
                    </div>
                    <p className="text-xs text-gray-600 italic">&ldquo;{suggestion.example}&rdquo;</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                {content.hook && (
                  <p className="font-bold text-lg">{content.hook}</p>
                )}
                
                {content.body && (
                  <p className="whitespace-pre-wrap">{content.body}</p>
                )}
                
                {content.cta && (
                  <p className="font-medium text-blue-600">{content.cta}</p>
                )}
                
                {content.hashtags?.length > 0 && (
                  <p className="text-blue-600 text-sm">
                    {content.hashtags.join(' ')}
                  </p>
                )}
                
                {!content.hook && !content.body && !content.cta && (
                  <p className="text-gray-400 text-center py-8">
                    Start editing to see preview
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
