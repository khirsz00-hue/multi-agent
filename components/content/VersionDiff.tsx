'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'

interface VersionDiff {
  field: string
  oldValue: any
  newValue: any
  changeType: 'added' | 'removed' | 'modified'
}

interface VersionDiffProps {
  versionId1: string
  versionId2: string
}

export default function VersionDiffComponent({
  versionId1,
  versionId2
}: VersionDiffProps) {
  const [diffs, setDiffs] = useState<VersionDiff[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDiff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId1, versionId2])

  async function loadDiff() {
    try {
      setLoading(true)
      const res = await fetch('/api/content/version-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId1, versionId2 })
      })
      const data = await res.json()
      
      if (res.ok) {
        setDiffs(data.diff || [])
      } else {
        console.error('Failed to load diff:', data.error)
      }
    } catch (error) {
      console.error('Error loading diff:', error)
    } finally {
      setLoading(false)
    }
  }

  const getChangeTypeBadge = (type: VersionDiff['changeType']) => {
    const badges = {
      added: <Badge variant="default" className="bg-green-500">Added</Badge>,
      removed: <Badge variant="destructive">Removed</Badge>,
      modified: <Badge variant="secondary">Modified</Badge>
    }
    return badges[type]
  }

  const renderValue = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">empty</span>
    }
    if (Array.isArray(value)) {
      return <span>{value.join(', ')}</span>
    }
    if (typeof value === 'object') {
      return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
    }
    return <span>{String(value)}</span>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading comparison...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Version Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        {diffs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No differences found</p>
        ) : (
          <div className="space-y-4">
            {diffs.map((diff, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">
                    {diff.field.replace(/_/g, ' ')}
                  </span>
                  {getChangeTypeBadge(diff.changeType)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Old Value</p>
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      {renderValue(diff.oldValue)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">New Value</p>
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      {renderValue(diff.newValue)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center text-muted-foreground">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
