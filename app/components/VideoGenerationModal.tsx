'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, Video, Clock } from 'lucide-react'

interface VideoGenerationModalProps {
  open: boolean
  jobId: string
  estimatedTime: number // in seconds
  onComplete: (videoUrl: string) => void
  onError: (error: string) => void
  onClose: () => void
}

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  videoUrl?: string
  error?: string
  estimatedCompletion?: string
}

export function VideoGenerationModal({
  open,
  jobId,
  estimatedTime,
  onComplete,
  onError,
  onClose
}: VideoGenerationModalProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus>({ status: 'pending' })
  const [elapsedTime, setElapsedTime] = useState(0)
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

  // Calculate progress based on elapsed time
  const progress = Math.min(
    (elapsedTime / estimatedTime) * 100,
    jobStatus.progress || 95 // Cap at 95% until actually complete
  )

  // Format time remaining
  const timeRemaining = Math.max(0, estimatedTime - elapsedTime)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  // Poll for job status
  const checkJobStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/content/video-status/${jobId}`)
      
      if (!res.ok) {
        throw new Error('Failed to check video status')
      }

      const data = await res.json()
      setJobStatus(data)

      if (data.status === 'completed' && data.videoUrl) {
        // Stop polling and notify completion
        if (pollInterval) {
          clearInterval(pollInterval)
          setPollInterval(null)
        }
        onComplete(data.videoUrl)
      } else if (data.status === 'failed') {
        // Stop polling and notify error
        if (pollInterval) {
          clearInterval(pollInterval)
          setPollInterval(null)
        }
        onError(data.error || 'Video generation failed')
      }
    } catch (error: any) {
      console.error('Error checking job status:', error)
      if (pollInterval) {
        clearInterval(pollInterval)
        setPollInterval(null)
      }
      onError(error.message)
    }
  }, [jobId, pollInterval, onComplete, onError])

  // Start polling when modal opens
  useEffect(() => {
    if (!open || !jobId) return

    // Initial check
    checkJobStatus()

    // Set up polling with exponential backoff
    let delay = 2000 // Start with 2 seconds
    const maxDelay = 10000 // Max 10 seconds between polls

    const poll = () => {
      checkJobStatus()
      
      // Increase delay for next poll (exponential backoff)
      delay = Math.min(delay * 1.2, maxDelay)
    }

    const interval = setInterval(poll, delay)
    setPollInterval(interval)

    // Elapsed time counter
    const timeCounter = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    // Cleanup
    return () => {
      if (interval) clearInterval(interval)
      if (timeCounter) clearInterval(timeCounter)
    }
  }, [open, jobId, checkJobStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [pollInterval])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Generating Video
          </DialogTitle>
          <DialogDescription>
            Your video is being generated. This usually takes {formatTime(estimatedTime)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Display */}
          {jobStatus.status === 'pending' && (
            <Alert className="bg-blue-50 border-blue-200">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-900">
                Your video is in the queue...
              </AlertDescription>
            </Alert>
          )}

          {jobStatus.status === 'processing' && (
            <Alert className="bg-purple-50 border-purple-200">
              <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
              <AlertDescription className="text-purple-900">
                Processing your video...
              </AlertDescription>
            </Alert>
          )}

          {jobStatus.status === 'completed' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Video generated successfully!
              </AlertDescription>
            </Alert>
          )}

          {jobStatus.status === 'failed' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {jobStatus.error || 'Video generation failed. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Bar */}
          {(jobStatus.status === 'pending' || jobStatus.status === 'processing') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Time Information */}
          {(jobStatus.status === 'pending' || jobStatus.status === 'processing') && (
            <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Elapsed: {formatTime(elapsedTime)}</span>
              </div>
              <div className="text-gray-600">
                Remaining: ~{formatTime(timeRemaining)}
              </div>
            </div>
          )}

          {/* Estimated Completion */}
          {jobStatus.estimatedCompletion && jobStatus.status === 'processing' && (
            <p className="text-xs text-gray-500 text-center">
              Estimated completion: {new Date(jobStatus.estimatedCompletion).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {jobStatus.status === 'failed' && (
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          )}
          
          {(jobStatus.status === 'pending' || jobStatus.status === 'processing') && (
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Run in Background
            </Button>
          )}

          {jobStatus.status === 'completed' && (
            <Button onClick={onClose} className="w-full">
              Continue
            </Button>
          )}
        </div>

        {/* Background Processing Note */}
        {(jobStatus.status === 'pending' || jobStatus.status === 'processing') && (
          <p className="text-xs text-gray-500 text-center">
            You can close this modal and continue working. We&apos;ll notify you when it&apos;s ready.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
