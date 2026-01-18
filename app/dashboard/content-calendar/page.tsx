'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import ContentCalendar from '@/components/ContentCalendar'
import { ToastProvider, useToast } from '@/components/ui/toast'

function ContentCalendarPageContent() {
  const { showToast } = useToast()
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
      showToast('Status updated successfully', 'success')
    } catch (error: any) {
      showToast(error.message, 'error')
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
      showToast('Draft deleted successfully', 'success')
    } catch (error: any) {
      showToast(error.message, 'error')
    }
  }

  const bulkDelete = async (draftIds: string[]) => {
    try {
      await Promise.all(
        draftIds.map(id => 
          fetch(`/api/content/calendar?id=${id}`, { method: 'DELETE' })
        )
      )
      await loadCalendar()
      showToast(`${draftIds.length} items deleted successfully`, 'success')
    } catch (error: any) {
      showToast(error.message, 'error')
    }
  }

  const bulkPublish = async (draftIds: string[]) => {
    try {
      await Promise.all(
        draftIds.map(id =>
          fetch('/api/content/calendar', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draftId: id, updates: { status: 'published' } })
          })
        )
      )
      await loadCalendar()
      showToast(`${draftIds.length} items published successfully`, 'success')
    } catch (error: any) {
      showToast(error.message, 'error')
    }
  }

  const updateDraft = async (draftId: string, updates: any) => {
    try {
      const res = await fetch('/api/content/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, updates })
      })
      
      if (!res.ok) throw new Error('Failed to update draft')
      
      await loadCalendar()
    } catch (error: any) {
      showToast(error.message, 'error')
    }
  }

  const scheduleDraft = async (draftId: string, date: string) => {
    try {
      const res = await fetch('/api/content/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          draftId, 
          updates: { scheduled_date: date, status: 'scheduled' } 
        })
      })
      
      if (!res.ok) throw new Error('Failed to schedule draft')
      
      await loadCalendar()
      showToast('Content scheduled successfully', 'success')
    } catch (error: any) {
      showToast(error.message, 'error')
    }
  }
  
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
      <ContentCalendar
        calendar={calendar}
        onRefresh={loadCalendar}
        onUpdateStatus={updateDraftStatus}
        onDelete={deleteDraft}
        onBulkDelete={bulkDelete}
        onBulkPublish={bulkPublish}
        onUpdateDraft={updateDraft}
        onSchedule={scheduleDraft}
      />
    </div>
  )
}

export default function ContentCalendarPage() {
  return (
    <ToastProvider>
      <ContentCalendarPageContent />
    </ToastProvider>
  )
}
