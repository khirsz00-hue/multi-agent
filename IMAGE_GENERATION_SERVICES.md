# Image Generation Services

This feature provides three image generation services for creating static visual content, including memes, engagement posts, and other social media images. Users can choose their preferred engine or let the system auto-select based on content goals.

## Features

### 1. Multiple Image Generation Engines

#### DALL-E Service (OpenAI)
- **Best for:** Creative, high-quality images with unique artistic elements
- **Model:** DALL-E 3
- **Size:** 1024x1024 (square), 1792x1024 (landscape), 1024x1792 (portrait)
- **Quality:** High (supports 'standard' and 'hd' modes)
- **Speed:** Slower (~10-30 seconds)
- **Cost:** Higher
- **Use cases:** Memes with creative elements, viral content, artistic posts

#### Google AI Service (Imagen via Vertex AI)
- **Best for:** Fast, real-time generation for quick content
- **Model:** Google Imagen (via Vertex AI)
- **Aspect Ratios:** 1:1, 16:9, 9:16, 4:3, 3:4
- **Quality:** Good
- **Speed:** Fastest (~2-5 seconds)
- **Cost:** Lower
- **Use cases:** Quick memes, engagement posts, rapid content iteration

#### Replicate Service (FLUX.1/Stable Diffusion)
- **Best for:** Balanced quality and speed with customizable parameters
- **Model:** FLUX.1 schnell (default, fast high-quality model)
- **Alternative:** Stable Diffusion XL and other models
- **Dimensions:** Customizable (default 1024x1024)
- **Quality:** High
- **Speed:** Balanced (~5-15 seconds)
- **Cost:** Moderate
- **Use cases:** High-quality posts, newsletters, professional content

### 2. Intelligent Engine Selection

The system can automatically select the best engine based on content goals and tone:

- **Quick/Engagement content** → Google AI (fastest)
- **Creative/Viral content** → DALL-E (most creative)
- **Balanced/Professional content** → Replicate (default)

### 3. Fallback Chain

Robust error handling with automatic fallback to alternative engines:

```
Primary Engine Failed → Try Secondary Engine → Try Tertiary Engine → Return Error
```

Example chains:
- DALL-E → Replicate → Google AI
- Google AI → Replicate → DALL-E
- Replicate → DALL-E → Google AI

### 4. Content Generation Flow

1. **Generate Concept** - OpenAI GPT-4 creates content concept with:
   - Hook (caption)
   - Top/bottom text (for memes)
   - Visual description
   - Style suggestions
   - Hashtags and CTA

2. **Select Engine** - Manual selection or auto-selection based on content goals

3. **Generate Image** - Create image using selected engine with fallback support

4. **Upload to Storage** - Save to Supabase storage at `meme-images/{agentId}/{timestamp}.png`

5. **Save Metadata** - Store in database with versioning support

6. **Return Draft** - Complete content draft with image URL and metadata

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local`:

```bash
# OpenAI API Key (Required)
# - GPT-4 for concept generation
# - DALL-E 3 for image generation
OPENAI_API_KEY=sk-...

# Google AI API Key (Optional, for Google AI engine)
# - Imagen for fast image generation
GOOGLE_AI_API_KEY=...

# Replicate API Key (Optional, for Replicate engine)
# - FLUX.1/Stable Diffusion for balanced generation
REPLICATE_API_KEY=r8_...

# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Install Dependencies

The `replicate` package is required:

```bash
npm install replicate
```

This should already be installed if you've run `npm install` after cloning the repository.

### 3. Database Setup

The feature uses the existing `meme_images` and `content_drafts` tables. Ensure migrations are applied:

```bash
supabase db push
```

### 4. Storage Bucket

Ensure the `meme-images` storage bucket exists in Supabase:

1. Go to Supabase Dashboard → Storage
2. Create bucket named `meme-images`
3. Configure as public or apply appropriate RLS policies

## API Usage

### Endpoint: POST /api/content/generate-static

Generate static image content with concept and image.

#### Request Body

```typescript
{
  painPointId: string,           // Required: ID of audience insight
  contentType?: 'meme' | 'engagement_post' | 'static_image', // Optional, default: 'meme'
  imageEngine?: 'dalle' | 'google-ai' | 'replicate' | 'auto', // Optional, default: 'auto'
  options?: {
    tone?: string,               // e.g., 'humorous', 'empathetic', 'casual'
    goal?: string,               // e.g., 'viral', 'engagement', 'education'
    style?: string,              // e.g., 'modern meme aesthetic', 'minimalist'
    aspectRatio?: '1:1' | '16:9' | '9:16' // Optional aspect ratio
  }
}
```

#### Response

```typescript
{
  success: true,
  memeImage: {
    id: string,
    content_draft_id: string,
    agent_id: string,
    image_url: string,           // Public URL of generated image
    storage_path: string,        // Storage path in Supabase
    original_prompt: string,     // Image generation prompt
    meme_format: string,         // Format name or 'Custom'
    top_text: string,            // Top text overlay
    bottom_text: string,         // Bottom text overlay
    version: number,             // Version number (1 for new)
    raw_image_data: {
      generated_at: string,
      model: string,             // Model identifier
      engine: string,            // 'dalle', 'google-ai', or 'replicate'
      concept: object,           // Full concept data
      revised_prompt?: string    // DALL-E revised prompt if applicable
    }
  },
  contentDraft: {
    id: string,
    content_type: string,
    hook: string,                // Caption hook
    body: string,                // Caption body
    cta: string,                 // Call to action
    hashtags: string[],          // Suggested hashtags
    meme_image_id: string        // Reference to meme image
  },
  engine: string                 // Engine used for generation
}
```

