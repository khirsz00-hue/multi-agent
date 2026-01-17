'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Save, CheckCircle, AlertCircle } from 'lucide-react'
import EngagementPostEditor from './EngagementPostEditor'
import TwitterThreadEditor from './TwitterThreadEditor'

interface QuickContentEditorProps {
  draftId: string
  onSave?: () => void
  onPublish?: () => void
}

export default function QuickContentEditor({ 
  draftId, 
  onSave,
  onPublish 
}: QuickContentEditorProps) {
  const [draft, setDraft] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState<any>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    loadDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId])

  const loadDraft = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/content/quick-preview/${draftId}`)
      if (!res.ok) throw new Error('Failed to load draft')
      const data = await res.json()
      setDraft(data.draft)
      await validateDraft(data.draft)
    } catch (error: any) {
      console.error('Error loading draft:', error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const validateDraft = async (currentDraft: any = draft) => {
    if (!currentDraft) return
    
    try {
      const res = await fetch('/api/content/validate-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: currentDraft.content_type,
          draft: currentDraft.draft
        })
      })
      
      if (!res.ok) throw new Error('Validation failed')
      const data = await res.json()
      setValidation(data)
    } catch (error) {
      console.error('Validation error:', error)
    }
  }

  const handleDraftChange = async (updatedContent: any) => {
    const updatedDraft = {
      ...draft,
      draft: updatedContent
    }
    setDraft(updatedDraft)
    await validateDraft(updatedDraft)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/content/quick-edit/${draftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: draft.draft })
      })
      
      if (!res.ok) throw new Error('Failed to save')
      
      setLastSaved(new Date())
      onSave?.()
    } catch (error: any) {
      console.error('Save error:', error)
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Draft not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Quick Content Editor</h2>
          <Badge variant="secondary">
            {draft.content_type === 'engagement_post' ? 'Engagement Post' : 'Twitter Thread'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || (validation && !validation.valid)}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Validation Status */}
      {validation && (
        <Card className={validation.valid ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              {validation.valid ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              )}
              <div className="flex-1">
                {validation.errors?.length > 0 && (
                  <div className="mb-2">
                    <p className="font-medium text-red-700">Errors:</p>
                    <ul className="list-disc list-inside text-sm text-red-600">
                      {validation.errors.map((error: string, i: number) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validation.warnings?.length > 0 && (
                  <div>
                    <p className="font-medium text-yellow-700">Warnings:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-600">
                      {validation.warnings.map((warning: string, i: number) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validation.valid && validation.errors?.length === 0 && validation.warnings?.length === 0 && (
                  <p className="text-green-700">Content is valid and ready to publish!</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor */}
      {draft.content_type === 'engagement_post' ? (
        <EngagementPostEditor
          content={draft.draft}
          onChange={handleDraftChange}
        />
      ) : (
        <TwitterThreadEditor
          content={draft.draft}
          onChange={handleDraftChange}
        />
      )}
    </div>
  )
}
