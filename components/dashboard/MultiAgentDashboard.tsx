'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Target, Users, Calendar, Zap, TrendingUp, Copy, Check } from 'lucide-react'
import Link from 'next/link'

interface MultiAgentDashboardProps {
  spaceId: string
}

export default function MultiAgentDashboard({ spaceId }: MultiAgentDashboardProps) {
  const [agents, setAgents] = useState<any>({})
  const [kpiProgress, setKpiProgress] = useState<any>(null)
  const [todayContent, setTodayContent] = useState<any>(null)
  const [painPoints, setPainPoints] = useState<any[]>([])
  const [upcomingContent, setUpcomingContent] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    
    try {
      // Load all agents
      const { data: agentsData } = await supabase
        .from('agents')
        .select('*')
        .eq('space_id', spaceId)
      
      const agentsByRole: any = {}
      agentsData?.forEach(agent => {
        agentsByRole[agent.role] = agent
      })
      setAgents(agentsByRole)

      // Load KPI progress
      if (agentsByRole.strategic_planner) {
        const kpiRes = await fetch('/api/agents/strategic-planner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agentsByRole.strategic_planner.id,
            action: 'check_progress'
          })
        })
        const kpiData = await kpiRes.json()
        if (kpiData.progress && kpiData.progress.length > 0) {
          setKpiProgress(kpiData.progress[0])
        }
      }

      // Load pain points
      if (agentsByRole.audience_insights) {
        const painRes = await fetch('/api/agents/audience-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agentsByRole.audience_insights.id,
            action: 'get_top_pain_points'
          })
        })
        const painData = await painRes.json()
        setPainPoints(painData.pain_points?.slice(0, 3) || [])
      }

      // Load today's content
      if (agentsByRole.content_executor) {
        const todayRes = await fetch('/api/agents/content-executor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agentsByRole.content_executor.id,
            action: 'get_today'
          })
        })
        const todayData = await todayRes.json()
        setTodayContent(todayData.today)

        // Load upcoming
        const upcomingRes = await fetch('/api/agents/content-executor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agentsByRole.content_executor.id,
            action: 'get_upcoming',
            data: { days: 7 }
          })
        })
        const upcomingData = await upcomingRes.json()
        setUpcomingContent(upcomingData.upcoming || [])

        // Load stats
        const statsRes = await fetch('/api/agents/content-executor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agentsByRole.content_executor.id,
            action: 'get_stats'
          })
        })
        const statsData = await statsRes.json()
        setStats(statsData.stats)
      }
    } catch (error) {
      console.error('Dashboard load error:', error)
    } finally {
      setLoading(false)
    }
  }, [spaceId, supabase])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  async function handleCopyContent() {
    if (todayContent?.content) {
      await navigator.clipboard.writeText(todayContent.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleMarkPublished() {
    if (!todayContent?.id || !agents.content_executor) return
    
    try {
      await fetch('/api/agents/content-executor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agents.content_executor.id,
          action: 'mark_published',
          data: { contentId: todayContent.id }
        })
      })
      
      await loadDashboard()
      alert('Marked as published! 🎉')
    } catch (error) {
      alert('Error marking as published')
    }
  }

  if (loading) {
    return <div className="p-6">Ładowanie dashboardu...</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Multi-Agentowy Marketingu</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/content-calendar">
            <Button variant="outline" className="relative">
              <Calendar className="h-4 w-4 mr-2" />
              Kalendarz treści
              {upcomingContent.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 bg-blue-500 text-white"
                >
                  {upcomingContent.length}
                </Badge>
              )}
            </Button>
          </Link>
          <Button onClick={loadDashboard} variant="outline" size="sm">
            Odśwież
          </Button>
        </div>
      </div>

      {/* KPI Progress */}
      {kpiProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Postęp KPI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {kpiProgress.current} / {kpiProgress.target} {kpiProgress.unit}
                </span>
                <Badge variant={
                  kpiProgress.status === 'ahead' ? 'default' :
                  kpiProgress.status === 'behind' ? 'destructive' : 'secondary'
                }>
                  {kpiProgress.status}
                </Badge>
              </div>
              <Progress value={kpiProgress.percentage} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{kpiProgress.percentage}% ukończone</span>
                <span>{kpiProgress.daysLeft} dni pozostało</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Content */}
      {todayContent ? (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Treść na dziś
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-bold text-xl mb-2">{todayContent.title}</h3>
              <div className="flex gap-2 mb-4">
                <Badge>{todayContent.content_type}</Badge>
                <Badge variant="outline">
                  {new Date(todayContent.publish_date).toLocaleDateString('pl-PL')}
                </Badge>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {todayContent.content}
              </pre>
            </div>

            {todayContent.audience_insights && (
              <div className="text-sm text-muted-foreground">
                <strong>Adres:</strong> {todayContent.audience_insights.pain_point}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCopyContent} className="flex-1">
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Skopiowano!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Kopiuj do schowka
                  </>
                )}
              </Button>
              <Button onClick={handleMarkPublished} variant="outline" className="flex-1">
                Oznacz jako opublikowane
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Brak treści zaplanowanej na dziś. Ciesz się dniem wolnym! 🎉
          </CardContent>
        </Card>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Pain Points */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Główne punkty bólu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {painPoints.length > 0 ? (
              <div className="space-y-2">
                {painPoints.map((pp, idx) => (
                  <div key={pp.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{idx + 1}. {pp.pain_point}</span>
                      <Badge variant="outline" className="ml-2">{pp.category}</Badge>
                    </div>
                    <span className="font-bold">{pp.frequency}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Brak punktów bólu</p>
            )}
          </CardContent>
        </Card>

        {/* This Week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ten tydzień
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingContent.length > 0 ? (
              <div className="space-y-2">
                {upcomingContent.slice(0, 5).map(content => (
                  <div key={content.id} className="flex items-center justify-between text-sm">
                    <span>{new Date(content.publish_date).toLocaleDateString('pl-PL')}</span>
                    <span className="text-muted-foreground truncate ml-2">
                      {content.title}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Brak zaplanowanej treści</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Wydajność miesięczna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{stats.published}</div>
                <div className="text-sm text-muted-foreground">Opublikowane</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Razem</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.completion_rate}%</div>
                <div className="text-sm text-muted-foreground">Ukończenie</div>
              </div>
              <div>
                <div className="text-2xl font-bold">🔥 {stats.streak}</div>
                <div className="text-sm text-muted-foreground">Seria dni</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Status */}
      <Card>
        <CardHeader>
          <CardTitle>Twoi agenci</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(agents).map(([role, agent]: [string, any]) => (
              <div key={role} className="border rounded p-4 text-center">
                <div className="text-2xl mb-2">
                  {role === 'strategic_planner' && '🎯'}
                  {role === 'audience_insights' && '👥'}
                  {role === 'marketing_strategist' && '📢'}
                  {role === 'content_executor' && '✍️'}
                </div>
                <p className="font-medium text-sm">{agent.name}</p>
                <Badge variant="outline" className="mt-2">
                  {role.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
