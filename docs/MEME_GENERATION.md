# Meme Generation Feature

## Overview
This feature implements complete meme generation and refinement workflow using OpenAI for concept generation and Google AI for image generation.

## Features Implemented

### 1. Database Schema
- **meme_images table**: Stores meme metadata with version tracking
  - Columns: id, content_draft_id, agent_id, original_prompt, image_url, storage_path, meme_format, top_text, bottom_text, version, parent_version_id, refinement_prompt, raw_image_data, created_at, updated_at
  - Indexes for performance optimization
  - RLS policies for secure access

### 2. API Endpoints
- **POST /api/content/generate-meme**: Generate initial meme
- **POST /api/content/refine-meme/[memeImageId]**: Refine existing meme
- **GET /api/content/meme-versions/[contentDraftId]**: Get all versions

### 3. Frontend Components
- **ContentCreationModal**: Updated with meme-specific UI
  - Meme image display
  - Refinement input field with examples
  - Version history carousel
  - Save/publish buttons

## Setup Instructions

### 1. Database Migration
Run the migration to create the meme_images table:
```bash
# In Supabase SQL Editor, run:
# supabase/migrations/008_meme_images.sql
```

### 2. Supabase Storage Setup
Create the `meme-images` bucket in Supabase:

1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `meme-images`
4. Public: **NO** (keep private)
5. Click "Create bucket"

### 3. Storage Policies
Apply RLS policies for the storage bucket (uncomment and run the SQL in migration 008):

```sql
-- Allow authenticated users to upload to their agent folders
CREATE POLICY "Authenticated users can upload meme images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'meme-images' AND
  (storage.foldername(name))[1] IN (
    SELECT agents.id::text FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE spaces.user_id = auth.uid()
  )
);

-- Users can view meme images for their agents
CREATE POLICY "Users can view their meme images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'meme-images' AND
  (storage.foldername(name))[1] IN (
    SELECT agents.id::text FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE spaces.user_id = auth.uid()
  )
);

-- Users can delete their meme images
CREATE POLICY "Users can delete their meme images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'meme-images' AND
  (storage.foldername(name))[1] IN (
    SELECT agents.id::text FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE spaces.user_id = auth.uid()
  )
);
```

### 4. Environment Variables
Ensure these are set in your `.env.local`:

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional (for production image generation)
GOOGLE_AI_API_KEY=...  # Only needed if using Imagen API
# OR use DALL-E (no separate key needed, uses OPENAI_API_KEY)

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Note:** The system will work with just `OPENAI_API_KEY` for concept generation. It uses a placeholder SVG image generator for memes. For production-quality images, integrate Imagen API or DALL-E.

## Google AI Image Generation

### Important Note
The current implementation includes a **placeholder** for Google AI image generation. To fully enable meme image generation, you need to:

1. **Option A: Use Google's Imagen API**
   - Sign up for Google Cloud Vertex AI
   - Enable Imagen API
   - Update `generateMemeImage()` function in:
     - `/app/api/content/generate-meme/route.ts`
     - `/app/api/content/refine-meme/[memeImageId]/route.ts`
   - Replace the placeholder with actual Imagen API calls

2. **Option B: Use Alternative Services**
   You can also integrate other text-to-image services:
   - **DALL-E (OpenAI)**: Use OpenAI's image generation API
   - **Stable Diffusion**: Use Stability AI API
   - **Midjourney**: Use their API if available
   - **Custom Solution**: Use any other image generation service

### Example Integration (DALL-E)
If using OpenAI's DALL-E instead:

```typescript
async function generateMemeImage({ concept }: any): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  
  const imagePrompt = `Create a meme image: ${concept.image_description}
  
Text overlay:
- Top: "${concept.top_text}"
- Bottom: "${concept.bottom_text}"

Style: Modern meme aesthetic, bold sans-serif font, white text with black stroke, 1080x1080 square.`

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: imagePrompt,
    n: 1,
    size: "1024x1024",
    response_format: "b64_json"
  })
  
  return response.data[0].b64_json!
}
```

## Usage Flow

1. **User selects "meme" content type** in ContentCreationModal
2. **Generate Initial Meme**:
   - OpenAI generates concept (hook, top_text, bottom_text, cta)
   - Google AI/DALL-E generates image
   - Image saved to Supabase Storage
   - Metadata stored in database
3. **Refine Meme**:
   - User enters refinement prompt ("Add a dog", "Make it funnier")
   - System regenerates with refinement
   - New version created with parent reference
   - Version history updated
4. **Multiple Iterations**: Users can refine multiple times

## Storage Structure
Images are stored with path format:
```
meme-images/{agentId}/{contentDraftId}/{timestamp}.png
```

Example:
```
meme-images/abc-123-def/xyz-789-hij/1234567890.png
```

## Version Tracking
- Version 1: Original generated meme (parent_version_id = null)
- Version 2+: Refinements (parent_version_id = previous version id)
- Each version has refinement_prompt field explaining changes

## Error Handling
- API key validation
- Authorization checks (users can only access their own agents)
- Storage errors with rollback
- Rate limiting (inherent in OpenAI/Google AI SDKs)
- User-friendly error messages

## Testing Checklist
- [ ] Create meme-images bucket in Supabase
- [ ] Apply storage RLS policies
- [ ] Set GOOGLE_AI_API_KEY or configure alternative image generation
- [ ] Test meme generation from ContentCreationModal
- [ ] Test refinement with different prompts
- [ ] Verify version history works
- [ ] Test authorization (users can't access other users' memes)
- [ ] Test error handling

## Future Enhancements
- [ ] Batch meme generation
- [ ] Template library (Drake, Distracted Boyfriend, etc.)
- [ ] Custom text overlay positioning
- [ ] Multiple image format support
- [ ] Social media scheduling integration
- [ ] Analytics tracking (views, shares, engagement)
