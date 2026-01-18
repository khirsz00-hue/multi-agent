'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, Download, ArrowLeft } from 'lucide-react'
import VideoProgress from './VideoProgress'
import { useVideoPolling } from '@/hooks/useVideoPolling'

interface VideoGenerationModalProps {
  open: boolean
  onClose: () => void
  taskId: string | null
  onVideoReady?: (videoUrl: string) => void
  draftId?: string
}

export default function VideoGenerationModal({
  open,
  onClose,
  taskId,
  onVideoReady,
  draftId
}: VideoGenerationModalProps) {
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null)

  const { task, error, retry } = useVideoPolling({
    taskId,
    enabled: open && !!taskId,
    onComplete: (completedTask) => {
      if (completedTask.video_url) {
        setVideoPreviewUrl(completedTask.video_url)
        onVideoReady?.(completedTask.video_url)
        
        // Auto-close after 3 seconds on completion
        const timer = setTimeout(() => {
          handleClose()
        }, 3000)
        setAutoCloseTimer(timer)
      }
    },
    onError: (errorMsg) => {
      console.error('Video generation error:', errorMsg)
    }
  })

  useEffect(() => {
    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer)
      }
    }
  }, [autoCloseTimer])

  const handleClose = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer)
      setAutoCloseTimer(null)
    }
    setVideoPreviewUrl(null)
    onClose()
  }

  const handleRetry = async () => {
    if (!draftId) return
    
    try {
      // Re-initiate video generation
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      })

      if (!response.ok) throw new Error('Failed to retry video generation')

      const data = await response.json()
      
      // The new taskId will be handled by the parent component
      // For now, just retry polling the current task
      retry()
    } catch (err: any) {
      console.error('Retry error:', err)
      alert(err.message || 'Failed to retry video generation')
    }
  }

  const handleDownload = () => {
    if (videoPreviewUrl) {
      window.open(videoPreviewUrl, '_blank')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {task?.status === 'completed' ? 'Video Ready!' : 'Generating Video'}
          </DialogTitle>
          <DialogDescription>
            {task?.status === 'completed' 
              ? 'Your video has been generated successfully'
              : 'Please wait while we generate your video'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Display */}
          {task && (
            <VideoProgress
              status={task.status}
              progress={task.progress}
              engine={task.engine}
              estimatedTime={task.estimated_completion_time}
              errorMessage={task.error_message}
            />
          )}

          {/* Video Preview */}
          {task?.status === 'completed' && videoPreviewUrl && (
            <div className="space-y-3">
              <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleDownload}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Save Video
                </Button>
                <Button 
                  onClick={handleClose}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Editor
                </Button>
              </div>
            </div>
          )}

          {/* Error State with Retry */}
          {task?.status === 'failed' && (
            <div className="space-y-3">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900">Generation Failed</h4>
                    <p className="text-sm text-red-700 mt-1">
                      {task.error_message || 'An error occurred while generating your video'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={handleClose}
                  variant="ghost"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Loading/Processing State Actions */}
          {(task?.status === 'queued' || task?.status === 'processing') && (
            <Button 
              onClick={handleClose}
              variant="ghost"
              className="w-full"
            >
              Continue in Background
            </Button>
          )}

          {/* Error fetching task */}
          {error && !task && (
            <div className="space-y-3">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900">Connection Error</h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={retry}
                  variant="outline"
                  className="flex-1"
                >
                  Retry
                </Button>
                <Button 
                  onClick={handleClose}
                  variant="ghost"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
