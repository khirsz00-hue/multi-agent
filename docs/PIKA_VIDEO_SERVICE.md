# Pika Video Service Integration

## Overview

This implementation adds Pika API integration for reactive, short-form video generation optimized for TikTok/Instagram Reels.

## Features

1. **Pika API Integration**
   - Authenticate with `PIKA_API_KEY`
   - Create short-form video tasks (15-60 seconds)
   - Handle async processing with status polling
   - **DEFAULT engine** for short-form, reactive content

2. **Video Generation Request**
   - Send concept/prompt to Pika
   - Configure duration, style, quality
   - Support reactive/TikTok style prompts
   - Optimized for quick, punchy content

3. **Polling Mechanism**
   - Poll endpoint: `GET /api/video-status/{task_id}?engine=pika`
   - Initial delay: 15 seconds
   - Exponential backoff (15s → 22.5s → 30s max)
   - Returns: `{ status, progress, eta, video_url }`

4. **Status Tracking**
   - States: `pending` → `processing` → `completed`
   - Error states: `failed`, `timeout`
   - Timeout protection: 5 minutes max
   - Retry logic: 3 attempts before failure

5. **Video Output**
   - Vertical format (9:16) for TikTok/Reels
   - Auto-optimize resolution/bitrate
   - Returns video URL and thumbnail
   - Stored in `video_tasks` table

## API Usage

### 1. Generate Video

**Request:**
```bash
POST /api/content/generate-video
Content-Type: application/json

{
  "concept": "Quick ADHD productivity hack: Time-blocking your day",
  "duration": 30,
  "style": "realistic",
  "quality": "standard",
  "engine": "pika",
  "draftId": "optional-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "uuid-from-database",
  "pikaTaskId": "pika-external-task-id",
  "status": "pending",
  "progress": 0,
  "eta": 120,
  "message": "Video generation started. Use the taskId to poll for status."
}
```

### 2. Poll Status

**Request:**
```bash
GET /api/video-status/{taskId}?engine=pika
```

**Response (Processing):**
```json
{
  "status": "processing",
  "progress": 50,
  "eta": 60,
  "eta_formatted": "~1 min remaining",
  "updated_at": "2026-01-18T08:15:00Z"
}
```

**Response (Completed):**
```json
{
  "status": "completed",
  "progress": 100,
  "video_url": "https://pika.art/videos/abc123.mp4",
  "thumbnail_url": "https://pika.art/videos/abc123-thumb.jpg",
  "completed_at": "2026-01-18T08:17:30Z"
}
```

**Response (Failed):**
```json
{
  "status": "failed",
  "error": "Video generation failed: Invalid prompt",
  "progress": 0
}
```

## Configuration Options

### Video Config Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `prompt` | string | required | 1-2000 chars | Video concept/description |
| `duration` | number | 30 | 15-60 | Video length in seconds |
| `style` | string | 'default' | See below | Visual style |
| `quality` | string | 'standard' | See below | Video quality |
| `aspectRatio` | string | '9:16' | See below | Video dimensions |
| `fps` | number | 30 | 24, 30, 60 | Frames per second |

### Style Options

- `cinematic` - Movie-like production quality
- `anime` - Animated/cartoon style
- `realistic` - Photorealistic rendering
- `abstract` - Artistic/creative style
- `default` - Balanced general purpose

### Quality Options

- `draft` - Fast, lower quality (quick previews)
- `standard` - Good quality, reasonable speed (default)
- `high` - Better quality, slower processing
- `ultra` - Maximum quality, slowest

### Aspect Ratios

- `9:16` - Vertical (TikTok, Reels, Stories) **default**
- `16:9` - Horizontal (YouTube)
- `1:1` - Square (Instagram posts)

## Database Schema

### `video_tasks` Table

