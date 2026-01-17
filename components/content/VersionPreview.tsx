'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

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

interface VersionPreviewProps {
  version: ContentVersion
  onClose: () => void
}

export default function VersionPreview({
  version,
  onClose
}: VersionPreviewProps) {
  const snapshot = version.content_snapshot

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Version {version.version_number} Preview</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {snapshot.title && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Title</label>
            <p className="mt-1 font-semibold">{snapshot.title}</p>
          </div>
        )}

        {snapshot.hook && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Hook</label>
            <p className="mt-1">{snapshot.hook}</p>
          </div>
        )}

        {snapshot.body && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Body</label>
            <div className="mt-1 whitespace-pre-wrap">{snapshot.body}</div>
          </div>
        )}

        {snapshot.cta && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Call to Action</label>
            <p className="mt-1">{snapshot.cta}</p>
          </div>
        )}

        {snapshot.hashtags && snapshot.hashtags.length > 0 && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Hashtags</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {snapshot.hashtags.map((tag: string, idx: number) => (
                <Badge key={idx} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {snapshot.tone && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Tone</label>
            <p className="mt-1 capitalize">{snapshot.tone}</p>
          </div>
        )}

        {snapshot.goal && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Goal</label>
            <p className="mt-1 capitalize">{snapshot.goal}</p>
          </div>
        )}

        {snapshot.target_platform && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Platform</label>
            <p className="mt-1 capitalize">{snapshot.target_platform}</p>
          </div>
        )}

        {snapshot.visual_suggestions && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Visual Suggestions</label>
            <div className="mt-1 bg-muted rounded p-2">
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(snapshot.visual_suggestions, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
