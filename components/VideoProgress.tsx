'use client'

import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface VideoProgressProps {
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  engine?: string
  estimatedTime?: number // seconds
  errorMessage?: string
}

export default function VideoProgress({
  status,
  progress,
  engine,
  estimatedTime,
  errorMessage
}: VideoProgressProps) {
  const getEngineDisplayName = (engineName?: string): string => {
    if (!engineName) return 'AI'
    
    const engineMap: Record<string, string> = {
      'pika': 'Pika',
      'runway': 'Runway',
      'd-id': 'D-ID',
      'heygen': 'HeyGen',
      'remotion': 'Remotion',
      'creatomate': 'Creatomate'
    }
    
    return engineMap[engineName.toLowerCase()] || engineName
  }
  
  const getStatusIcon = () => {
    switch (status) {
      case 'queued':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'queued':
        return 'Your video is queued...'
      case 'processing':
        const engineName = getEngineDisplayName(engine)
        const timeMsg = estimatedTime 
          ? ` ${Math.floor(estimatedTime / 60)}:${String(estimatedTime % 60).padStart(2, '0')} remaining`
          : ''
        return `Generating with ${engineName}...${timeMsg}`
      case 'completed':
        return '✅ Done! Processing...'
      case 'failed':
        return errorMessage || 'Generation failed'
      default:
        return ''
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'queued':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return ''
    }
  }

  const getEncouragingMessage = () => {
    if (status === 'queued') {
      return 'Hang tight! Your video will start processing soon.'
    }
    if (status === 'processing') {
      if (progress < 30) {
        return '🎬 Creating your masterpiece...'
      } else if (progress < 60) {
        return '✨ Looking great so far!'
      } else if (progress < 90) {
        return '🚀 Almost there!'
      } else {
        return '🎉 Final touches...'
      }
    }
    if (status === 'completed') {
      return 'Your video is ready! 🎥'
    }
    return null
  }

  return (
    <div className={`space-y-4 p-4 rounded-lg border ${getStatusColor()}`}>
      {/* Status Header */}
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="font-medium">{getStatusMessage()}</p>
          {status === 'processing' && (
            <p className="text-sm text-gray-600 mt-0.5">
              {progress}% complete
            </p>
          )}
        </div>
        {engine && status !== 'failed' && (
          <Badge variant="secondary" className="capitalize">
            {engine}
          </Badge>
        )}
      </div>

      {/* Progress Bar - Show for queued and processing */}
      {(status === 'queued' || status === 'processing') && (
        <div className="space-y-2">
          <Progress 
            value={status === 'queued' ? 5 : progress} 
            className="h-2"
          />
          {/* Encouraging Message */}
          {getEncouragingMessage() && (
            <p className="text-sm text-center text-gray-600 animate-pulse">
              {getEncouragingMessage()}
            </p>
          )}
        </div>
      )}

      {/* Completed Message */}
      {status === 'completed' && getEncouragingMessage() && (
        <p className="text-sm text-center font-medium">
          {getEncouragingMessage()}
        </p>
      )}

      {/* Error Message */}
      {status === 'failed' && errorMessage && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
