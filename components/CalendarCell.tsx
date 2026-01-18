'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Video, 
  ImageIcon, 
  FileText, 
  Mail, 
  Twitter,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  Send,
  Copy
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface CalendarCellProps {
  draft: any
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  onClick?: (draft: any) => void
  onEdit?: (draft: any) => void
  onDelete?: (id: string) => void
  onStatusChange?: (id: string, status: string) => void
  onCopy?: (draft: any) => void
  showCheckbox?: boolean
}

const getContentIcon = (type: string) => {
  const icons: Record<string, any> = {
    reel: Video,
    meme: ImageIcon,
    deep_post: FileText,
    engagement_post: FileText,
    post: FileText,
    newsletter: Mail,
    thread: Twitter
  }
  return icons[type] || FileText
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-300',
    ready: 'bg-green-100 text-green-700 border-green-300',
    scheduled: 'bg-blue-100 text-blue-700 border-blue-300',
    posted: 'bg-purple-100 text-purple-700 border-purple-300',
    published: 'bg-purple-100 text-purple-700 border-purple-300'
  }
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300'
}

const getEngineColor = (engine: string) => {
  const colors: Record<string, string> = {
    'gpt-4': 'border-l-green-500',
    'gpt-3.5': 'border-l-blue-500',
    'claude': 'border-l-purple-500',
    'gemini': 'border-l-orange-500',
    'default': 'border-l-gray-500'
  }
  return colors[engine] || colors['default']
}

export default function CalendarCell({
  draft,
  isSelected = false,
  onSelect,
  onClick,
  onEdit,
  onDelete,
  onStatusChange,
  onCopy,
  showCheckbox = false
}: CalendarCellProps) {
  const [isHovered, setIsHovered] = useState(false)
  const Icon = getContentIcon(draft.content_type)
  const engineColor = getEngineColor(draft.engine || 'default')

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    onClick?.(draft)
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              relative p-3 rounded-lg border-l-4 ${engineColor} 
              border border-gray-200 bg-white
              hover:shadow-md transition-all cursor-pointer
              ${isSelected ? 'ring-2 ring-blue-500' : ''}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
          >
            {/* Checkbox for bulk selection */}
            {showCheckbox && (
              <div 
                className="absolute top-2 left-2 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelect?.(draft.id, checked as boolean)}
                />
              </div>
            )}

            {/* Content */}
            <div className={`flex items-start gap-2 ${showCheckbox ? 'ml-6' : ''}`}>
              <div className="p-1.5 bg-blue-50 rounded flex-shrink-0">
                <Icon className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs truncate leading-tight">
                  {draft.hook || draft.title || 'Untitled'}
                </p>
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] px-1.5 py-0 h-5 ${getStatusColor(draft.status)}`}
                  >
                    {draft.status}
                  </Badge>
                  {draft.scheduled_date && (
                    <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(draft.scheduled_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions dropdown */}
              {isHovered && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => onEdit?.(draft)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCopy?.(draft)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </DropdownMenuItem>
                    {draft.status !== 'posted' && draft.status !== 'published' && (
                      <DropdownMenuItem onClick={() => onStatusChange?.(draft.id, 'scheduled')}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule
                      </DropdownMenuItem>
                    )}
                    {(draft.status === 'scheduled' || draft.status === 'ready') && (
                      <DropdownMenuItem onClick={() => onStatusChange?.(draft.id, 'published')}>
                        <Send className="h-4 w-4 mr-2" />
                        Mark Published
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(draft.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </TooltipTrigger>
        
        {/* Hover preview */}
        <TooltipContent side="right" className="max-w-sm p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-sm">
                {draft.content_type.replace('_', ' ')}
              </span>
            </div>
            <div className="text-xs text-gray-600 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
              {draft.hook || draft.body || draft.content || 'No content preview'}
            </div>
            {draft.audience_insights?.pain_point && (
              <div className="text-xs text-gray-500 pt-2 border-t">
                <span className="font-medium">Addresses:</span> {draft.audience_insights.pain_point}
              </div>
            )}
            {draft.tone && (
              <div className="text-xs text-gray-500">
                <span className="font-medium">Tone:</span> {draft.tone}
              </div>
            )}
            {draft.engine && (
              <div className="text-xs text-gray-500">
                <span className="font-medium">Engine:</span> {draft.engine}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
