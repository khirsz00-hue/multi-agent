'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { History, RefreshCw, Eye, RotateCcw } from 'lucide-react'

interface ContentVersion {
  id: string
  content_draft_id: string
  version_number: number
  version_type: 'generated' | 'user_edited' | 'ai_refined' | 'restored'
  content_snapshot: any
  edited_fields: string[]
  change_description?: string
  created_at: string
}

interface VersionHistoryProps {
  contentDraftId: string
  onViewVersion?: (version: ContentVersion) => void
  onRestoreVersion?: (versionId: string) => void
}

export default function VersionHistory({
  contentDraftId,
  onViewVersion,
  onRestoreVersion
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<ContentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    loadVersions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentDraftId])

  async function loadVersions() {
    try {
      setLoading(true)
      const res = await fetch(`/api/content/versions/${contentDraftId}`)
      const data = await res.json()
      
      if (res.ok) {
        setVersions(data.versions || [])
      } else {
        console.error('Failed to load versions:', data.error)
      }
    } catch (error) {
      console.error('Error loading versions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore(versionId: string) {
    if (!confirm('Are you sure you want to restore this version? This will create a new version with the restored content.')) {
      return
    }

    try {
      setRestoring(versionId)
      const res = await fetch(`/api/content/restore-version/${versionId}`, {
        method: 'POST'
      })
      
      if (res.ok) {
        await loadVersions()
        if (onRestoreVersion) {
          onRestoreVersion(versionId)
        }
      } else {
        const data = await res.json()
        alert(`Failed to restore: ${data.error}`)
      }
    } catch (error) {
      console.error('Error restoring version:', error)
      alert('Failed to restore version')
    } finally {
      setRestoring(null)
    }
  }

  const getVersionTypeBadge = (type: ContentVersion['version_type']) => {
    const badges = {
      generated: <Badge variant="secondary">Generated</Badge>,
      user_edited: <Badge variant="default">Edited</Badge>,
      ai_refined: <Badge variant="outline">AI Refined</Badge>,
      restored: <Badge variant="destructive">Restored</Badge>
    }
    return badges[type] || <Badge>{type}</Badge>
  }

  const formatDate = (date: string) => {
    try {
      const d = new Date(date)
      const now = new Date()
      const diff = now.getTime() - d.getTime()
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      
      if (minutes < 1) return 'just now'
      if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
      if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
      if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
      return d.toLocaleDateString()
    } catch {
      return date
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading versions...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadVersions}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] overflow-y-auto pr-4">
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No versions yet</p>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Version {version.version_number}
                        </span>
                        {getVersionTypeBadge(version.version_type)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(version.created_at)}
                      </p>
                    </div>
                  </div>

                  {version.change_description && (
                    <p className="text-sm">{version.change_description}</p>
                  )}

                  {version.edited_fields && version.edited_fields.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {version.edited_fields.map((field) => (
                        <Badge
                          key={field}
                          variant="outline"
                          className="text-xs"
                        >
                          {field}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {onViewVersion && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewVersion(version)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRestore(version.id)}
                      disabled={restoring === version.id}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      {restoring === version.id ? 'Restoring...' : 'Restore'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
