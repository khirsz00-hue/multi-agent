/**
 * Content Generation Type Definitions
 * Core types for multi-engine content generation requests
 */

import { ImageEngine, VideoEngine, ContentType } from '../content-engines'

/**
 * Content generation request interface
 */
export interface ContentGenerationRequest {
  /**
   * ID of the pain point to generate content for
   */
  painPointId: string
  
  /**
   * Type of content to generate
   */
  contentType: ContentType
  
  /**
   * Optional user override for image engine selection
   */
  imageEngine?: ImageEngine
  
  /**
   * Optional user override for video engine selection
   */
  videoEngine?: VideoEngine
  
  /**
   * Optional generation options
   */
  options?: GenerationOptions
}

/**
 * Options for content generation
 */
export interface GenerationOptions {
  /**
   * Tone of the content (e.g., 'humorous', 'professional', 'empathetic')
   */
  tone?: string
  
  /**
   * Goal of the content (e.g., 'viral', 'engagement', 'education')
   */
  goal?: string
  
  /**
   * Style preferences (e.g., 'minimalist', 'bold', 'playful')
   */
  style?: string
  
  /**
   * Additional notes or instructions for content generation
   */
  additionalNotes?: string
  
  /**
   * Target platform (e.g., 'instagram', 'twitter', 'linkedin')
   */
  targetPlatform?: string
  
  /**
   * Brand voice override
   */
  brandVoice?: string
}

/**
 * Content generation response
 */
export interface ContentGenerationResponse {
  /**
   * Whether generation was successful
   */
  success: boolean
  
  /**
   * Generated content draft
   */
  contentDraft?: {
    id: string
    contentType: ContentType
    content: Record<string, unknown>
    metadata: ContentMetadata
  }
  
  /**
   * Generated media (image or video)
   */
  media?: GeneratedMedia
  
  /**
   * Error message if generation failed
   */
  error?: string
}

/**
 * Metadata for generated content
 */
export interface ContentMetadata {
  /**
   * Engine used for generation
   */
  engine: ImageEngine | VideoEngine
  
  /**
   * Generation timestamp
   */
  generatedAt: string
  
  /**
   * Model version used
   */
  modelVersion?: string
  
  /**
   * Original prompt
   */
  originalPrompt?: string
  
  /**
   * Cost estimate (in credits or dollars)
   */
  estimatedCost?: number
  
  /**
   * Generation time in milliseconds
   */
  generationTimeMs?: number
}

/**
 * Generated media (image or video)
 */
export interface GeneratedMedia {
  /**
   * Media type
   */
  type: 'image' | 'video'
  
  /**
   * Public URL to the media
   */
  url: string
  
  /**
   * Storage path
   */
  storagePath: string
  
  /**
   * Media dimensions
   */
  dimensions?: {
    width: number
    height: number
  }
  
  /**
   * File size in bytes
   */
  fileSize?: number
  
  /**
   * Format (e.g., 'png', 'jpeg', 'mp4')
   */
  format?: string
  
  /**
   * Duration in seconds (for videos)
   */
  duration?: number
}

/**
 * Engine capabilities
 */
export interface EngineCapabilities {
  /**
   * Supported content types
   */
  supportedContentTypes: ContentType[]
  
  /**
   * Maximum resolution
   */
  maxResolution: {
    width: number
    height: number
  }
  
  /**
   * Supported formats
   */
  supportedFormats: string[]
  
  /**
   * Average generation time in seconds
   */
  avgGenerationTime: number
  
  /**
   * Cost per generation
   */
  costPerGeneration: number
  
  /**
   * Quality rating (1-10)
   */
  qualityRating: number
}

/**
 * Content generation status
 */
export enum GenerationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Content generation job
 */
export interface ContentGenerationJob {
  /**
   * Job ID
   */
  id: string
  
  /**
   * Generation request
   */
  request: ContentGenerationRequest
  
  /**
   * Current status
   */
  status: GenerationStatus
  
  /**
   * Progress percentage (0-100)
   */
  progress: number
  
  /**
   * Result if completed
   */
  result?: ContentGenerationResponse
  
  /**
   * Error details if failed
   */
  error?: {
    message: string
    code?: string
    details?: Record<string, unknown>
  }
  
  /**
   * Job timestamps
   */
  timestamps: {
    createdAt: string
    startedAt?: string
    completedAt?: string
  }
}
