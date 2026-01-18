'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface VideoTask {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  engine?: string
  video_type?: string
  error_message?: string
  video_url?: string
  estimated_completion_time?: number
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  completed_at?: string
}

interface UseVideoPollingOptions {
  taskId: string | null
  pollingInterval?: number // milliseconds, default 15000 (15 seconds)
  onComplete?: (task: VideoTask) => void
  onError?: (error: string) => void
  enabled?: boolean
}

export function useVideoPolling({
  taskId,
  pollingInterval = 15000,
  onComplete,
  onError,
  enabled = true
}: UseVideoPollingOptions) {
  const [task, setTask] = useState<VideoTask | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const fetchStatus = useCallback(async () => {
    if (!taskId || !enabled) return

    try {
      setLoading(true)
      const response = await fetch(`/api/video/status/${taskId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch video status')
      }

      const data = await response.json()
      
      if (!mountedRef.current) return
      
      setTask(data.task)
      setError(null)

      // Handle completion
      if (data.task.status === 'completed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        onComplete?.(data.task)
      }

      // Handle failure
      if (data.task.status === 'failed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        const errorMsg = data.task.error_message || 'Video generation failed'
        setError(errorMsg)
        onError?.(errorMsg)
      }
      
      return data.task.status
    } catch (err: any) {
      if (!mountedRef.current) return
      
      const errorMsg = err.message || 'Failed to check video status'
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [taskId, enabled, onComplete, onError])

  // Start polling when taskId is available and task is not complete
  useEffect(() => {
    if (!taskId || !enabled) return

    // Initial fetch
    const startPolling = async () => {
      try {
        const status = await fetchStatus()
        
        // Only set up polling if task is not complete or failed
        if (status === 'completed' || status === 'failed') {
          return
        }
        
        // Set up polling interval
        intervalRef.current = setInterval(async () => {
          try {
            const currentStatus = await fetchStatus()
            
            // Stop polling if task is complete or failed
            if (currentStatus === 'completed' || currentStatus === 'failed') {
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
              }
            }
          } catch (error) {
            console.error('Polling error:', error)
            // Clear interval on persistent errors
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
          }
        }, pollingInterval)
      } catch (error) {
        console.error('Initial fetch error:', error)
      }
    }
    
    startPolling()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [taskId, enabled, pollingInterval, fetchStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const retry = useCallback(() => {
    setError(null)
    fetchStatus()
  }, [fetchStatus])

  return {
    task,
    loading,
    error,
    stopPolling,
    retry,
    isPolling: intervalRef.current !== null
  }
}
