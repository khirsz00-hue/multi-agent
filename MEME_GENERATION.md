# Meme Image Generation Feature

This feature enables AI-powered meme generation with iterative refinement capabilities. Users can create relatable memes based on audience pain points and refine them with simple text prompts.

## Features

### 1. Meme Generation
- Generate meme concepts using OpenAI GPT-4 based on audience insights
- Create images using DALL-E 3 (OpenAI's image generation model)
- Store images in Supabase Storage with public access
- Track meme metadata in database including format, text, and version

### 2. Iterative Refinement
- Refine existing memes with natural language prompts
- Examples: "Add a dog", "Change colors to blue", "Make it funnier"
- Maintains version history and parent-child relationships
- Each refinement creates a new version while preserving the original

### 3. Database Schema
The `meme_images` table tracks:
- Original prompt and refinement history
- Image storage location and public URL
- Meme format (Drake, Distracted Boyfriend, etc.)
- Top and bottom text overlays
- Version number and parent relationships
- Raw generation metadata

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local`:

```bash
# Required for meme image generation
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...  # Optional (currently using DALL-E)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Migration

Run the database migration to create the `meme_images` table:

```bash
# Apply the migration
supabase db push
# Or manually run the migration file
supabase db execute -f supabase/migrations/008_meme_images.sql
```

### 3. Supabase Storage Setup

Create the `meme-images` bucket and apply storage policies:

1. Go to Supabase Dashboard → Storage
2. Create a new public bucket named `meme-images`
3. Run the storage policies from `supabase/storage_policies.sql`

Or use the Supabase CLI:

```bash
# Create bucket
supabase storage create meme-images --public

# Apply policies
supabase db execute -f supabase/storage_policies.sql
```

### 4. Install Dependencies

All required dependencies are already in `package.json`:
- `openai` - For GPT-4 and DALL-E 3
- `@google/generative-ai` - For future Gemini integration
- `@supabase/supabase-js` - For storage and database

## Usage

### From the UI

1. Navigate to the Content Creation Modal
2. Select a pain point from audience insights
3. Get content format recommendations
4. Select "Meme" as the content type
5. Generate the initial meme (text + image)
6. Use the refinement input to modify the image
7. View version history and iterate as needed

### API Endpoints

#### Generate Meme

```typescript
POST /api/content/generate-meme
{
  "painPointId": "uuid",
  "contentDraftId": "uuid" // optional
}
```

Response:
```json
{
  "success": true,
  "memeImage": {
    "id": "uuid",
    "image_url": "https://...",
    "meme_format": "Drake",
    "top_text": "...",
    "bottom_text": "...",
    "version": 1
  },
  "imageUrl": "https://..."
}
```

#### Refine Meme

```typescript
POST /api/content/refine-meme
{
  "memeImageId": "uuid",
  "refinementPrompt": "Add a dog wearing sunglasses"
}
```

Response:
```json
{
  "success": true,
  "memeImage": {
    "id": "uuid",
    "image_url": "https://...",
    "version": 2,
    "parent_version_id": "previous-uuid",
    "refinement_prompt": "Add a dog wearing sunglasses"
  },
  "imageUrl": "https://..."
}
```

## Technical Details

### Image Generation Flow

1. **Concept Generation**: OpenAI GPT-4 generates meme concept including format, text, and visual description
2. **Image Creation**: DALL-E 3 creates the actual image with text overlays
3. **Storage Upload**: Image is uploaded to Supabase Storage as PNG
4. **Database Record**: Metadata saved to `meme_images` table
5. **Reference Update**: Content draft linked to meme image

### Refinement Flow

1. User provides refinement prompt
2. System retrieves original meme metadata
3. OpenAI GPT-4 generates refined concept based on original + refinement
4. DALL-E 3 creates new image
5. New version saved with parent reference
6. Content draft updated to latest version

### Storage Structure

Images are stored in Supabase Storage with the following path structure:
```
meme-images/
  {userId}/
    memes/
      {timestamp}-{random}.png
```

### Security

- Row Level Security (RLS) policies ensure users can only access their own memes
- Storage policies allow public read but user-scoped write/delete
- Service role key used for server-side storage operations
- All API routes check user authentication and authorization

## Future Enhancements

1. **Google Gemini Integration**: Use Gemini's vision capabilities for image generation
2. **Template Library**: Pre-defined meme templates for faster generation
3. **Batch Generation**: Create multiple meme variations at once
4. **A/B Testing**: Track performance of different meme versions
5. **Custom Fonts**: Allow users to choose different text styles
6. **Multi-panel Memes**: Support for memes with more than 2 panels
7. **Animation**: Generate animated GIF memes
8. **Social Sharing**: Direct sharing to social media platforms

## Troubleshooting

### Image Generation Fails

- Verify `OPENAI_API_KEY` is set correctly
- Check OpenAI account has sufficient credits
- Ensure DALL-E 3 API access is enabled

### Storage Upload Fails

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check the `meme-images` bucket exists and is public
- Verify storage policies are applied correctly

### Database Errors

- Run the migration: `supabase db push`
- Check RLS policies are enabled
- Verify user has access to the agent/space

## Cost Considerations

- **DALL-E 3**: ~$0.04 per 1024x1024 image (standard quality)
- **GPT-4 Turbo**: ~$0.01 per 1K tokens for concept generation
- **Supabase Storage**: Free tier includes 1GB, then $0.021/GB/month

Average cost per meme: ~$0.05 (initial + 1-2 refinements)
