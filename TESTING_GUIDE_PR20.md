# PR #20: Content Creation Modal Updates - Testing Guide

## Overview
This PR implements a new unified generation system for the ContentCreationModal with engine selection support for both image and video generation.

## New Components

### 1. EngineSelector Component (`/app/components/EngineSelector.tsx`)
- **Purpose**: Allows users to select image or video generation engines
- **Features**:
  - Image engines: DALL-E 3
  - Video engines: Remotion, Creatomate, D-ID, HeyGen
  - Shows recommended engine with AI badge
  - Displays cost and time estimates
  - Expandable details section with best-use cases

### 2. VideoGenerationModal Component (`/app/components/VideoGenerationModal.tsx`)
- **Purpose**: Handles async video generation with polling
- **Features**:
  - Real-time progress tracking
  - Estimated time remaining
  - Polling mechanism with exponential backoff
  - Error handling and recovery
  - "Run in background" option

### 3. Video Status API (`/app/api/content/video-status/[jobId]/route.ts`)
- **Purpose**: Returns status of video generation jobs
- **Returns**: status, progress, videoUrl, error, estimated completion time

## Updated Components

### ContentCreationModal (`/app/components/ContentCreationModal.tsx`)
- **Added**:
  - Engine selection state management
  - Content-type-specific engine display
  - Video generation modal integration
  - Callbacks for video completion/error
  - Engine recommendation loading
- **Flow**:
  1. User selects content type
  2. Engine selector appears based on content type:
     - Meme/Post/Engagement: Image engine (DALL-E 3)
     - Reel/Short: Video engine (Remotion, Creatomate, D-ID, HeyGen)
     - Newsletter: Optional image engine
  3. User generates content with selected engine
  4. For video: Shows polling modal with progress
  5. For image: Generates synchronously with immediate result

### Generate API (`/app/api/content/generate/route.ts`)
- **Added**:
  - Engine parameter handling
  - Async video job creation
  - Sync image generation with DALL-E 3
  - Image upload to Supabase Storage
- **Logic**:
  - Video engines → Create job, return jobId
  - Image engines → Generate synchronously, return draft with image URL
  - Text-only → Generate synchronously, return draft

## Testing Checklist

### Manual Testing

#### 1. Engine Selection UI
- [ ] Open ContentCreationModal
- [ ] Verify EngineSelector appears for meme/post/reel content types
- [ ] Verify recommended engine is highlighted
- [ ] Click "Show engine details" and verify information displays
- [ ] Select different engines and verify selection updates

#### 2. Image Generation Flow (DALL-E 3)
- [ ] Select "Meme" or "Post" content type
- [ ] DALL-E 3 should be selected by default
- [ ] Click Generate
- [ ] Verify content is generated with image
- [ ] Check image displays correctly
- [ ] Verify draft is saved with image URL

#### 3. Video Generation Flow (Async)
- [ ] Select "Reel" content type
- [ ] Select a video engine (e.g., Remotion)
- [ ] Click Generate
- [ ] Verify VideoGenerationModal opens
- [ ] Check progress bar updates
- [ ] Verify elapsed/remaining time displays
- [ ] Test "Run in Background" button
- [ ] Wait for completion and verify video displays

#### 4. Error Handling
- [ ] Test with invalid pain point ID
- [ ] Test with missing engine parameter
- [ ] Test video generation failure
- [ ] Verify error messages display correctly
- [ ] Test error recovery (try again)

#### 5. Draft State Maintenance
- [ ] Generate content
- [ ] Edit content
- [ ] Verify auto-save works
- [ ] Close and reopen modal
- [ ] Verify draft state is maintained

#### 6. Integration Points
- [ ] Test opening modal from different places
- [ ] Verify sidebar navigation works
- [ ] Test multiple content types in sequence
- [ ] Verify version history still works

### Technical Validation

#### TypeScript
```bash
npx tsc --noEmit
```
**Status**: ✅ No new TypeScript errors

#### Linting
```bash
npm run lint
```
**Status**: ✅ No new linting errors (only pre-existing warnings)

#### Build
```bash
npm run build
```
**Status**: ⚠️ Build fails due to missing Supabase env vars (pre-existing issue)
**Note**: Code compiles successfully, failure is infrastructure-related

## Database Requirements

### Required Tables
1. **`video_jobs`** - For async video generation tracking
   ```sql
   CREATE TABLE video_jobs (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID NOT NULL REFERENCES auth.users(id),
     pain_point_id UUID REFERENCES audience_insights(id),
     content_type TEXT NOT NULL,
     engine TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending',
     progress INTEGER DEFAULT 0,
     video_url TEXT,
     error_message TEXT,
     options JSONB,
     estimated_completion TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **`content_drafts`** - Add fields if not present
   ```sql
   ALTER TABLE content_drafts
     ADD COLUMN IF NOT EXISTS generation_engine TEXT,
     ADD COLUMN IF NOT EXISTS image_url TEXT;
   ```

### Required Storage Buckets
1. **`content-images`** - For DALL-E 3 generated images
   - Should be public
   - Upload policy for authenticated users

## Environment Variables
No new environment variables required. Uses existing:
- `OPENAI_API_KEY` - For DALL-E 3 and GPT-4
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Known Limitations

1. **Video Generation**: Currently creates job but requires actual video generation service integration (Remotion, etc.)
2. **Image Storage**: Requires `content-images` bucket to be created in Supabase
3. **Video Jobs**: Requires `video_jobs` table migration to be run

## Next Steps

1. Create database migrations for `video_jobs` table
2. Set up `content-images` storage bucket
3. Integrate actual video generation services
4. Add background job processor for video generation
5. Add notifications for video completion
6. Add video preview player in modal

## Files Changed

### New Files
- `app/components/EngineSelector.tsx` (204 lines)
- `app/components/VideoGenerationModal.tsx` (213 lines)
- `app/api/content/video-status/[jobId]/route.ts` (46 lines)

### Modified Files
- `app/components/ContentCreationModal.tsx` (+59 lines, -7 lines)
- `app/api/content/generate/route.ts` (+122 lines, -6 lines)

### Total Changes
- **3 new files**: 463 lines added
- **2 modified files**: 181 lines added, 13 lines removed
- **Net change**: +631 lines

## Summary

All core features have been implemented successfully:
- ✅ Engine selection with recommendations
- ✅ Content-type-specific engine display
- ✅ Async video generation with polling
- ✅ Sync image generation with DALL-E 3
- ✅ Error handling and recovery
- ✅ Draft state maintenance
- ✅ TypeScript compilation
- ✅ Linting passing

The implementation is ready for testing and integration with actual video generation services.
