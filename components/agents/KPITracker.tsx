'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function KPITracker({ agentId }: { agentId: string }) {
  const [progress, setProgress] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProgress()
  }, [agentId])

  async function loadProgress() {
    try {
      const res = await fetch('/api/agents/strategic-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action: 'check_progress' })
      })
      const data = await res.json()
      setProgress(data.progress || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Target className="h-6 w-6" />
        KPI Dashboard
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {progress.map(kpi => (
          <Card key={kpi.kpi_id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{kpi.name}</CardTitle>
                {kpi.status === 'ahead' && <TrendingUp className="h-4 w-4 text-green-600" />}
                {kpi.status === 'behind' && <TrendingDown className="h-4 w-4 text-red-600" />}
                {kpi.status === 'on_track' && <Minus className="h-4 w-4 text-blue-600" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold">
                {kpi.current} / {kpi.target} {kpi.unit}
              </div>
              <Progress value={kpi.percentage} />
              <div className="flex justify-between items-center">
                <span className="text-sm">{kpi.percentage}%</span>
                <Badge variant={
                  kpi.status === 'ahead' ? 'default' : 
                  kpi.status === 'behind' ? 'destructive' : 'secondary'
                }>
                  {kpi.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {kpi.daysLeft} days left
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
