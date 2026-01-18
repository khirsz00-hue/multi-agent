/**
 * Engine Configuration Constants
 * Default configurations for image and video generation engines
 */

import { ImageEngine, VideoEngine, ContentType } from '../content-engines'
import { EngineCapabilities } from '../types/content'

/**
 * Image quality settings per engine
 */
export const IMAGE_QUALITY_SETTINGS = {
  [ImageEngine.DALL_E]: {
    standard: {
      quality: 'standard' as const,
      size: '1024x1024' as const,
      description: 'Balanced quality and speed'
    },
    hd: {
      quality: 'hd' as const,
      size: '1024x1024' as const,
      description: 'High quality, slower generation'
    }
  },
  [ImageEngine.GOOGLE_AI]: {
    fast: {
      quality: 'fast' as const,
      size: '1024x1024' as const,
      description: 'Fastest generation, good quality'
    },
    balanced: {
      quality: 'balanced' as const,
      size: '1024x1024' as const,
      description: 'Balanced speed and quality'
    }
  },
  [ImageEngine.REPLICATE]: {
    standard: {
      quality: 'standard' as const,
      size: '1024x1024' as const,
      description: 'Community models, variable quality'
    },
    premium: {
      quality: 'premium' as const,
      size: '1024x1024' as const,
      description: 'Premium models, best quality'
    }
  }
} as const

/**
 * Video generation settings per engine
 */
export const VIDEO_GENERATION_SETTINGS = {
  [VideoEngine.RUNWAY]: {
    standard: {
      resolution: '1280x720' as const,
      codec: 'h264' as const,
      fps: 24,
      duration: 4,
      description: 'Creative, dynamic videos with cinematic quality'
    },
    hd: {
      resolution: '1920x1080' as const,
      codec: 'h264' as const,
      fps: 30,
      duration: 4,
      description: 'High definition, professional quality'
    }
  },
  [VideoEngine.PIKA]: {
    fast: {
      resolution: '1024x576' as const,
      codec: 'h264' as const,
      fps: 24,
      duration: 3,
      description: 'Fast generation, good for reactive content'
    },
    standard: {
      resolution: '1280x720' as const,
      codec: 'h264' as const,
      fps: 24,
      duration: 3,
      description: 'Default quality, fast and reliable'
    }
  }
} as const

/**
 * Cost and speed tradeoffs per engine
 */
export const ENGINE_TRADEOFFS = {
  [ImageEngine.DALL_E]: {
    cost: 0.04, // USD per image (1024x1024 standard)
    speed: 'medium', // 10-15 seconds
    quality: 9,
    avgGenerationTimeMs: 12000,
    description: 'High quality, moderate cost, proven reliability'
  },
  [ImageEngine.GOOGLE_AI]: {
    cost: 0.02, // USD per image (estimated)
    speed: 'fast', // 5-8 seconds
    quality: 7,
    avgGenerationTimeMs: 6000,
    description: 'Fastest option, lower cost, good quality (Nano Banana)'
  },
  [ImageEngine.REPLICATE]: {
    cost: 0.01, // USD per image (varies by model)
    speed: 'slow', // 15-30 seconds
    quality: 8,
    avgGenerationTimeMs: 20000,
    description: 'Community models, lowest cost, variable quality'
  },
  [VideoEngine.RUNWAY]: {
    cost: 0.50, // USD per 4-second video
    speed: 'slow', // 60-90 seconds
    quality: 10,
    avgGenerationTimeMs: 75000,
    description: 'Premium quality, creative controls, highest cost'
  },
  [VideoEngine.PIKA]: {
    cost: 0.25, // USD per 3-second video (estimated)
    speed: 'medium', // 30-45 seconds
    quality: 8,
    avgGenerationTimeMs: 35000,
    description: 'Good balance of speed and quality, default choice'
  }
} as const

/**
 * Engine capabilities by engine type
 */
