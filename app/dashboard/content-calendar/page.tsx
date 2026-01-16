'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  Clock,
  CheckCircle2,
  Send,
  Video,
  ImageIcon,
  FileText,
  Mail,
  Twitter,
  MoreVertical,
  Copy,
  Trash2,
  Edit
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ContentCalendarPage() {
  const [calendar, setCalendar] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadCalendar()
  }, [])
  
  const loadCalendar = async () => {
    try {
      const res = await fetch('/api/content/calendar')
      if (!res.ok) throw new Error('Failed to load calendar')
      const data = await res.json()
      setCalendar(data.calendar)
    } catch (error) {
      console.error('Failed to load calendar:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const updateDraftStatus = async (draftId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/content/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, updates: { status: newStatus } })
      })
      
      if (!res.ok) throw new Error('Failed to update status')
      
      // Reload calendar
      await loadCalendar()
    } catch (error: any) {
      alert(error.message)
    }
  }
  
  const deleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return
    
    try {
      const res = await fetch(`/api/content/calendar?id=${draftId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) throw new Error('Failed to delete draft')
      
      await loadCalendar()
    } catch (error: any) {
      alert(error.message)
    }
  }
  
  const copyContent = (draft: any) => {
    let text = ''
    if (draft.hook) text += `${draft.hook}\n\n`
    if (draft.body) text += `${draft.body}\n\n`
    if (draft.cta) text += `${draft.cta}\n\n`
    if (draft.hashtags?.length) text += draft.hashtags.join(' ')
    
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
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      ready: 'bg-green-100 text-green-700',
      scheduled: 'bg-blue-100 text-blue-700',
      posted: 'bg-purple-100 text-purple-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }
  
  const ContentCard = ({ draft }: { draft: any }) => {
    const Icon = getContentIcon(draft.content_type)
    
    return (
      <Card className="hover:shadow-md transition">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 bg-blue-50 rounded flex-shrink-0">
                <Icon className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {draft.hook || draft.title || 'Untitled'}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {draft.content_type.replace('_', ' ')}
                  </Badge>
                  <Badge className={`text-xs ${getStatusColor(draft.status)}`}>
                    {draft.status}
                  </Badge>
                  {draft.tone && (
                    <span className="text-xs text-gray-500">
                      {draft.tone}
                    </span>
                  )}
                </div>
                {draft.audience_insights && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    Pain point: {draft.audience_insights.pain_point}
                  </p>
                )}
                {draft.scheduled_date && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                    <Calendar className="h-3 w-3" />
                    {new Date(draft.scheduled_date).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => copyContent(draft)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Content
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  // TODO: Open edit modal
                  alert('Edit functionality coming soon')
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {draft.status === 'draft' && (
                  <DropdownMenuItem onClick={() => updateDraftStatus(draft.id, 'ready')}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Ready
                  </DropdownMenuItem>
                )}
                {draft.status === 'ready' && (
                  <DropdownMenuItem onClick={() => updateDraftStatus(draft.id, 'scheduled')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </DropdownMenuItem>
                )}
                {draft.status === 'scheduled' && (
                  <DropdownMenuItem onClick={() => updateDraftStatus(draft.id, 'posted')}>
                    <Send className="h-4 w-4 mr-2" />
                    Mark as Posted
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => deleteDraft(draft.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const totalDrafts = useMemo(() => {
    if (!calendar) return 0
    return (calendar.drafts?.length || 0) + (calendar.ready?.length || 0) + 
           (calendar.scheduled?.length || 0) + (calendar.posted?.length || 0)
  }, [calendar])
  
  const allDrafts = useMemo(() => {
    if (!calendar) return []
    return [...(calendar.drafts || []), ...(calendar.ready || []), ...(calendar.scheduled || []), ...(calendar.posted || [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [calendar])
  
  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">Loading calendar...</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          Content Calendar
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your content pipeline • {totalDrafts} total items
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Drafts</p>
                <p className="text-2xl font-bold">{calendar?.drafts?.length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ready</p>
                <p className="text-2xl font-bold">{calendar?.ready?.length || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold">{calendar?.scheduled?.length || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Posted</p>
                <p className="text-2xl font-bold">{calendar?.posted?.length || 0}</p>
              </div>
              <Send className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All ({totalDrafts})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            <Clock className="h-4 w-4 mr-2" />
            Drafts ({calendar?.drafts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="ready">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Ready ({calendar?.ready?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Calendar className="h-4 w-4 mr-2" />
            Scheduled ({calendar?.scheduled?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="posted">
            <Send className="h-4 w-4 mr-2" />
            Posted ({calendar?.posted?.length || 0})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {totalDrafts === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">No content drafts yet</p>
                <p className="text-sm text-gray-500">
                  Generate your first content from pain points in Audience Insights
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allDrafts.map((draft: any) => (
                <ContentCard key={draft.id} draft={draft} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="drafts" className="space-y-4">
          {calendar?.drafts?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No drafts</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calendar?.drafts?.map((draft: any) => (
                <ContentCard key={draft.id} draft={draft} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="ready" className="space-y-4">
          {calendar?.ready?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No content ready</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calendar?.ready?.map((draft: any) => (
                <ContentCard key={draft.id} draft={draft} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="scheduled" className="space-y-4">
          {calendar?.scheduled?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No scheduled content</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calendar?.scheduled?.map((draft: any) => (
                <ContentCard key={draft.id} draft={draft} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="posted" className="space-y-4">
          {calendar?.posted?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Send className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No posted content yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calendar?.posted?.map((draft: any) => (
                <ContentCard key={draft.id} draft={draft} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
