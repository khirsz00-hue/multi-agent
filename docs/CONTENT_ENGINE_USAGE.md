# Content Engine Architecture - Usage Examples

This document demonstrates how to use the new content engine architecture for multi-engine content generation.

## Basic Usage

### 1. Importing the modules

```typescript
import { 
  ImageEngine, 
  VideoEngine, 
  ContentType,
  selectEngines,
  getEngineDisplayName,
  isVideoContentType,
  isEngineCompatible
} from '@/lib/content-engines'

import { 
  ContentGenerationRequest,
  GenerationOptions 
} from '@/lib/types/content'

import { 
  getRecommendedEngine,
  getEngineConfig,
  ENGINE_CAPABILITIES,
  DEFAULT_QUALITY_PRESETS
} from '@/lib/constants/engines'
```

### 2. Creating a content generation request

```typescript
// Basic request with default engine
const request: ContentGenerationRequest = {
  painPointId: 'pain-point-123',
  contentType: ContentType.MEME,
  options: {
    tone: 'humorous',
    goal: 'viral',
    style: 'bold'
  }
}

// Request with custom engine override
const requestWithOverride: ContentGenerationRequest = {
  painPointId: 'pain-point-456',
  contentType: ContentType.DEEP_POST,
  imageEngine: ImageEngine.DALL_E, // Override default
  options: {
    tone: 'professional',
    goal: 'education',
    targetPlatform: 'linkedin'
  }
}

// Video content request
const videoRequest: ContentGenerationRequest = {
  painPointId: 'pain-point-789',
  contentType: ContentType.REEL,
  videoEngine: VideoEngine.RUNWAY, // High quality video
  options: {
    tone: 'inspiring',
    goal: 'engagement',
    additionalNotes: 'Focus on dynamic transitions'
  }
}
```

### 3. Engine selection with prioritization

```typescript
// Select engine with speed priority
const engines = selectEngines(
  ContentType.MEME,
  undefined,
  undefined,
  { prioritizeSpeed: true }
)
// Result: { imageEngine: ImageEngine.GOOGLE_AI }

// Select engine with quality priority
const qualityEngines = selectEngines(
  ContentType.DEEP_POST,
  undefined,
  undefined,
  { prioritizeQuality: true }
)
// Result: { imageEngine: ImageEngine.DALL_E }

// User override takes precedence
const customEngines = selectEngines(
  ContentType.MEME,
  ImageEngine.REPLICATE, // User choice
  undefined,
  { prioritizeSpeed: true } // This is ignored
)
// Result: { imageEngine: ImageEngine.REPLICATE }
```

### 4. Getting recommended engines

```typescript
// Get fastest engine for a content type
const fastEngine = getRecommendedEngine(ContentType.MEME, 'speed')
// Result: ImageEngine.GOOGLE_AI

// Get highest quality engine
const qualityEngine = getRecommendedEngine(ContentType.NEWSLETTER, 'quality')
// Result: ImageEngine.DALL_E

// Get most cost-effective engine
const costEngine = getRecommendedEngine(ContentType.ENGAGEMENT_POST, 'cost')
// Result: ImageEngine.GOOGLE_AI

// For video content
const videoEngine = getRecommendedEngine(ContentType.REEL, 'quality')
// Result: VideoEngine.RUNWAY
```

### 5. Working with engine configurations

```typescript
// Get configuration for an engine
const dalleConfig = getEngineConfig(ImageEngine.DALL_E)
console.log(dalleConfig.tradeoffs.cost) // 0.04 USD
console.log(dalleConfig.tradeoffs.avgGenerationTimeMs) // 12000 ms
console.log(dalleConfig.capabilities.qualityRating) // 9/10

// Check quality settings
const qualitySettings = dalleConfig.qualitySettings
console.log(qualitySettings.standard) // { quality: 'standard', size: '1024x1024', ... }
console.log(qualitySettings.hd) // { quality: 'hd', size: '1024x1024', ... }

// Get video engine configuration
const pikaConfig = getEngineConfig(VideoEngine.PIKA)
console.log(pikaConfig.generationSettings.standard)
// { resolution: '1280x720', codec: 'h264', fps: 24, duration: 3, ... }
```

### 6. Utility functions

```typescript
// Check if content type is video
if (isVideoContentType(ContentType.REEL)) {
  console.log('This is video content')
}

// Validate engine compatibility
const isCompatible = isEngineCompatible(
  ContentType.MEME,
  ImageEngine.DALL_E
)
// Result: true

// Get human-readable engine names
const displayName = getEngineDisplayName(ImageEngine.GOOGLE_AI)
// Result: "Google AI (Nano Banana)"
```

### 7. Accessing engine capabilities

```typescript
// Get capabilities for DALL-E
const capabilities = ENGINE_CAPABILITIES[ImageEngine.DALL_E]
console.log(capabilities.supportedContentTypes) 
// [ContentType.MEME, ContentType.DEEP_POST, ...]

console.log(capabilities.maxResolution) 
// { width: 1024, height: 1024 }

console.log(capabilities.supportedFormats) 
// ['png']

console.log(capabilities.avgGenerationTime) 
// 12 seconds
```

### 8. Getting default quality presets

```typescript
// Get default quality preset for a content type
const memeQuality = DEFAULT_QUALITY_PRESETS[ContentType.MEME]
// Result: 'fast'

const newsletterQuality = DEFAULT_QUALITY_PRESETS[ContentType.NEWSLETTER]
// Result: 'hd'
```

## Integration Example

Here's a complete example of integrating the architecture into a content generation API:

```typescript
import { NextResponse } from 'next/server'
import { 
  selectEngines, 
  ContentType, 
  ImageEngine 
} from '@/lib/content-engines'
import { ContentGenerationRequest } from '@/lib/types/content'

export async function POST(request: Request) {
  const body: ContentGenerationRequest = await request.json()
  
  // Select the appropriate engine
  const { imageEngine, videoEngine } = selectEngines(
    body.contentType,
    body.imageEngine,
    body.videoEngine,
    { prioritizeSpeed: body.options?.goal === 'viral' }
  )
  
  // Generate content based on engine
  let result
  if (imageEngine === ImageEngine.DALL_E) {
    result = await generateWithDallE(body)
  } else if (imageEngine === ImageEngine.GOOGLE_AI) {
    result = await generateWithGoogleAI(body)
  } else if (imageEngine === ImageEngine.REPLICATE) {
    result = await generateWithReplicate(body)
  }
  
  return NextResponse.json({ success: true, result })
}
```

## Default Engine Mappings

| Content Type      | Default Engine | Rationale                           |
|-------------------|----------------|-------------------------------------|
| MEME              | Google AI      | Fast generation for viral content   |
| DEEP_POST         | DALL-E         | Quality matters for detailed posts  |
| ENGAGEMENT_POST   | Google AI      | Quick turnaround for reactive posts |
| NEWSLETTER        | DALL-E         | Professional quality needed         |
| THREAD            | Google AI      | Multiple images, speed preferred    |
| REEL              | Runway         | Creative, dynamic video content     |
| SHORT_FORM        | Pika           | Fast, reliable video generation     |

## Cost Comparison

| Engine     | Cost per Generation | Speed      | Quality |
|------------|---------------------|------------|---------|
| DALL-E     | $0.04               | 12s        | 9/10    |
| Google AI  | $0.02               | 6s         | 7/10    |
| Replicate  | $0.01               | 20s        | 8/10    |
| Runway     | $0.50               | 75s        | 10/10   |
| Pika       | $0.25               | 35s        | 8/10    |
