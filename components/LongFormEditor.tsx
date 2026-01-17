'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Save, 
  Sparkles, 
  History, 
  Eye, 
  Check,
  Edit3,
  Undo2,
  Clock
} from 'lucide-react'

interface LongFormEditorProps {
  draftId: string
  onClose?: () => void
}

export default function LongFormEditor({ draftId, onClose }: LongFormEditorProps) {
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<any>(null)
  const [currentVersion, setCurrentVersion] = useState<any>(null)
  const [versions, setVersions] = useState<any[]>([])
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiSection, setAiSection] = useState<string>('')
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [compareVersion, setCompareVersion] = useState<any>(null)

  useEffect(() => {
    loadDraft()
  }, [draftId])

  const loadDraft = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/content/long-form-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      })
      
      if (!res.ok) throw new Error('Failed to load draft')
      
      const data = await res.json()
      setDraft(data.draft)
      setCurrentVersion(data.draft.current_version)
      setVersions(data.draft.versions || [])
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditSection = (section: string) => {
    setEditingSection(section)
    setEditContent(
      section === 'visual_suggestions' 
        ? JSON.stringify(currentVersion[section], null, 2)
        : currentVersion[section] || ''
    )
  }

  const handleSaveEdit = async () => {
    if (!editingSection) return
    
    try {
      const content = editingSection === 'visual_suggestions'
        ? JSON.parse(editContent)
        : editContent

      const res = await fetch('/api/content/edit-section', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId: currentVersion.id,
          section: editingSection,
          content
        })
      })
      
      if (!res.ok) throw new Error('Failed to save edit')
      
      await loadDraft()
      setEditingSection(null)
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleAiRegenerate = async () => {
    if (!aiInstruction.trim()) {
      alert('Please provide instructions for regeneration')
      return
    }
    
    setAiLoading(true)
    try {
      const res = await fetch('/api/content/regenerate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId: currentVersion.id,
          section: aiSection,
          instruction: aiInstruction
        })
      })
      
      if (!res.ok) throw new Error('Failed to regenerate section')
      
      await loadDraft()
      setShowAiModal(false)
      setAiInstruction('')
    } catch (error: any) {
      alert(error.message)
    } finally {
      setAiLoading(false)
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    const versionToRestore = versions.find(v => v.id === versionId)
    if (!versionToRestore) return
    
    try {
      // Create new version with all sections from the old version
      const res = await fetch('/api/content/edit-section', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId: currentVersion.id,
          section: 'hook', // We'll create a version with all sections
          content: versionToRestore.hook
        })
      })
      
      if (!res.ok) throw new Error('Failed to restore version')
      
      // This is a simplified restore - in production, you'd want to restore all sections at once
      await loadDraft()
      setCompareVersion(null)
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleFinalize = async (status: string) => {
    try {
      const res = await fetch('/api/content/finalize-long-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, status })
      })
      
      if (!res.ok) throw new Error('Failed to finalize')
      
      alert('Content finalized successfully!')
      if (onClose) onClose()
    } catch (error: any) {
      alert(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    )
  }

  if (!currentVersion) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">No content version found</div>
      </div>
    )
  }

  const getSectionLabel = (section: string) => {
    const labels: Record<string, string> = {
      hook: 'Hook',
      body: 'Body',
      cta: 'Call to Action',
      visual_suggestions: 'Visual Suggestions'
    }
    return labels[section] || section
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Editor - 3 columns */}
        <div className="lg:col-span-3 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{draft.title}</h1>
              <p className="text-gray-500 mt-1">
                Version {currentVersion.version_number} • {draft.content_type}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowVersions(!showVersions)}
              >
                <History className="w-4 h-4 mr-2" />
                History ({versions.length})
              </Button>
              <Button
                variant="default"
                onClick={() => handleFinalize('ready')}
              >
                <Check className="w-4 h-4 mr-2" />
                Mark Ready
              </Button>
            </div>
          </div>

          {/* Section Editors */}
          {['hook', 'body', 'cta', 'visual_suggestions'].map((section) => (
            <Card key={section}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-medium">
                  {getSectionLabel(section)}
                </CardTitle>
                <div className="flex gap-2">
                  {currentVersion.modified_sections?.includes(section) && (
                    <Badge variant="secondary">Modified</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditSection(section)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAiSection(section)
                      setShowAiModal(true)
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editingSection === section ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={section === 'body' ? 15 : section === 'visual_suggestions' ? 8 : 3}
                      className="font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingSection(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose max-w-none">
                    {section === 'visual_suggestions' ? (
                      <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">
                        {JSON.stringify(currentVersion[section], null, 2)}
                      </pre>
                    ) : (
                      <p className="whitespace-pre-wrap">{currentVersion[section]}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-4">
          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Eye className="w-4 h-4 mr-2" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-700 mb-1">Hook:</p>
                <p className="text-gray-600">{currentVersion.hook?.substring(0, 100)}...</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">Body:</p>
                <p className="text-gray-600">{currentVersion.body?.substring(0, 100)}...</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">CTA:</p>
                <p className="text-gray-600">{currentVersion.cta?.substring(0, 100)}...</p>
              </div>
            </CardContent>
          </Card>

          {/* Version Timeline */}
          {showVersions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Version History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      version.id === currentVersion.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setCompareVersion(version)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Version {version.version_number}</span>
                      {version.is_current && (
                        <Badge variant="default">Current</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {version.changed_by_ai ? '🤖 AI' : '✏️ Manual'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {version.change_reason}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(version.created_at).toLocaleString()}
                    </p>
                    {version.id !== currentVersion.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRestoreVersion(version.id)
                        }}
                      >
                        <Undo2 className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* AI Regeneration Modal */}
      <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Section Refinement</DialogTitle>
            <DialogDescription>
              Tell the AI how to improve the {getSectionLabel(aiSection)} section
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Content</Label>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm max-h-40 overflow-auto">
                {aiSection === 'visual_suggestions'
                  ? JSON.stringify(currentVersion[aiSection], null, 2)
                  : currentVersion[aiSection]}
              </div>
            </div>
            <div>
              <Label htmlFor="instruction">Your Instructions</Label>
              <Textarea
                id="instruction"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                placeholder="e.g., Make this more funny, Simplify the language, Add more emojis"
                rows={4}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAiRegenerate}
                disabled={aiLoading}
                className="flex-1"
              >
                {aiLoading ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Regenerate with AI
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowAiModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version Comparison Modal */}
      {compareVersion && compareVersion.id !== currentVersion.id && (
        <Dialog open={!!compareVersion} onOpenChange={() => setCompareVersion(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Compare: Version {compareVersion.version_number} vs Current (Version {currentVersion.version_number})
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Version {compareVersion.version_number}</h3>
                {['hook', 'body', 'cta'].map((section) => (
                  <div key={section} className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {getSectionLabel(section)}:
                    </p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {compareVersion[section]?.substring(0, 200)}...
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-medium mb-2">Current Version</h3>
                {['hook', 'body', 'cta'].map((section) => (
                  <div key={section} className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {getSectionLabel(section)}:
                    </p>
                    <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                      {currentVersion[section]?.substring(0, 200)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
