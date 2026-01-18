# Meme Generation API - DALL-E Integration (PR #21)

This document describes the new meme generation endpoint that provides a simplified interface for generating memes using DALL-E 3.

## Endpoint

**POST** `/api/memy/generuj`

## Description

Generates a meme image based on top/bottom text using DALL-E 3. This is a Polish-language endpoint designed for ease of use with the meme generation system.

## Request Body

```json
{
  "meme_top_text": "Kiedy zapomniałeś wziąć leki",
  "meme_bottom_text": "I nagle masz supermoc",
  "styl": "klasyczny mem ADHD",
  "content_draft_id": "uuid-optional"
}
```

### Parameters

- `meme_top_text` (string, optional): Text to appear at the top of the meme
- `meme_bottom_text` (string, optional): Text to appear at the bottom of the meme
- `styl` (string, optional): Style description for the meme (default: "klasyczny")
- `content_draft_id` (string, optional): UUID of the content draft to update

**Note**: At least one of `meme_top_text` or `meme_bottom_text` must be provided.

## Response

### Success Response

```json
{
  "sukces": true,
  "obraz_url": "https://storage.supabase.co/.../meme-xyz.png",
  "draft_id": "uuid"
}
```

### Error Response

```json
{
  "blad": "Error message in Polish"
}
```

## Features

### 1. DALL-E 3 Integration
- Uses OpenAI's DALL-E 3 for high-quality image generation
- Size: 1024x1024 PNG
- Format: b64_json for direct buffer transfer

### 2. Retry Logic
- Automatically retries 2 times on timeout or rate limit errors
- 2-second delay between retries
- Provides detailed error messages

### 3. Supabase Storage Upload
- Automatically uploads generated images to `meme-images` bucket
- Path structure: `memy/{user_id}/{timestamp}-{random}.png`
- Returns public URL for immediate use

### 4. Database Updates
- Updates `content_drafts` table with:
  - `image_url`: Public URL of the generated image
  - `image_engine`: Set to `'dalle'`
  - `generation_cost`: Cost from ENGINE_CAPABILITIES constant (currently $0.04)

## Authentication

Requires authenticated user. Returns 401 if not authenticated.

## Error Handling

The endpoint provides detailed error messages for:
- Missing text: `"Tekst mema nie może być pusty"` (400)
- Authentication failure: `"Brak autoryzacji"` (401)
- DALL-E API errors: Specific messages for rate limits, quota, and rejected prompts
- Storage errors: `"Brak dostępu do storage"` (500)
- General errors: `"Błąd podczas generowania mema"` (500)

## Usage Example

### Using fetch API

```typescript
const response = await fetch('/api/memy/generuj', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    meme_top_text: "Kiedy wcisnąłeś nie ten przycisk",
    meme_bottom_text: "I nagle all went wrong",
    styl: "klasyczny ADHD mem"
  })
})

const data = await response.json()

if (data.sukces) {
  console.log('Meme URL:', data.obraz_url)
} else {
  console.error('Error:', data.blad)
}
```

### Using curl

```bash
curl -X POST http://localhost:3000/api/memy/generuj \
  -H "Content-Type: application/json" \
  -d '{
    "meme_top_text": "Kiedy wcisnąłeś nie ten przycisk",
    "meme_bottom_text": "I nagle all went wrong",
    "styl": "klasyczny ADHD mem"
  }'
```

## UI Component

The `GeneratorMemow` component provides a ready-to-use React component for the UI:

```tsx
import { GeneratorMemow } from '@/components/GeneratorMemow'

<GeneratorMemow
  topText="Your top text"
  bottomText="Your bottom text"
  draftId="optional-uuid"
  onSuccess={(imageUrl) => {
    console.log('Generated:', imageUrl)
  }}
/>
```

## Environment Variables Required

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Database Schema

### Migration Required

Run migration `011_add_image_url_to_content_drafts.sql` to add:
- `image_url` column to `content_drafts` table

### Existing Schema Used

The endpoint uses these existing columns in `content_drafts`:
- `image_engine` (VARCHAR(50))
- `generation_cost` (DECIMAL(10, 4))
- `meme_top_text` (VARCHAR(500))
- `meme_bottom_text` (VARCHAR(500))

## Cost Information

- DALL-E 3 Standard: $0.04 per 1024x1024 image
- Cost is automatically tracked in the `generation_cost` field
- Cost constant sourced from `ENGINE_CAPABILITIES[ImageEngine.DALL_E].costPerGeneration`

## Implementation Files

### Library Files
- `lib/memy/prompt-generator.ts` - Generates DALL-E prompts from meme text
- `lib/memy/dalle-generator.ts` - DALL-E 3 API wrapper
- `lib/memy/storage-manager.ts` - Supabase Storage upload utility

### API Route
- `app/api/memy/generuj/route.ts` - Main endpoint implementation

### UI Component
- `components/GeneratorMemow.tsx` - React component for meme generation

### Database
- `supabase/migrations/011_add_image_url_to_content_drafts.sql` - Schema update

## Security

- ✅ CodeQL analysis passed with 0 alerts
- ✅ User authentication required
- ✅ RLS policies enforced through Supabase client
- ✅ Service role key used only server-side
- ✅ Input validation for required fields
- ✅ Error messages don't expose sensitive information

## Testing

No automated tests added (no existing test infrastructure in project).

Manual testing recommended:
1. Test successful generation with both texts
2. Test with only top text
3. Test with only bottom text
4. Test with missing authentication
5. Test with invalid content_draft_id
6. Test error handling for API failures

## Future Enhancements

Consider adding:
- Support for custom image sizes
- Template/style selection
- Batch generation
- Image preview before upload
- Cost estimation before generation
