# Runway Video Service Integration

This implementation provides a complete integration with Runway API for creative, dynamic video generation suitable for Instagram Reels and social media content.

## Features

### 1. Runway API Integration
- **Authentication**: Uses `RUNWAY_API_KEY` environment variable
- **Video Generation**: Creates video generation tasks with custom prompts
- **Async Processing**: Handles 2-3 minute wait times with exponential backoff
- **Task Tracking**: Returns `task_id` for client-side polling

### 2. Video Generation Request
- **Prompt-based**: Send script/scenario to Runway
- **Configurable Options**:
  - Resolution: 720p or 1080p (default: 1080p for Instagram Reels)
  - Duration: Configurable in seconds (default: 30s)
  - Style: Optional creative style
  - Codec: H.264 or H.265 (default: H.264)
  - Bitrate: Optimized for social media (default: 5000 kbps)
- **Multiple Prompting Strategies**: default, creative, or precise
- **Rate Limiting**: Automatic handling of rate limit responses

### 3. Task Polling
- **Exponential Backoff**: Configurable polling intervals
- **Status Tracking**: `pending` → `processing` → `completed`/`failed`
- **ETA Estimation**: Provides estimated completion time
- **Error Collection**: Captures and stores error messages

### 4. Output Processing
- **Video Download**: Automatically downloads from Runway
- **Format**: MP4 with H.264 codec
- **Social Media Optimization**: Configured for Instagram/social platforms
- **Supabase Storage**: Uploads to `videos/reels/` bucket
- **Public URLs**: Generates public URLs for sharing

### 5. Database Integration
- **video_tasks Table**: Tracks all video generation tasks
- **Fields**:
  - `task_id`: Runway task identifier
  - `status`: Current task status
  - `error_message`: Error details if failed
  - `content_draft_id`: Optional link to content draft
  - `prompt`: Original prompt sent to Runway
  - `config`: Video configuration (JSON)
  - `video_url`: Runway video URL
  - `storage_path`: Supabase storage path
  - `supabase_url`: Public URL
  - `estimated_time` / `actual_time`: Performance tracking
  - Timestamps: `created_at`, `updated_at`, `completed_at`

## Setup

### 1. Environment Variables

Add to your `.env.local`:

```bash
RUNWAY_API_KEY=your_runway_api_key
```

### 2. Database Migration

Run the migration to create the `video_tasks` table:

```bash
# Apply migration 009_video_tasks.sql to your Supabase database
```

### 3. Storage Bucket

Create a `videos` bucket in Supabase Storage with public read access:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);
```

Apply the storage policies from `supabase/storage_policies.sql`.

## API Endpoints

### POST /api/video/generate

Create a new video generation task.

**Request Body:**
```json
{
  "prompt": "Create a 30-second video about ADHD time blindness...",
  "contentDraftId": "uuid-optional",
  "config": {
    "resolution": "1080p",
    "duration": 30,
    "style": "cinematic",
    "promptingStrategy": "creative"
  }
}
```

**Response:**
```json
{
  "success": true,
  "videoTask": {
    "id": "uuid",
    "task_id": "runway_task_id",
    "status": "pending",
    "estimated_time": 180,
    "message": "Video generation started"
  }
}
```

### GET /api/video/generate?taskId=xxx

Check status of a video generation task (single poll).

**Response:**
```json
{
  "success": true,
  "videoTask": {
    "id": "uuid",
    "task_id": "runway_task_id",
    "status": "completed",
    "supabase_url": "https://...",
    "storage_path": "user_id/videos/reels/task_id.mp4",
    "actual_time": 165
  }
}
```

### POST /api/video/poll

Poll for completion with exponential backoff (waits until complete).

**Request Body:**
```json
{
  "taskId": "runway_task_id",
  "options": {
    "initialDelay": 5000,
    "maxDelay": 60000,
    "maxAttempts": 60,
    "backoffMultiplier": 1.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "videoTask": {
    "status": "completed",
    "supabase_url": "https://...",
    "storage_path": "user_id/videos/reels/task_id.mp4"
  },
  "message": "Video generation completed successfully"
}
```

## Usage Example

### Client-Side Implementation

```typescript
// 1. Create video generation task
const response = await fetch('/api/video/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Create a 30-second Instagram Reel about ADHD...',
    config: {
      resolution: '1080p',
      duration: 30
    }
  })
});

const { videoTask } = await response.json();

// 2. Poll for completion (option A: long-running request)
const pollResponse = await fetch('/api/video/poll', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskId: videoTask.task_id
  })
});

const { videoTask: completedTask } = await pollResponse.json();
console.log('Video URL:', completedTask.supabase_url);

// OR (option B: manual polling with interval)
const pollInterval = setInterval(async () => {
  const statusResponse = await fetch(
    `/api/video/generate?taskId=${videoTask.task_id}`
  );
  const { videoTask: currentTask } = await statusResponse.json();
  
  if (currentTask.status === 'completed') {
    clearInterval(pollInterval);
    console.log('Video URL:', currentTask.supabase_url);
  } else if (currentTask.status === 'failed') {
    clearInterval(pollInterval);
    console.error('Video generation failed:', currentTask.error_message);
  }
}, 10000); // Poll every 10 seconds
```

### Server-Side Direct Usage

```typescript
import { generateVideo } from '@/lib/video-generators/runway';

const result = await generateVideo(
  'Create a 30-second video about ADHD time blindness',
  userId,
  {
    resolution: '1080p',
    duration: 30,
    style: 'cinematic',
    promptingStrategy: 'creative'
  }
);

console.log('Video URL:', result.publicUrl);
console.log('Storage Path:', result.storagePath);
```

## Configuration

### Default Settings (Instagram Reels Optimized)
- **Resolution**: 1080p (1080x1920)
- **Format**: MP4
- **Codec**: H.264
- **Bitrate**: 5000 kbps
- **Duration**: 30 seconds
- **Prompting Strategy**: Creative

### Custom Configuration

```typescript
const config: VideoGenerationConfig = {
  resolution: '720p',      // or '1080p'
  duration: 15,            // seconds
  codec: 'h264',           // or 'h265'
  bitrate: 3000,           // kbps
  style: 'documentary',    // optional
  promptingStrategy: 'precise'  // 'default', 'creative', or 'precise'
};
```

## Error Handling

The implementation includes comprehensive error handling:

- **Authentication Errors**: Invalid API key
- **Rate Limiting**: Automatic retry logic
- **Invalid Prompts**: Validation and error messages
- **Processing Failures**: Captured and stored
- **Download/Upload Failures**: Network error handling
- **Timeouts**: Configurable timeout limits

All errors are typed using the `RunwayError` class with specific error types:
- `AUTHENTICATION_FAILED`
- `RATE_LIMIT_EXCEEDED`
- `INVALID_PROMPT`
- `PROCESSING_FAILED`
- `DOWNLOAD_FAILED`
- `UPLOAD_FAILED`
- `TIMEOUT`
- `UNKNOWN`

## Files

- **lib/video-generators/types.ts**: Type definitions
- **lib/video-generators/runway.ts**: Runway API client implementation
- **app/api/video/generate/route.ts**: Video generation endpoint
- **app/api/video/poll/route.ts**: Polling endpoint
- **supabase/migrations/009_video_tasks.sql**: Database schema
- **supabase/storage_policies.sql**: Storage policies for videos bucket

## Notes

- Video generation takes approximately 2-3 minutes
- Runway API requires an active API key with sufficient credits
- Videos are stored permanently in Supabase Storage
- Public URLs are accessible without authentication
- Task tracking persists across sessions
- Failed tasks store error messages for debugging