export const ENGINE_CAPABILITIES: Record<ImageEngine | VideoEngine, EngineCapabilities> = {
  [ImageEngine.DALL_E]: {
    supportedContentTypes: [
      ContentType.MEME,
      ContentType.DEEP_POST,
      ContentType.ENGAGEMENT_POST,
      ContentType.NEWSLETTER,
      ContentType.THREAD
    ],
    maxResolution: { width: 1024, height: 1024 },
    supportedFormats: ['png'],
    avgGenerationTime: 12,
    costPerGeneration: 0.04,
    qualityRating: 9
  },
  [ImageEngine.GOOGLE_AI]: {
    supportedContentTypes: [
      ContentType.MEME,
      ContentType.ENGAGEMENT_POST,
      ContentType.THREAD
    ],
    maxResolution: { width: 1024, height: 1024 },
    supportedFormats: ['png', 'jpeg'],
    avgGenerationTime: 6,
    costPerGeneration: 0.02,
    qualityRating: 7
  },
  [ImageEngine.REPLICATE]: {
    supportedContentTypes: [
      ContentType.MEME,
      ContentType.DEEP_POST,
      ContentType.ENGAGEMENT_POST,
      ContentType.NEWSLETTER,
      ContentType.THREAD
    ],
    maxResolution: { width: 1024, height: 1024 },
    supportedFormats: ['png', 'jpeg', 'webp'],
    avgGenerationTime: 20,
    costPerGeneration: 0.01,
    qualityRating: 8
  },
  [VideoEngine.RUNWAY]: {
    supportedContentTypes: [
      ContentType.REEL,
      ContentType.SHORT_FORM
    ],
    maxResolution: { width: 1920, height: 1080 },
    supportedFormats: ['mp4', 'webm'],
    avgGenerationTime: 75,
    costPerGeneration: 0.50,
    qualityRating: 10
  },
  [VideoEngine.PIKA]: {
    supportedContentTypes: [
      ContentType.REEL,
      ContentType.SHORT_FORM
    ],
    maxResolution: { width: 1280, height: 720 },
    supportedFormats: ['mp4'],
    avgGenerationTime: 35,
    costPerGeneration: 0.25,
    qualityRating: 8
  }
}

/**
 * Default quality preset per content type
 */
export const DEFAULT_QUALITY_PRESETS: Record<ContentType, string> = {
  [ContentType.MEME]: 'fast', // Speed matters for memes
  [ContentType.DEEP_POST]: 'hd', // Quality matters for detailed posts
  [ContentType.ENGAGEMENT_POST]: 'fast', // Quick turnaround
  [ContentType.NEWSLETTER]: 'hd', // Professional quality
  [ContentType.THREAD]: 'fast', // Multiple images, speed preferred
  [ContentType.REEL]: 'hd', // Video quality matters
  [ContentType.SHORT_FORM]: 'standard' // Balance for short form
}

/**
 * API configuration per engine
 */
export const ENGINE_API_CONFIG = {
  [ImageEngine.DALL_E]: {
    model: 'dall-e-3',
    maxRetries: 3,
    timeout: 30000,
    rateLimit: {
      requestsPerMinute: 5,
      requestsPerDay: 50
    }
  },
  [ImageEngine.GOOGLE_AI]: {
    model: 'imagen-2', // Nano Banana
    maxRetries: 3,
    timeout: 15000,
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerDay: 100
    }
  },
  [ImageEngine.REPLICATE]: {
    model: 'stability-ai/sdxl',
    maxRetries: 3,
    timeout: 60000,
    rateLimit: {
      requestsPerMinute: 3,
      requestsPerDay: 30
    }
  },
  [VideoEngine.RUNWAY]: {
    model: 'gen-2',
    maxRetries: 2,
    timeout: 120000,
    rateLimit: {
      requestsPerMinute: 2,
      requestsPerDay: 20
    }
  },
  [VideoEngine.PIKA]: {
    model: 'pika-1.0',
    maxRetries: 2,
    timeout: 60000,
    rateLimit: {
      requestsPerMinute: 3,
      requestsPerDay: 30
    }
  }
} as const

/**
 * Get recommended engine based on requirements
 */
export function getRecommendedEngine(
  contentType: ContentType,
  priority: 'speed' | 'quality' | 'cost'
): ImageEngine | VideoEngine {
  const isVideoContent = 
    contentType === ContentType.REEL || contentType === ContentType.SHORT_FORM
  
  if (isVideoContent) {
    switch (priority) {
      case 'speed':
      case 'cost':
        return VideoEngine.PIKA
      case 'quality':
        return VideoEngine.RUNWAY
    }
  }
  
  switch (priority) {
    case 'speed':
    case 'cost':
      return ImageEngine.GOOGLE_AI
    case 'quality':
      return ImageEngine.DALL_E
  }
}

/**
 * Get engine configuration
 */
export function getEngineConfig(engine: ImageEngine | VideoEngine) {
  if (Object.values(ImageEngine).includes(engine as ImageEngine)) {
    return {
      qualitySettings: IMAGE_QUALITY_SETTINGS[engine as ImageEngine],
      tradeoffs: ENGINE_TRADEOFFS[engine],
      capabilities: ENGINE_CAPABILITIES[engine],
      apiConfig: ENGINE_API_CONFIG[engine]
    }
  }
  
  return {
    generationSettings: VIDEO_GENERATION_SETTINGS[engine as VideoEngine],
    tradeoffs: ENGINE_TRADEOFFS[engine],
    capabilities: ENGINE_CAPABILITIES[engine],
    apiConfig: ENGINE_API_CONFIG[engine]
  }
}
