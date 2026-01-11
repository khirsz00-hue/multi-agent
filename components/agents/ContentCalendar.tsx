'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar, Edit, RefreshCw, Check } from 'lucide-react'

export default function ContentCalendar({ agentId }: { agentId: string }) {
  const [posts, setPosts] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadCurrentMonth()
  }, [agentId])

  async function loadCurrentMonth() {
    const month = new Date().toISOString().slice(0, 7) // 2026-11
    
    try {
      const res = await fetch('/api/agents/marketing-strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          action: 'get_month_content',
          data: { month }
        })
      })
      const data = await res.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error(error)
    }
  }

  async function generateMonth() {
    setGenerating(true)
    const month = new Date().toISOString().slice(0, 7)
    
    try {
      const res = await fetch('/api/agents/marketing-strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          action: 'generate_monthly_content',
          data: { month, postsPerWeek: 3 }
        })
      })
      
      if (!res.ok) throw new Error('Generation failed')
      
      await loadCurrentMonth()
      alert('Content generated!')
    } catch (error: any) {
      alert(error.message)
    } finally {
      setGenerating(false)
    }
  }

  async function regeneratePost(postId: string) {
    try {
      const res = await fetch('/api/agents/marketing-strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          action: 'regenerate_post',
          data: { postId, reason: 'User requested regeneration' }
        })
      })
      
      if (!res.ok) throw new Error('Regeneration failed')
      
      await loadCurrentMonth()
    } catch (error: any) {
      alert(error.message)
    }
  }

  async function saveEdit(postId: string) {
    try {
      await fetch('/api/agents/marketing-strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          action: 'update_post',
          data: { postId, updates: { content: editedContent } }
        })
      })
      
      setEditingId(null)
      await loadCurrentMonth()
    } catch (error: any) {
      alert(error.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Content Calendar
        </h2>
        <Button onClick={generateMonth} disabled={generating}>
          {generating ? 'Generating...' : 'Generate This Month'}
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No content yet. Generate your first month!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">
                        {new Date(post.publish_date).toLocaleDateString()}
                      </Badge>
                      <Badge>{post.content_type}</Badge>
                      <Badge variant="secondary">{post.status}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {editingId === post.id ? (
                  <Textarea
                    value={editedContent}
                    onChange={e => setEditedContent(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                ) : (
                  <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                    {post.content}
                  </div>
                )}

                <div className="flex gap-2">
                  {editingId === post.id ? (
                    <>
                      <Button size="sm" onClick={() => saveEdit(post.id)}>
                        <Check className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(post.id)
                          setEditedContent(post.content)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => regeneratePost(post.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    </>
                  )}
                </div>

                {post.audience_insights && (
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <strong>Addresses:</strong> {post.audience_insights.pain_point}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
