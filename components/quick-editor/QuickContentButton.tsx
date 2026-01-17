'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Twitter, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface QuickContentButtonProps {
  agentId: string
  onGenerated?: (draftId: string) => void
}

export default function QuickContentButton({ agentId, onGenerated }: QuickContentButtonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Content Editors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600">
          Generate engagement posts or Twitter threads with AI, then edit them directly inline.
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/quick-generate?agentId=${agentId}&type=engagement_post`}>
            <Button variant="outline" className="w-full h-auto py-3">
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-sm">Engagement Post</span>
              </div>
            </Button>
          </Link>
          
          <Link href={`/quick-generate?agentId=${agentId}&type=thread`}>
            <Button variant="outline" className="w-full h-auto py-3">
              <div className="flex flex-col items-center gap-2">
                <Twitter className="h-5 w-5 text-blue-600" />
                <span className="text-sm">Twitter Thread</span>
              </div>
            </Button>
          </Link>
        </div>
        
        <Link href="/quick-generate">
          <Button variant="link" className="w-full text-sm">
            <ExternalLink className="h-3 w-3 mr-1" />
            Open Full Generator
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
