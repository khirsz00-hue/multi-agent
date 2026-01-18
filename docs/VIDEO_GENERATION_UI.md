# Video Generation Loading UI

Beautiful loading UI for video generation with real-time status updates and polling.

## Features

### 1. Video Generation Loading Modal
- Shows task status (queued, processing, completed, failed)
- Displays progress bar with percentage
- Shows estimated time remaining
- Displays which engine is being used (Pika, Runway, D-ID, HeyGen, Remotion, Creatomate)

### 2. Real-time Status Updates
- Polls video status every 15 seconds (configurable)
- Updates UI with progress in real-time
- Shows messages like "Generating with Pika... 1:45 remaining"
- Animated progress bar with smooth transitions

### 3. Status States
- **Queued**: "Your video is queued..." with pulsing icon
- **Processing**: "Generating your video... 60% complete" with progress bar
- **Completed**: "✅ Done! Processing..." with video preview
- **Failed**: Shows error message with retry button

### 4. Loading Animations
- Smooth progress bar animations
- Animated loading spinner
- Pulsing elements for queued state
- Encouraging messages that change based on progress:
  - 0-30%: "🎬 Creating your masterpiece..."
  - 30-60%: "✨ Looking great so far!"
  - 60-90%: "🚀 Almost there!"
  - 90-100%: "🎉 Final touches..."

### 5. Completion Flow
- Auto-closes modal after 3 seconds when video is ready
- Shows preview of generated video
- Download/Save button
- Back button to continue editing

## Components

### `components/VideoGenerationModal.tsx`
Main modal component that orchestrates the video generation UI.

**Props:**
- `open: boolean` - Controls modal visibility
- `onClose: () => void` - Callback when modal is closed
- `taskId: string | null` - ID of the video generation task
- `draftId?: string` - Content draft ID for retry functionality
- `onVideoReady?: (videoUrl: string) => void` - Callback when video is ready

### `components/VideoProgress.tsx`
Progress display component showing status, progress bar, and messages.

**Props:**
- `status: 'queued' | 'processing' | 'completed' | 'failed'` - Current status
- `progress: number` - Progress percentage (0-100)
- `engine?: string` - Video generation engine name
- `estimatedTime?: number` - Estimated time remaining in seconds
- `errorMessage?: string` - Error message for failed state

### `hooks/useVideoPolling.ts`
Custom hook for managing video status polling.

**Options:**
- `taskId: string | null` - Task ID to poll
- `pollingInterval?: number` - Polling interval in milliseconds (default: 15000)
- `onComplete?: (task) => void` - Callback when task completes
- `onError?: (error: string) => void` - Callback on error
- `enabled?: boolean` - Enable/disable polling

**Returns:**
- `task` - Current task data
- `loading` - Loading state
- `error` - Error message if any
- `stopPolling()` - Function to stop polling
- `retry()` - Function to retry fetching status
- `isPolling` - Whether polling is active

## API Routes

### POST `/api/video/generate`
Initiates video generation for a content draft.

**Request:**
```json
{
  "draftId": "uuid",
  "videoSettings": {
    "engine": "pika",
    "type": "text_only"
  }
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "uuid",
  "task": { /* task object */ }
}
```

### GET `/api/video/status/[taskId]`
Polls the status of a video generation task.

**Response:**
```json
{
  "success": true,
  "task": {
    "id": "uuid",
    "status": "processing",
    "progress": 45,
    "engine": "pika",
    "estimated_completion_time": 30,
    "video_url": null,
    "error_message": null
  }
}
```

## Database Schema

### `video_generation_tasks` table
```sql
CREATE TABLE video_generation_tasks (
  id UUID PRIMARY KEY,
  content_draft_id UUID REFERENCES content_drafts(id),
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  engine TEXT,
  video_type TEXT,
  error_message TEXT,
  video_url TEXT,
  estimated_completion_time INTEGER,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

## Usage Example

### Basic Integration

```tsx
import { useState } from 'react'
import VideoGenerationModal from '@/components/VideoGenerationModal'

function MyComponent() {
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null)

  const handleGenerateVideo = async () => {
    const response = await fetch('/api/video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId: 'my-draft-id' })
    })
    
    const data = await response.json()
    setVideoTaskId(data.taskId)
    setShowVideoModal(true)
  }

  return (
    <>
      <button onClick={handleGenerateVideo}>
        Generate Video
      </button>
      
      <VideoGenerationModal
        open={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        taskId={videoTaskId}
        onVideoReady={(videoUrl) => {
          console.log('Video ready:', videoUrl)
        }}
      />
    </>
  )
}
```

### Integration in ContentCreationModal

The video generation is integrated into the existing `ContentCreationModal` component for reel content:

```tsx
// After generating reel content
{generatedContent.content_type === 'reel' && (
  <Button onClick={generateVideo}>
    <Film className="h-4 w-4 mr-2" />
    Generate Video
  </Button>
)}
```

## Styling

- Uses existing design system components (Button, Card, Badge, Progress)
- Responsive for mobile devices
- Smooth transitions and animations
- Consistent color scheme:
  - Blue for queued/processing
  - Green for completed
  - Red for failed

## Demo Page

Visit `/video-demo` to see a demonstration of all video generation states and components.

## Testing

1. Navigate to any content with reel type
2. Click "Generate Video" button
3. Video generation modal opens with queued state
4. Progress updates every 15 seconds
5. Upon completion, video preview is shown
6. Click "Save Video" to download or "Back to Editor" to continue

## Future Enhancements

- [ ] Integrate actual video generation APIs (Pika, Runway, D-ID, HeyGen)
- [ ] Add video preview thumbnails during generation
- [ ] Support for custom video settings (resolution, duration, etc.)
- [ ] Queue multiple video generations
- [ ] Background generation with notifications
- [ ] Video generation history/library