#### Error Response

```typescript
{
  error: string                  // Error message
}
```

### Example Request

```bash
curl -X POST https://your-app.com/api/content/generate-static \
  -H "Content-Type: application/json" \
  -d '{
    "painPointId": "123e4567-e89b-12d3-a456-426614174000",
    "contentType": "meme",
    "imageEngine": "auto",
    "options": {
      "tone": "humorous",
      "goal": "viral",
      "style": "modern meme aesthetic"
    }
  }'
```

## Implementation Details

### File Structure

```
lib/image-generators/
├── dalle.ts              # DALL-E 3 service
├── google-ai.ts          # Google AI/Imagen service
├── replicate.ts          # Replicate service
└── storage-upload.ts     # Supabase storage utilities

app/api/content/
└── generate-static/
    └── route.ts          # Main API endpoint
```

### Service Architecture

Each image generation service follows a consistent interface:

```typescript
interface ImageGenerationResult {
  imageBuffer: Buffer;     // Raw image data
  model: string;           // Model identifier
  revisedPrompt?: string;  // Optional revised prompt (DALL-E)
}
```

### Error Handling

All services implement comprehensive error handling:
- API key validation
- Rate limit detection
- Quota exceeded detection
- Content policy violations
- Network errors

Errors are logged with context and propagated with meaningful messages.

### Storage Management

Images are stored with the following naming convention:
```
meme-images/{agentId}/{timestamp}-{randomId}.{ext}
```

- `agentId`: Organizes images by agent
- `timestamp`: Milliseconds since epoch
- `randomId`: 7-character random string
- `ext`: png or jpg based on content type

## Usage Examples

### 1. Generate with DALL-E (Creative)

```typescript
const response = await fetch('/api/content/generate-static', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    painPointId: 'pain-point-id',
    imageEngine: 'dalle',
    options: {
      tone: 'humorous',
      goal: 'viral'
    }
  })
});

const { memeImage, contentDraft } = await response.json();
```

### 2. Generate with Google AI (Fast)

```typescript
const response = await fetch('/api/content/generate-static', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    painPointId: 'pain-point-id',
    imageEngine: 'google-ai',
    options: {
      tone: 'casual',
      goal: 'engagement',
      aspectRatio: '1:1'
    }
  })
});
```

### 3. Auto-Select Engine

```typescript
const response = await fetch('/api/content/generate-static', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    painPointId: 'pain-point-id',
    imageEngine: 'auto', // System will choose best engine
    options: {
      tone: 'empathetic',
      goal: 'education'
    }
  })
});
```

## Monitoring and Logging

All image generation operations are logged:
- Request parameters
- Engine selection
- Generation attempts (primary and fallbacks)
- Success/failure status
- Performance metrics (implied by timestamps)

Example log output:
```
Generating content concept with OpenAI...
Selected image engine: dalle
Generating image with DALL-E 3...
Prompt: Create a modern meme image...
DALL-E 3 image generated successfully
Uploading image to storage...
Image uploaded successfully, public URL: https://...
Saving image metadata to database...
```

## Cost Optimization

### Engine Selection Guidelines

1. **Use Google AI for:**
   - High-volume content generation
   - Quick iterations
   - Engagement posts
   - Time-sensitive content

2. **Use Replicate for:**
   - Standard content needs
   - Balanced quality/cost
   - Most use cases (good default)

3. **Use DALL-E for:**
   - Premium content
   - Creative campaigns
   - Content requiring unique artistry
   - Lower volume, high-impact posts

### Caching Considerations

- Generated images are stored permanently in Supabase
- Reuse existing images when appropriate
- Consider implementing concept similarity checks before generating new images

## Troubleshooting

### Common Issues

1. **"OPENAI_API_KEY not configured"**
   - Ensure OPENAI_API_KEY is set in .env.local
   - Required for both concept generation and DALL-E

2. **"All image generation engines failed"**
   - Check that at least one engine API key is configured
   - Verify API keys are valid and have sufficient quota
   - Check network connectivity

3. **"Google AI API key invalid or not authorized"**
   - Verify GOOGLE_AI_API_KEY is correct
   - Ensure Vertex AI is enabled for your project
   - Check API endpoint configuration

4. **"Replicate account has insufficient credits"**
   - Add credits to your Replicate account
   - System will fall back to other engines automatically

5. **"Failed to upload image"**
   - Verify SUPABASE_SERVICE_ROLE_KEY is correct
   - Ensure meme-images bucket exists
   - Check storage policies and RLS settings

## Future Enhancements

Potential improvements:
- Additional image generation models
- Image editing and refinement API
- Template-based generation
- Batch generation support
- Advanced caching and deduplication
- Cost tracking and analytics
- A/B testing support
- Custom model fine-tuning

## Related Documentation

- [Meme Generation Feature](./MEME_GENERATION.md)
- [Content Calendar](./docs/content-calendar.md)
- [Quick Content Editors](./QUICK_CONTENT_EDITORS.md)
