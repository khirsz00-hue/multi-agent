'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, FileText, Twitter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function QuickGeneratePage() {
  const router = useRouter()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState('')
  const [contentType, setContentType] = useState<'engagement_post' | 'thread'>('engagement_post')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('empathetic')
  const [goal, setGoal] = useState('engagement')
  const [additionalNotes, setAdditionalNotes] = useState('')

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('agents')
        .select('*, spaces(name)')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setAgents(data || [])
      if (data && data.length > 0) {
        setSelectedAgent(data[0].id)
      }
    } catch (error) {
      console.error('Error loading agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedAgent || !topic) {
      alert('Please select an agent and enter a topic')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/content/generate-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent,
          contentType,
          options: {
            topic,
            tone,
            goal,
            additionalNotes: additionalNotes || undefined
          }
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to generate content')
      }

      const data = await res.json()
      router.push(`/quick-editor/${data.draft.id}`)
    } catch (error: any) {
      console.error('Generation error:', error)
      alert(error.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (agents.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              No agents found. Please create an agent first.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Quick Content Generator</h1>
        <p className="text-gray-600">
          Generate engagement posts or Twitter threads with AI, then edit them directly
        </p>
      </div>

      <div className="space-y-6">
        {/* Content Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Content Type</CardTitle>
            <CardDescription>Choose what type of content to generate</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={contentType} onValueChange={(value: any) => setContentType(value)}>
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition ${
                    contentType === 'engagement_post' ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setContentType('engagement_post')}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="engagement_post" id="engagement_post" />
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <Label htmlFor="engagement_post" className="cursor-pointer font-medium">
                          Engagement Post
                        </Label>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 ml-8">
                      Social media post designed for maximum comments and engagement
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition ${
                    contentType === 'thread' ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setContentType('thread')}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="thread" id="thread" />
                      <div className="flex items-center gap-2">
                        <Twitter className="h-5 w-5 text-blue-600" />
                        <Label htmlFor="thread" className="cursor-pointer font-medium">
                          Twitter Thread
                        </Label>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 ml-8">
                      Multi-tweet thread with hook, value, and CTA
                    </p>
                  </CardContent>
                </Card>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Generation Options */}
        <Card>
          <CardHeader>
            <CardTitle>Content Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Agent Selection */}
            <div>
              <Label>Agent</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} ({agent.spaces?.name || 'Unknown Space'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Topic */}
            <div>
              <Label>Topic</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., productivity tips, ADHD challenges, time management"
              />
            </div>

            {/* Tone and Goal */}
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

            {/* Additional Notes */}
            <div>
              <Label>Additional Instructions (Optional)</Label>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any specific requirements or style preferences..."
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={generating || !selectedAgent || !topic}
          className="w-full"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              Generate {contentType === 'engagement_post' ? 'Engagement Post' : 'Twitter Thread'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
