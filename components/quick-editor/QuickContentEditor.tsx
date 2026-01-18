'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Save, CheckCircle, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import EngagementPostEditor from './EngagementPostEditor'
import TwitterThreadEditor from './TwitterThreadEditor'
import { GeneratorMemow } from '@/components/GeneratorMemow'

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
  const [error, setError] = useState<string | null>(null)
  
  // Meme generator state
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [showImageGenerator, setShowImageGenerator] = useState(false)

  useEffect(() => {
    loadDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId])

  const loadDraft = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/content/quick-preview/${draftId}`)
      if (!res.ok) throw new Error('Failed to load draft')
      const data = await res.json()
      setDraft(data.draft)
      await validateDraft(data.draft)
    } catch (error: any) {
      console.error('Error loading draft:', error)
      setError(error.message)
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
    setError(null)
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
      setError(error.message)
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
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="text-center py-12">
          <p className="text-gray-500">Draft not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
      
      {/* Meme Generator Section - Only for meme content type */}
      {draft.content_type === 'meme' && (
        <div className="border-t pt-6">
          <h2 className="text-xl font-bold mb-4">📸 Generator Memeów</h2>
          
          <Button
            onClick={() => setShowImageGenerator(!showImageGenerator)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
          >
            {showImageGenerator ? '⬆️ Ukryj generator' : '⬇️ Pokaż generator'}
          </Button>
          
          {showImageGenerator && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <h3 className="font-semibold mb-2">Tekst Mema:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">U góry:</p>
                    <p className="font-semibold">{draft.meme_top_text || '(nie ustawione)'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">U dołu:</p>
                    <p className="font-semibold">{draft.meme_bottom_text || '(nie ustawione)'}</p>
                  </div>
                </div>
              </div>
              
              <GeneratorMemow
                topText={draft.meme_top_text || ''}
                bottomText={draft.meme_bottom_text || ''}
                draftId={draft.id}
                onSuccess={(url) => {
                  setImageUrl(url)
                  // Refresh draft to have the current image_url
                  loadDraft()
                }}
              />
              
              {imageUrl && (
                <div>
                  <h3 className="font-semibold mb-2">✅ Wygenerowany Mem:</h3>
                  <img 
                    src={imageUrl} 
                    alt="Wygenerowany mem" 
                    className="w-full rounded-lg border-2 border-green-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