```sql
CREATE TABLE video_tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  draft_id UUID,
  task_id TEXT NOT NULL,         -- External Pika task ID
  engine TEXT NOT NULL,           -- 'pika'
  status TEXT NOT NULL,           -- pending/processing/completed/failed/timeout
  prompt TEXT NOT NULL,
  duration_seconds INTEGER,
  style TEXT,
  quality TEXT,
  config JSONB,                   -- Additional settings
  progress INTEGER,               -- 0-100
  eta_seconds INTEGER,            -- Estimated time remaining
  video_url TEXT,                 -- Final video URL
  thumbnail_url TEXT,
  error_message TEXT,
  retry_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

## Integration with Content Drafts

When a `draftId` is provided, the video is linked to a content draft:

1. Video task is created with `draft_id` reference
2. On completion, `content_drafts` is updated:
   - `video_url`: Final video URL
   - `video_engine`: 'pika'
   - `video_type`: 'short-form'
   - `video_generated_at`: Timestamp
   - `video_settings`: Config details

## Video Recommendation

The `/api/video/recommend` endpoint now includes Pika:

- **Default engine** for text-only, viral, short-form content
- Recommended for: Reels, memes, quick tips, POV content
- Cost: ~$0.05-0.20 per video
- Time: 2-3 minutes typical generation time

Example recommendation:
```json
{
  "recommended_type": "text_only",
  "recommended_engine": "pika",
  "text_only_score": 90,
  "talking_head_score": 10,
  "reasoning": "Short, punchy content perfect for viral TikTok format. Pika excels at reactive short-form video with text overlays.",
  "key_factors": ["Short body length", "Viral goal", "Humorous tone"],
  "estimated_cost": 0.15,
  "estimated_time_seconds": 150
}
```

## Environment Variables

Add to `.env.local`:

```bash
# Pika API for reactive, short-form video generation
PIKA_API_KEY=your_pika_api_key
PIKA_API_URL=https://api.pika.art/v1
```

## Error Handling

### Timeout Protection

- Maximum 5 minutes per video generation
- Auto-timeout if exceeded
- Status updated to `timeout`

### Retry Logic

- Up to 3 polling failures before marking as failed
- Exponential backoff between retries
- Network errors handled gracefully

### Error States

| State | Description | Action |
|-------|-------------|--------|
| `failed` | Pika reported generation error | Show error to user, allow retry |
| `timeout` | 5 minute limit exceeded | Show timeout message, allow restart |
| `Task not found` | Invalid task ID | Show error, check task ID |

## Client-Side Implementation Example

```typescript
// 1. Start video generation
const response = await fetch('/api/content/generate-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    concept: 'Quick productivity tip',
    duration: 30,
    style: 'realistic'
  })
});

const { taskId } = await response.json();

// 2. Poll for status every 15 seconds
const pollInterval = setInterval(async () => {
  const statusResponse = await fetch(`/api/video-status/${taskId}?engine=pika`);
  const status = await statusResponse.json();
  
  // Update UI with progress
  console.log(`Progress: ${status.progress}% - ${status.eta_formatted}`);
  
  if (status.status === 'completed') {
    clearInterval(pollInterval);
    console.log('Video ready:', status.video_url);
    // Show video to user
  } else if (status.status === 'failed' || status.status === 'timeout') {
    clearInterval(pollInterval);
    console.error('Video generation failed:', status.error);
    // Show error to user
  }
}, 15000); // Poll every 15 seconds
```

## Testing

Since actual Pika API calls require an API key, here's how to test:

### 1. Unit Tests (Configuration)

```typescript
import { validatePikaConfig } from '@/lib/video-generators/pika'

// Valid config
const valid = {
  prompt: 'Test video',
  duration: 30,
  style: 'realistic',
  quality: 'standard'
}
const errors = validatePikaConfig(valid)
// errors should be []

// Invalid config
const invalid = {
  prompt: '',
  duration: 100
}
const invalidErrors = validatePikaConfig(invalid)
// invalidErrors: ["Prompt is required", "Duration must be between 15 and 60 seconds"]
```

### 2. API Tests (Mock)

For integration testing, you can:
- Mock the Pika API responses
- Use test mode with dummy task IDs
- Verify database operations work correctly

## Architecture

```
Client                    Backend                      Pika API
  |                          |                            |
  |--POST /generate-video--->|                            |
  |                          |---Create Video Task------->|
  |                          |<---Return Task ID----------|
  |<--Return taskId----------|                            |
  |                          |                            |
  |--Poll /video-status----->|                            |
  |   (every 15s)            |---Get Task Status--------->|
  |                          |<---Return Status-----------|
  |<--Return Status----------|                            |
  |                          |                            |
  |   (repeat until done)    |                            |
  |                          |                            |
  |<--video_url (completed)--|                            |
```

## Files

- `lib/video-generators/pika.ts` - Pika service client
- `app/api/content/generate-video/route.ts` - Video generation endpoint
- `app/api/video-status/[task_id]/route.ts` - Status polling endpoint
- `supabase/migrations/009_video_tasks.sql` - Database schema
- `app/api/video/recommend/route.ts` - Updated recommendation engine

## Future Enhancements

Potential improvements for future PRs:

1. **Webhook Support**: Instead of polling, receive status updates via webhook
2. **Batch Generation**: Generate multiple videos in parallel
3. **Video Preview**: Generate low-quality preview before full render
4. **Custom Templates**: Pre-defined video templates for common use cases
5. **Video Editing**: Edit generated videos (trim, add music, etc.)
6. **Analytics**: Track generation success rates, popular styles, etc.
