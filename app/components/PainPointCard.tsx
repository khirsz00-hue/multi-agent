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
    { id: 'reel', label: 'Reel', icon: Video, color: 'text-purple-600' },
    { id: 'meme', label: 'Meme', icon: ImageIcon, color: 'text-pink-600' },
    { id: 'deep_post', label: 'Post', icon: FileText, color: 'text-blue-600' },
    { id: 'engagement_post', label: 'Engage', icon: MessageSquare, color: 'text-green-600' },
    { id: 'newsletter', label: 'Newsletter', icon: Mail, color: 'text-orange-600' },
    { id: 'thread', label: 'Thread', icon: Twitter, color: 'text-cyan-600' }
  ]
  
  const handleFormatClick = (formatId: string) => {
    setSelectedFormat(formatId)
    setModalOpen(true)
  }
  
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      {/* Pain Point Content */}
      <div className="mb-3">
        <p className="font-medium text-sm text-gray-900 mb-2">
          {painPoint.pain_point}
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
            {painPoint.category}
          </span>
          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
            Frequency: {painPoint.frequency}
          </span>
          <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded capitalize">
            {painPoint.sentiment}
          </span>
        </div>
      </div>
      
      {/* Content Creation Buttons */}
      <div className="border-t pt-3 mt-3">
        <div className="flex items-center gap-1 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
          <span className="text-xs font-semibold text-gray-700">Create Content:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {formats.map(format => {
            const Icon = format.icon
            return (
              <Button
                key={format.id}
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs hover:bg-gray-50"
                onClick={() => handleFormatClick(format.id)}
              >
                <Icon className={`h-3.5 w-3.5 mr-1.5 ${format.color}`} />
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
