'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { 
  Calendar as CalendarIcon,
  Grid3x3,
  List,
  Columns,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Send,
  RefreshCw,
  Clock,
  Video,
  ImageIcon,
  FileText,
  Mail,
  Twitter,
  X
} from 'lucide-react'
import CalendarCell from './CalendarCell'

interface ContentCalendarProps {
  calendar: any
  onRefresh: () => void
  onUpdateStatus: (draftId: string, newStatus: string) => void
  onDelete: (draftId: string) => void
  onBulkDelete: (draftIds: string[]) => void
  onBulkPublish: (draftIds: string[]) => void
  onUpdateDraft: (draftId: string, updates: any) => void
  onSchedule: (draftId: string, date: string) => void
}

type ViewMode = 'month' | 'week' | 'list'
type FilterMode = 'all' | 'draft' | 'published'

export default function ContentCalendar({
  calendar,
  onRefresh,
  onUpdateStatus,
  onDelete,
  onBulkDelete,
  onBulkPublish,
  onUpdateDraft,
  onSchedule
}: ContentCalendarProps) {
  const { showToast } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [previewDraft, setPreviewDraft] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingDraft, setEditingDraft] = useState<any>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [editEngine, setEditEngine] = useState('')

  // Get all drafts in a single array
  const allDrafts = useMemo(() => {
    if (!calendar) return []
    const drafts = [
      ...(calendar.drafts || []),
      ...(calendar.ready || []),
      ...(calendar.scheduled || []),
      ...(calendar.posted || [])
    ]
    
    // Apply filter
    if (filterMode === 'draft') {
      return drafts.filter(d => d.status === 'draft' || d.status === 'ready')
    } else if (filterMode === 'published') {
      return drafts.filter(d => d.status === 'posted' || d.status === 'published')
    }
    return drafts
  }, [calendar, filterMode])

  // Group drafts by date for calendar views
  const draftsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    allDrafts.forEach(draft => {
      const date = draft.scheduled_date 
        ? new Date(draft.scheduled_date).toISOString().split('T')[0]
        : new Date(draft.created_at).toISOString().split('T')[0]
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(draft)
    })
    return grouped
  }, [allDrafts])

  // Generate calendar days for monthly view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: null, drafts: [] })
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({
        date: new Date(year, month, day),
        dateStr,
        drafts: draftsByDate[dateStr] || []
      })
    }
    
    return days
  }, [currentDate, draftsByDate])

  // Get week days
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day
    startOfWeek.setDate(diff)
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      days.push({
        date,
        dateStr,
        drafts: draftsByDate[dateStr] || []
      })
    }
    return days
  }, [currentDate, draftsByDate])

  const handleSelectDraft = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedDrafts)
    if (selected) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedDrafts(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDrafts(new Set(allDrafts.map(d => d.id)))
    } else {
      setSelectedDrafts(new Set())
    }
  }

  const handleBulkDelete = async () => {
    if (selectedDrafts.size === 0) return
    if (!confirm(`Delete ${selectedDrafts.size} items?`)) return
    
    await onBulkDelete(Array.from(selectedDrafts))
    setSelectedDrafts(new Set())
  }

  const handleBulkPublish = async () => {
    if (selectedDrafts.size === 0) return
    if (!confirm(`Publish ${selectedDrafts.size} items?`)) return
    
    await onBulkPublish(Array.from(selectedDrafts))
    setSelectedDrafts(new Set())
  }

  const handleCopyContent = (draft: any) => {
    let text = ''
    if (draft.hook) text += `${draft.hook}\n\n`
    if (draft.body) text += `${draft.body}\n\n`
    if (draft.cta) text += `${draft.cta}\n\n`
    if (draft.hashtags?.length) text += draft.hashtags.join(' ')
    
    navigator.clipboard.writeText(text)
    showToast('Content copied to clipboard!', 'success')
  }

  const handleEditDraft = (draft: any) => {
    setEditingDraft({ ...draft })
    setEditEngine(draft.engine || 'gpt-4')
    setScheduleDate(draft.scheduled_date || '')
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingDraft) return
    
    await onUpdateDraft(editingDraft.id, {
      hook: editingDraft.hook,
      body: editingDraft.body,
      cta: editingDraft.cta,
      engine: editEngine,
      scheduled_date: scheduleDate || null
    })
    
    setIsEditModalOpen(false)
    setEditingDraft(null)
    onRefresh()
    showToast('Content updated successfully!', 'success')
  }

  const handleRegenerate = async (draft: any) => {
    if (!confirm('Regenerate this content?')) return
    // This would call the regeneration API
    showToast('Regeneration feature coming soon', 'info')
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCurrentDate(newDate)
  }

  const getContentIcon = (type: string) => {
    const icons: Record<string, any> = {
      reel: Video,
      meme: ImageIcon,
      deep_post: FileText,
      engagement_post: FileText,
      post: FileText,
      newsletter: Mail,
      thread: Twitter
    }
    return icons[type] || FileText
  }

  return (
    <div className="space-y-4">
      {/* Header with view controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Content Calendar
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {allDrafts.length} total items
            {selectedDrafts.size > 0 && ` • ${selectedDrafts.size} selected`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode selector */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="rounded-none border-x"
            >
              <Columns className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter selector */}
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Content</SelectItem>
              <SelectItem value="draft">Drafts Only</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedDrafts.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedDrafts.size === allDrafts.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedDrafts.size} item{selectedDrafts.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleBulkPublish}>
                  <Send className="h-4 w-4 mr-2" />
                  Publish
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setSelectedDrafts(new Set())}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Views */}
      {viewMode === 'month' && (
        <Card>
          <CardContent className="p-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold">
                {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`min-h-[120px] p-2 border rounded-lg ${
                    day.date ? 'bg-white' : 'bg-gray-50'
                  } ${
                    day.date?.toDateString() === new Date().toDateString()
                      ? 'border-blue-500 border-2'
                      : 'border-gray-200'
                  }`}
                >
                  {day.date && (
                    <>
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        {day.date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {day.drafts.slice(0, 3).map((draft) => (
                          <CalendarCell
                            key={draft.id}
                            draft={draft}
                            isSelected={selectedDrafts.has(draft.id)}
                            onSelect={handleSelectDraft}
                            onClick={() => setPreviewDraft(draft)}
                            onEdit={handleEditDraft}
                            onDelete={onDelete}
                            onStatusChange={onUpdateStatus}
                            onCopy={handleCopyContent}
                            showCheckbox={true}
                          />
                        ))}
                        {day.drafts.length > 3 && (
                          <div className="text-xs text-gray-500 text-center py-1">
                            +{day.drafts.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'week' && (
        <Card>
          <CardContent className="p-4">
            {/* Week navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold">
                Week of {weekDays[0]?.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Week grid */}
            <div className="grid grid-cols-7 gap-3">
              {weekDays.map((day, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="text-sm font-semibold text-center pb-2 border-b">
                    <div>{day.date.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                    <div className={`text-lg ${
                      day.date.toDateString() === new Date().toDateString()
                        ? 'text-blue-600'
                        : ''
                    }`}>
                      {day.date.getDate()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {day.drafts.map((draft) => (
                      <CalendarCell
                        key={draft.id}
                        draft={draft}
                        isSelected={selectedDrafts.has(draft.id)}
                        onSelect={handleSelectDraft}
                        onClick={() => setPreviewDraft(draft)}
                        onEdit={handleEditDraft}
                        onDelete={onDelete}
                        onStatusChange={onUpdateStatus}
                        onCopy={handleCopyContent}
                        showCheckbox={true}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {allDrafts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No content drafts yet</p>
                </div>
              ) : (
                <>
                  {/* Select all option */}
                  <div className="flex items-center gap-2 pb-3 border-b">
                    <Checkbox
                      checked={selectedDrafts.size === allDrafts.length && allDrafts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">Select All</span>
                  </div>

                  {/* List of drafts */}
                  {allDrafts.map((draft) => (
                    <CalendarCell
                      key={draft.id}
                      draft={draft}
                      isSelected={selectedDrafts.has(draft.id)}
                      onSelect={handleSelectDraft}
                      onClick={() => setPreviewDraft(draft)}
                      onEdit={handleEditDraft}
                      onDelete={onDelete}
                      onStatusChange={onUpdateStatus}
                      onCopy={handleCopyContent}
                      showCheckbox={true}
                    />
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewDraft} onOpenChange={(open) => !open && setPreviewDraft(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDraft && (() => {
                const Icon = getContentIcon(previewDraft.content_type)
                return <Icon className="h-5 w-5" />
              })()}
              {previewDraft?.hook || previewDraft?.title || 'Content Preview'}
            </DialogTitle>
            <DialogDescription>
              {previewDraft?.content_type.replace('_', ' ')} • {previewDraft?.status}
            </DialogDescription>
          </DialogHeader>

          {previewDraft && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
                {previewDraft.hook && <div className="font-semibold mb-2">{previewDraft.hook}</div>}
                {previewDraft.body && <div className="mb-2">{previewDraft.body}</div>}
                {previewDraft.cta && <div className="font-medium">{previewDraft.cta}</div>}
                {previewDraft.content && !previewDraft.hook && <div>{previewDraft.content}</div>}
              </div>

              {previewDraft.audience_insights && (
                <div className="text-sm text-gray-600">
                  <strong>Addresses:</strong> {previewDraft.audience_insights.pain_point}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => {
                  handleEditDraft(previewDraft)
                  setPreviewDraft(null)
                }} className="flex-1">
                  Edit
                </Button>
                <Button onClick={() => handleCopyContent(previewDraft)} variant="outline" className="flex-1">
                  Copy
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Make changes to your content and settings
            </DialogDescription>
          </DialogHeader>

          {editingDraft && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="hook">Hook / Title</Label>
                <Input
                  id="hook"
                  value={editingDraft.hook || ''}
                  onChange={(e) => setEditingDraft({ ...editingDraft, hook: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  value={editingDraft.body || ''}
                  onChange={(e) => setEditingDraft({ ...editingDraft, body: e.target.value })}
                  rows={8}
                />
              </div>

              <div>
                <Label htmlFor="cta">Call to Action</Label>
                <Input
                  id="cta"
                  value={editingDraft.cta || ''}
                  onChange={(e) => setEditingDraft({ ...editingDraft, cta: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="engine">Engine</Label>
                  <Select value={editEngine} onValueChange={setEditEngine}>
                    <SelectTrigger id="engine">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="gemini">Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="schedule">Schedule Date</Label>
                  <Input
                    id="schedule"
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleRegenerate(editingDraft)} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
