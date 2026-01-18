/**
 * Video Status Poller
 * 
 * Unified status polling for Runway and Pika video generation engines
 */

export type VideoEngine = 'runway' | 'pika'

export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface VideoStatusResponse {
  task_id: string
  engine: VideoEngine
  status: VideoStatus
  progress: number
  eta_seconds: number | null
  error: string | null
  video_url: string | null
}

interface StatusCache {
  [key: string]: {
    data: VideoStatusResponse
    timestamp: number
  }
}

// In-memory cache for status responses (5 second TTL)
const statusCache: StatusCache = {}
const CACHE_TTL_MS = 5000

/**
 * Get cached status if available and not expired
 */
function getCachedStatus(taskId: string, engine: VideoEngine): VideoStatusResponse | null {
  const cacheKey = `${engine}:${taskId}`
  const cached = statusCache[cacheKey]
  
  if (!cached) return null
  
  const age = Date.now() - cached.timestamp
  if (age > CACHE_TTL_MS) {
    // Expired, remove from cache
    delete statusCache[cacheKey]
    return null
  }
  
  return cached.data
}

/**
 * Cache status response
 */
function cacheStatus(taskId: string, engine: VideoEngine, data: VideoStatusResponse): void {
  const cacheKey = `${engine}:${taskId}`
  statusCache[cacheKey] = {
    data,
    timestamp: Date.now()
  }
}

/**
 * Poll video generation status from external API
 */
export async function pollVideoStatus(
  taskId: string,
  engine: VideoEngine
): Promise<VideoStatusResponse> {
  // Check cache first
  const cached = getCachedStatus(taskId, engine)
  if (cached) {
    return cached
  }
  
  // Poll based on engine
  let response: VideoStatusResponse
  
  if (engine === 'runway') {
    response = await pollRunwayStatus(taskId)
  } else if (engine === 'pika') {
    response = await pollPikaStatus(taskId)
  } else {
    throw new Error(`Unsupported engine: ${engine}`)
  }
  
  // Cache the response
  cacheStatus(taskId, engine, response)
  
  return response
}

/**
 * Poll Runway video generation status
 */
async function pollRunwayStatus(taskId: string): Promise<VideoStatusResponse> {
  const apiKey = process.env.RUNWAY_API_KEY
  
  if (!apiKey) {
    throw new Error('Runway API key not configured')
  }
  
  try {
    const response = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Task not found')
      }
      throw new Error(`Runway API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Map Runway response to unified format
    return {
      task_id: taskId,
      engine: 'runway',
      status: mapRunwayStatus(data.status),
      progress: data.progress || 0,
      eta_seconds: data.estimatedTimeRemaining || null,
      error: data.error || null,
      video_url: data.output?.video_url || null,
    }
  } catch (error: any) {
    // Handle network errors gracefully
    if (error.message.includes('Task not found')) {
      throw error
    }
    
    throw new Error(`Failed to poll Runway status: ${error.message}`)
  }
}

/**
 * Poll Pika video generation status
 */
async function pollPikaStatus(taskId: string): Promise<VideoStatusResponse> {
  const apiKey = process.env.PIKA_API_KEY
  
  if (!apiKey) {
    throw new Error('Pika API key not configured')
  }
  
  try {
    const response = await fetch(`https://api.pika.art/v1/jobs/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Task not found')
      }
      throw new Error(`Pika API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Map Pika response to unified format
    return {
      task_id: taskId,
      engine: 'pika',
      status: mapPikaStatus(data.status),
      progress: data.progress || 0,
      eta_seconds: data.eta || null,
      error: data.errorMessage || null,
      video_url: data.result?.video || null,
    }
  } catch (error: any) {
    // Handle network errors gracefully
    if (error.message.includes('Task not found')) {
      throw error
    }
    
    throw new Error(`Failed to poll Pika status: ${error.message}`)
  }
}

/**
 * Map Runway status to unified status
 */
function mapRunwayStatus(runwayStatus: string): VideoStatus {
  const statusMap: { [key: string]: VideoStatus } = {
    'QUEUED': 'pending',
    'PENDING': 'pending',
    'RUNNING': 'processing',
    'PROCESSING': 'processing',
    'SUCCEEDED': 'completed',
    'COMPLETED': 'completed',
    'FAILED': 'failed',
    'CANCELLED': 'failed',
  }
  
  return statusMap[runwayStatus.toUpperCase()] || 'pending'
}

/**
 * Map Pika status to unified status
 */
function mapPikaStatus(pikaStatus: string): VideoStatus {
  const statusMap: { [key: string]: VideoStatus } = {
    'queued': 'pending',
    'pending': 'pending',
    'processing': 'processing',
    'running': 'processing',
    'completed': 'completed',
    'success': 'completed',
    'failed': 'failed',
    'error': 'failed',
  }
  
  return statusMap[pikaStatus.toLowerCase()] || 'pending'
}

/**
 * Clear cache for a specific task (useful after updates)
 */
export function clearTaskCache(taskId: string, engine: VideoEngine): void {
  const cacheKey = `${engine}:${taskId}`
  delete statusCache[cacheKey]
}
