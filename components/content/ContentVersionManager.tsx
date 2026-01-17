'use client'

import { useState } from 'react'
import VersionHistory from './VersionHistory'
import VersionPreview from './VersionPreview'
import VersionDiffComponent from './VersionDiff'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

interface ContentVersionManagerProps {
  contentDraftId: string
  onVersionRestore?: () => void
}

export default function ContentVersionManager({
  contentDraftId,
  onVersionRestore
}: ContentVersionManagerProps) {
  const [selectedVersion, setSelectedVersion] = useState<ContentVersion | null>(null)
  const [compareVersion1, setCompareVersion1] = useState<string | null>(null)
  const [compareVersion2, setCompareVersion2] = useState<string | null>(null)

  const handleViewVersion = (version: ContentVersion) => {
    setSelectedVersion(version)
  }

  const handleClosePreview = () => {
    setSelectedVersion(null)
  }

  const handleRestore = () => {
    setSelectedVersion(null)
    if (onVersionRestore) {
      onVersionRestore()
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="history">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">Version History</TabsTrigger>
          <TabsTrigger value="compare" disabled={!compareVersion1 || !compareVersion2}>
            Compare Versions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <VersionHistory
            contentDraftId={contentDraftId}
            onViewVersion={handleViewVersion}
            onRestoreVersion={handleRestore}
          />
          
          {selectedVersion && (
            <VersionPreview
              version={selectedVersion}
              onClose={handleClosePreview}
            />
          )}
        </TabsContent>

        <TabsContent value="compare">
          {compareVersion1 && compareVersion2 && (
            <VersionDiffComponent
              versionId1={compareVersion1}
              versionId2={compareVersion2}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
