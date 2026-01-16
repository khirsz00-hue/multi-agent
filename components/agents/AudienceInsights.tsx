'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, RefreshCw, Sparkles } from 'lucide-react'
import ContentCreationModal from '@/components/ContentCreationModal'

export default function AudienceInsights({ agentId }: { agentId: string }) {
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedPainPoint, setSelectedPainPoint] = useState<any>(null)
  const [showContentModal, setShowContentModal] = useState(false)

  useEffect(() => {
    loadInsights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId])

  async function loadInsights() {
    setLoading(true)
    try {
      const res = await fetch('/api/agents/audience-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action: 'get_top_pain_points' })
      })
      const data = await res.json()
      setInsights(data.pain_points || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function analyzeNotionPosts() {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/agents/audience-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action: 'analyze_notion_posts', data: {} })
      })
      
      if (!res.ok) throw new Error('Analysis failed')
      
      await loadInsights()
      alert('Analysis complete!')
    } catch (error: any) {
      alert(error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Audience Pain Points
        </h2>
        <div className="flex gap-2">
          <Button onClick={loadInsights} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={analyzeNotionPosts} disabled={analyzing}>
            {analyzing ? 'Analyzing...' : 'Analyze Notion Posts'}
          </Button>
        </div>
      </div>

      {insights.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No insights yet. Click &quot;Analyze Notion Posts&quot; to extract pain points.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {insights.map((insight, idx) => (
            <Card key={insight.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-lg">#{idx + 1}</span>
                      <Badge>{insight.category}</Badge>
                      <Badge variant="outline">{insight.sentiment}</Badge>
                    </div>
                    <p className="font-medium mb-2">{insight.pain_point}</p>
                    {insight.raw_content && (
                      <p className="text-sm text-muted-foreground italic">
                        &quot;{insight.raw_content}&quot;
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="text-2xl font-bold">{insight.frequency}x</div>
                      <div className="text-xs text-muted-foreground">mentions</div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedPainPoint(insight)
                        setShowContentModal(true)
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Content
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <ContentCreationModal 
        open={showContentModal}
        onClose={() => {
          setShowContentModal(false)
          setSelectedPainPoint(null)
        }}
        painPoint={selectedPainPoint}
      />
    </div>
  )
}
