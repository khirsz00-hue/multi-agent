/**
 * Pika Video Generation Service
 * 
 * Handles integration with Pika API for reactive, short-form video generation.
 * Optimized for TikTok/Instagram Reels style content.
 */

export interface PikaVideoConfig {
  prompt: string
  duration?: number // 15-60 seconds (default: 30)
  style?: 'cinematic' | 'anime' | 'realistic' | 'abstract' | 'default'
  quality?: 'draft' | 'standard' | 'high' | 'ultra'
  aspectRatio?: '9:16' | '16:9' | '1:1' // Default: 9:16 for vertical video
  fps?: 24 | 30 | 60 // Default: 30
}

export interface PikaTaskResponse {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number // 0-100
  eta?: number // seconds remaining
  videoUrl?: string
  thumbnailUrl?: string
  error?: string
}

export interface PikaStatusResponse extends PikaTaskResponse {
  createdAt?: string
  completedAt?: string
}

/**
 * Pika API Client
 */
export class PikaService {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PIKA_API_KEY || ''
    this.baseUrl = process.env.PIKA_API_URL || 'https://api.pika.art/v1'
    
    if (!this.apiKey) {
      throw new Error('PIKA_API_KEY is required')
    }
  }

  /**
   * Create a new video generation task
   */
  async createVideo(config: PikaVideoConfig): Promise<PikaTaskResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/videos/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: config.prompt,
          duration: config.duration || 30,
          style: config.style || 'default',
          quality: config.quality || 'standard',
          aspect_ratio: config.aspectRatio || '9:16',
          fps: config.fps || 30,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Pika API error: ${error.error || response.statusText}`)
      }

      const data = await response.json()
      
      return {
        taskId: data.task_id || data.id,
        status: this.normalizeStatus(data.status),
        progress: data.progress || 0,
        eta: data.eta_seconds,
      }
    } catch (error: any) {
      console.error('Pika createVideo error:', error)
      throw new Error(`Failed to create Pika video: ${error.message}`)
    }
  }

  /**
   * Check the status of a video generation task
   */
  async getTaskStatus(taskId: string): Promise<PikaStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/videos/status/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Task not found')
        }
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Pika API error: ${error.error || response.statusText}`)
      }

      const data = await response.json()
      
      return {
        taskId: data.task_id || data.id,
        status: this.normalizeStatus(data.status),
        progress: data.progress || 0,
        eta: data.eta_seconds,
        videoUrl: data.video_url || data.url,
        thumbnailUrl: data.thumbnail_url,
        error: data.error_message,
        createdAt: data.created_at,
        completedAt: data.completed_at,
      }
    } catch (error: any) {
      console.error('Pika getTaskStatus error:', error)
      throw new Error(`Failed to get Pika task status: ${error.message}`)
    }
  }

  /**
   * Poll for video completion with exponential backoff
   */
  async pollUntilComplete(
    taskId: string,
    options: {
      maxAttempts?: number
      initialDelay?: number // milliseconds
      maxDelay?: number // milliseconds
      timeout?: number // milliseconds (default: 5 minutes)
    } = {}
  ): Promise<PikaStatusResponse> {
    const {
      maxAttempts = 40, // ~5 minutes with exponential backoff
      initialDelay = 15000, // 15 seconds
      maxDelay = 30000, // 30 seconds
      timeout = 300000, // 5 minutes
    } = options

    const startTime = Date.now()
    let attempt = 0
    let delay = initialDelay

    while (attempt < maxAttempts) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new Error('Video generation timed out after 5 minutes')
      }

      try {
        const status = await this.getTaskStatus(taskId)

        if (status.status === 'completed') {
          return status
        }

        if (status.status === 'failed') {
          throw new Error(status.error || 'Video generation failed')
        }

        // Still processing, wait before next poll
        await this.sleep(delay)

        // Exponential backoff, capped at maxDelay
        delay = Math.min(delay * 1.5, maxDelay)
        attempt++
      } catch (error: any) {
        console.error(`Poll attempt ${attempt + 1} failed:`, error)
        
        // If it's a task not found error, throw immediately
        if (error.message.includes('Task not found')) {
          throw error
        }

        // Otherwise, retry with backoff
        await this.sleep(delay)
        delay = Math.min(delay * 1.5, maxDelay)
        attempt++
      }
    }

    throw new Error('Max polling attempts reached')
  }

  /**
   * Normalize status from various possible formats
   */
  private normalizeStatus(status: string): PikaTaskResponse['status'] {
    const normalized = status.toLowerCase()
    
    if (normalized === 'completed' || normalized === 'success' || normalized === 'done') {
      return 'completed'
    }
    if (normalized === 'processing' || normalized === 'in_progress' || normalized === 'running') {
      return 'processing'
    }
    if (normalized === 'failed' || normalized === 'error') {
      return 'failed'
    }
    return 'pending'
  }

  /**
   * Sleep helper for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Cancel a video generation task
   */
  async cancelTask(taskId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/videos/cancel/${taskId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok && response.status !== 404) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Failed to cancel task: ${error.error || response.statusText}`)
      }
    } catch (error: any) {
      console.error('Pika cancelTask error:', error)
      // Don't throw on cancel errors - it's best effort
    }
  }
}

/**
 * Helper to validate Pika configuration
 */
export function validatePikaConfig(config: Partial<PikaVideoConfig>): string[] {
  const errors: string[] = []

  if (!config.prompt || config.prompt.trim().length === 0) {
    errors.push('Prompt is required')
  }

  if (config.prompt && config.prompt.length > 2000) {
    errors.push('Prompt must be less than 2000 characters')
  }

  if (config.duration && (config.duration < 15 || config.duration > 60)) {
    errors.push('Duration must be between 15 and 60 seconds')
  }

  const validStyles = ['cinematic', 'anime', 'realistic', 'abstract', 'default']
  if (config.style && !validStyles.includes(config.style)) {
    errors.push(`Style must be one of: ${validStyles.join(', ')}`)
  }

  const validQualities = ['draft', 'standard', 'high', 'ultra']
  if (config.quality && !validQualities.includes(config.quality)) {
    errors.push(`Quality must be one of: ${validQualities.join(', ')}`)
  }

  return errors
}
