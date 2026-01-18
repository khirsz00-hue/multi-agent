/**
 * Content Engine Architecture
 * Provides enums, types, and mappings for multi-engine content generation
 */

/**
 * Image generation engines
 */
export enum ImageEngine {
  DALL_E = 'dall-e',
  GOOGLE_AI = 'google-ai', // Nano Banana
  REPLICATE = 'replicate'
}

/**
 * Video generation engines
 */
export enum VideoEngine {
  RUNWAY = 'runway',
  PIKA = 'pika' // Default
}

/**
 * Content types supported by the system
 */
export enum ContentType {
  MEME = 'meme',
  DEEP_POST = 'deep_post',
  ENGAGEMENT_POST = 'engagement_post',
  NEWSLETTER = 'newsletter',
  THREAD = 'thread',
  REEL = 'reel',
  SHORT_FORM = 'short_form'
}

/**
 * Default engine mappings for each content type
 */
export const DEFAULT_ENGINE_MAPPINGS: Record<ContentType, {
  imageEngine?: ImageEngine;
  videoEngine?: VideoEngine;
}> = {
  [ContentType.MEME]: {
    imageEngine: ImageEngine.GOOGLE_AI // Fast generation
  },
  [ContentType.DEEP_POST]: {
    imageEngine: ImageEngine.DALL_E // Higher quality for detailed posts
  },
  [ContentType.ENGAGEMENT_POST]: {
    imageEngine: ImageEngine.GOOGLE_AI // Fast, reactive content
  },
  [ContentType.NEWSLETTER]: {
    imageEngine: ImageEngine.DALL_E // Quality for newsletters
  },
  [ContentType.THREAD]: {
    imageEngine: ImageEngine.GOOGLE_AI // Quick generation for threads
  },
  [ContentType.REEL]: {
    videoEngine: VideoEngine.RUNWAY // Creative, dynamic videos
  },
  [ContentType.SHORT_FORM]: {
    videoEngine: VideoEngine.PIKA // Default, reactive video content
  }
}

/**
 * Engine selection options for prioritization
 */
export interface EngineSelectionOptions {
  prioritizeSpeed?: boolean;
  prioritizeQuality?: boolean;
  prioritizeCost?: boolean;
}

/**
 * Select the appropriate engine for a content type with optional user override
 * 
 * Priority order:
 * 1. User-specified engine (if provided)
 * 2. Selection options (speed/quality/cost)
 * 3. Default mapping for content type
 * 
 * @param contentType - Type of content being generated
 * @param userImageEngine - Optional user override for image engine
 * @param userVideoEngine - Optional user override for video engine
 * @param options - Optional selection prioritization
 * @returns Selected engines for the content type
 */
export function selectEngines(
  contentType: ContentType,
  userImageEngine?: ImageEngine,
  userVideoEngine?: VideoEngine,
  options?: EngineSelectionOptions
): {
  imageEngine?: ImageEngine;
  videoEngine?: VideoEngine;
} {
  const defaultMapping = DEFAULT_ENGINE_MAPPINGS[contentType]
  
  // User override takes highest priority
  if (userImageEngine || userVideoEngine) {
    return {
      imageEngine: userImageEngine || defaultMapping.imageEngine,
      videoEngine: userVideoEngine || defaultMapping.videoEngine
    }
  }
  
  // Apply prioritization if specified
  if (options) {
    return applyPrioritization(contentType, defaultMapping, options)
  }
  
  // Return default mapping
  return defaultMapping
}

/**
 * Apply prioritization logic to engine selection
 */
function applyPrioritization(
  contentType: ContentType,
  defaultMapping: { imageEngine?: ImageEngine; videoEngine?: VideoEngine },
  options: EngineSelectionOptions
): { imageEngine?: ImageEngine; videoEngine?: VideoEngine } {
  const result = { ...defaultMapping }
  
  // Speed prioritization
  if (options.prioritizeSpeed && result.imageEngine) {
    result.imageEngine = ImageEngine.GOOGLE_AI // Fastest option
  }
  
  // Quality prioritization
  if (options.prioritizeQuality && result.imageEngine) {
    // Use DALL-E or Replicate for quality
    result.imageEngine = ImageEngine.DALL_E
  }
  
  // Cost prioritization
  if (options.prioritizeCost && result.imageEngine) {
    // Google AI is typically most cost-effective
    result.imageEngine = ImageEngine.GOOGLE_AI
  }
  
  // Video engine prioritization
  if (result.videoEngine) {
    if (options.prioritizeSpeed || options.prioritizeCost) {
      result.videoEngine = VideoEngine.PIKA
    } else if (options.prioritizeQuality) {
      result.videoEngine = VideoEngine.RUNWAY
    }
  }
  
  return result
}

/**
 * Get engine display name for UI
 */
export function getEngineDisplayName(engine: ImageEngine | VideoEngine): string {
  const displayNames: Record<string, string> = {
    [ImageEngine.DALL_E]: 'DALL-E',
    [ImageEngine.GOOGLE_AI]: 'Google AI (Nano Banana)',
    [ImageEngine.REPLICATE]: 'Replicate',
    [VideoEngine.RUNWAY]: 'Runway',
    [VideoEngine.PIKA]: 'Pika'
  }
  
  return displayNames[engine] || engine
}

/**
 * Check if a content type requires video generation
 */
export function isVideoContentType(contentType: ContentType): boolean {
  return contentType === ContentType.REEL || contentType === ContentType.SHORT_FORM
}

/**
 * Validate if an engine supports a specific content type
 */
export function isEngineCompatible(
  contentType: ContentType,
  engine: ImageEngine | VideoEngine
): boolean {
  const mapping = DEFAULT_ENGINE_MAPPINGS[contentType]
  
  // Check if it's a video content type
  const isVideoContent = isVideoContentType(contentType)
  
  if (isVideoContent) {
    return Object.values(VideoEngine).includes(engine as VideoEngine)
  }
  
  return Object.values(ImageEngine).includes(engine as ImageEngine)
}
