'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Video, 
  ImageIcon, 
  FileText, 
  MessageSquare, 
  Mail, 
  Twitter,
  Sparkles 
} from 'lucide-react'
import { ContentCreationModal } from './ContentCreationModal'

interface PainPointCardProps {
  painPoint: {
    id: string
    pain_point: string
    category: string
    frequency: number
    sentiment: string
    raw_content?: string
  }
}

export function PainPointCard({ painPoint }: PainPointCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  
  const formats = [
    { id: 'reel', label: 'Reel', icon: Video, color: 'bg-purple-500' },
    { id: 'meme', label: 'Meme', icon: ImageIcon, color: 'bg-pink-500' },
    { id: 'deep_post', label: 'Post', icon: FileText, color: 'bg-blue-500' },
    { id: 'engagement_post', label: 'Engage', icon: MessageSquare, color: 'bg-green-500' },
    { id: 'newsletter', label: 'Newsletter', icon: Mail, color: 'bg-orange-500' },
    { id: 'thread', label: 'Thread', icon: Twitter, color: 'bg-cyan-500' }
  ]
  
  const handleFormatClick = (formatId: string) => {
    setSelectedFormat(formatId)
    setModalOpen(true)
  }
  
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition bg-white">
      {/* Existing pain point display */}
      <div className="mb-3">
        <p className="font-medium text-sm text-gray-900">{painPoint.pain_point}</p>
        <div className="flex gap-2 mt-2 text-xs text-gray-600">
          <span className="px-2 py-1 bg-gray-100 rounded">{painPoint.category}</span>
          <span>Frequency: {painPoint.frequency}</span>
          <span className="capitalize">{painPoint.sentiment}</span>
        </div>
      </div>
      
      {/* NEW: Content creation buttons */}
      <div className="border-t pt-3 mt-3">
        <div className="flex items-center gap-1 mb-2">
          <Sparkles className="h-3 w-3 text-yellow-500" />
          <span className="text-xs font-medium text-gray-700">Create Content:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {formats.map(format => {
            const Icon = format.icon
            return (
              <Button
                key={format.id}
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs hover:bg-gray-50"
                onClick={() => handleFormatClick(format.id)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {format.label}
              </Button>
            )
          })}
        </div>
      </div>
      
      {/* Content Creation Modal */}
      {modalOpen && selectedFormat && (
        <ContentCreationModal
          painPoint={painPoint}
          contentType={selectedFormat}
          onClose={() => {
            setModalOpen(false)
            setSelectedFormat(null)
          }}
        />
      )}
    </div>
  )
}
