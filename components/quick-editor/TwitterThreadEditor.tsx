'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, X, Trash2, MoveUp, MoveDown } from 'lucide-react'

interface TwitterThreadEditorProps {
  content: any
  onChange: (content: any) => void
}

export default function TwitterThreadEditor({ 
  content, 
  onChange 
}: TwitterThreadEditorProps) {
  const [newHashtag, setNewHashtag] = useState('')

  const updateTweet = (index: number, value: string) => {
    const tweets = [...(content.tweets || [])]
    tweets[index] = value
    onChange({ ...content, tweets })
  }

  const addTweet = () => {
    const tweets = [...(content.tweets || []), '']
    onChange({ ...content, tweets })
  }

  const removeTweet = (index: number) => {
    const tweets = [...(content.tweets || [])]
    if (tweets.length <= 2) {
      // Don't remove if we'd go below 2 tweets - just skip silently
      // or could set an error state to display
      return
    }
    tweets.splice(index, 1)
    onChange({ ...content, tweets })
  }

  const moveTweet = (index: number, direction: 'up' | 'down') => {
    const tweets = [...(content.tweets || [])]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex < 0 || newIndex >= tweets.length) return
    
    [tweets[index], tweets[newIndex]] = [tweets[newIndex], tweets[index]]
    onChange({ ...content, tweets })
  }

  const addHashtag = () => {
    if (!newHashtag.trim()) return
    
    const hashtag = newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`
    const hashtags = content.hashtags || []
    
    if (!hashtags.includes(hashtag)) {
      onChange({ ...content, hashtags: [...hashtags, hashtag] })
    }
    
    setNewHashtag('')
  }

  const removeHashtag = (index: number) => {
    const hashtags = [...(content.hashtags || [])]
    hashtags.splice(index, 1)
    onChange({ ...content, hashtags })
  }

  const tweets = content.tweets || []

  return (
    <div className="space-y-6">
      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit" className="space-y-4">
          {/* Tweets */}
          <div className="space-y-3">
            {tweets.map((tweet: string, index: number) => {
              const tweetLength = tweet?.length || 0
              const isOverLimit = tweetLength > 280
              const isNearLimit = tweetLength > 260
              
              return (
                <Card key={index} className={isOverLimit ? 'border-red-300' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium">
                          Tweet {index + 1}
                        </CardTitle>
                        {index === 0 && <Badge variant="secondary">Hook</Badge>}
                        {index === tweets.length - 1 && <Badge variant="secondary">CTA</Badge>}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${
                          isOverLimit ? 'text-red-600' : 
                          isNearLimit ? 'text-yellow-600' : 
                          'text-gray-500'
                        }`}>
                          {tweetLength}/280
                        </span>
                        
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveTweet(index, 'up')}
                            disabled={index === 0}
                            className="h-7 w-7 p-0"
                          >
                            <MoveUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveTweet(index, 'down')}
                            disabled={index === tweets.length - 1}
                            className="h-7 w-7 p-0"
                          >
                            <MoveDown className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTweet(index)}
                            disabled={tweets.length <= 2}
                            className="h-7 w-7 p-0 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={tweet}
                      onChange={(e) => updateTweet(index, e.target.value)}
                      placeholder={
                        index === 0 ? 'Start with a hook...' :
                        index === tweets.length - 1 ? 'End with a CTA...' :
                        `Tweet ${index + 1}...`
                      }
                      className={`min-h-[100px] ${isOverLimit ? 'border-red-300' : ''}`}
                    />
                    {isOverLimit && (
                      <p className="text-xs text-red-600 mt-2">
                        Tweet exceeds 280 character limit by {tweetLength - 280} characters
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Button onClick={addTweet} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Tweet
          </Button>

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

          {/* Thread Tips */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-blue-900">
                Thread Structure Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-blue-900">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span><strong>Hook:</strong> Start with a compelling opening that makes people want to read more</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2-N.</span>
                  <span><strong>Value:</strong> Share insights, stories, or actionable information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">Last:</span>
                  <span><strong>CTA:</strong> End with a clear call to action (like, retweet, follow)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Thread Preview</CardTitle>
                <Badge variant="secondary">{tweets.length} tweets</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tweets.map((tweet: string, index: number) => (
                  <div key={index} className="relative">
                    {/* Thread line */}
                    {index < tweets.length - 1 && (
                      <div className="absolute left-[21px] top-12 bottom-0 w-0.5 bg-gray-300" />
                    )}
                    
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                      </div>
                      
                      <div className="flex-1 p-4 bg-gray-50 rounded-lg border">
                        <p className="whitespace-pre-wrap text-sm">
                          {tweet || <span className="text-gray-400 italic">Empty tweet</span>}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span>{tweet?.length || 0}/280 chars</span>
                          {index === 0 && <Badge variant="outline" className="text-xs">Hook</Badge>}
                          {index === tweets.length - 1 && <Badge variant="outline" className="text-xs">CTA</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {content.hashtags?.length > 0 && (
                  <div className="pl-[52px] text-sm text-blue-600">
                    {content.hashtags.join(' ')}
                  </div>
                )}
                
                {tweets.length === 0 && (
                  <p className="text-gray-400 text-center py-8">
                    Start adding tweets to see preview
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
