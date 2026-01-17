# Quick Content Editors

Simple inline editing for engagement posts and Twitter threads with real-time validation and live preview.

## Features

### 1. Quick Generation & Direct Edit
- Generate engagement_post or thread with AI
- Display in simple text editor
- User edits text directly (no AI regeneration)
- Live preview updates as user types

### 2. Engagement Post Editor
- **Inline editing** for hook, body, and CTA
- **Character count tracking** with visual feedback
- **Live preview** with hashtags
- **Format suggestions** (Poll, This or That, Fill in blank, Question)
- **Quick add/remove hashtags** with tag management

### 3. Twitter Thread Editor
- **Edit individual tweets** (each tweet is separate)
- **Tweet character counter** (280 chars per tweet with warnings)
- **Preview thread order** with visual thread lines
- **Add/remove tweets** with minimum 2 tweets requirement
- **Move tweets** up/down to reorder
- **Format checker** for thread structure

## API Endpoints

### POST /api/content/generate-quick
Generate engagement_post or thread with AI.

**Request Body:**
```json
{
  "agentId": "uuid",
  "contentType": "engagement_post | thread",
  "options": {
    "topic": "productivity tips",
    "tone": "empathetic | humorous | educational | controversial",
    "goal": "engagement | viral | education",
    "additionalNotes": "optional instructions"
  }
}
```

**Response:**
```json
{
  "success": true,
  "draft": {
    "id": "uuid",
    "agent_id": "uuid",
    "content_type": "engagement_post",
    "draft": {
      "hook": "...",
      "body": "...",
      "cta": "...",
      "hashtags": ["#tag1", "#tag2"]
    }
  }
}
```

### PUT /api/content/quick-edit/[draftId]
Save edits to draft.

**Request Body:**
```json
{
  "draft": {
    "hook": "updated hook",
    "body": "updated body",
    "cta": "updated cta",
    "hashtags": ["#tag1", "#tag2"]
  }
}
```

### POST /api/content/validate-quick
Validate content structure.

**Request Body:**
```json
{
  "contentType": "engagement_post | thread",
  "draft": { /* content */ }
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": ["Body might be too short"]
}
```

### GET /api/content/quick-preview/[draftId]
Get current state of draft.

**Response:**
```json
{
  "draft": {
    "id": "uuid",
    "content_type": "engagement_post",
    "draft": { /* content */ }
  }
}
```

## Frontend Components

### QuickContentEditor
Main editor wrapper that handles loading, saving, and validation.

```tsx
import QuickContentEditor from '@/components/quick-editor/QuickContentEditor'

<QuickContentEditor 
  draftId="uuid" 
  onSave={() => console.log('saved')} 
/>
```

### EngagementPostEditor
Specialized editor for engagement posts.

**Features:**
- Hook (max 150 chars)
- Body (50-150 words recommended)
- CTA (max 150 chars)
- Hashtag management
- Format suggestions
- Live preview tab

### TwitterThreadEditor
Specialized editor for Twitter threads.

**Features:**
- Individual tweet editing (280 chars max)
- Add/remove tweets
- Reorder tweets (move up/down)
- Character counter with color coding
- Thread preview with visual structure
- Hashtag management

### QuickContentButton
Quick access component for content generation.

```tsx
import QuickContentButton from '@/components/quick-editor/QuickContentButton'

<QuickContentButton agentId="uuid" />
```

## Pages

### /quick-generate
Full content generation page with options:
- Agent selection
- Content type (engagement post or thread)
- Topic input
- Tone and goal selection
- Additional instructions

### /quick-editor/[draftId]
Editor page for editing generated content.

## Validation Rules

### Engagement Post
**Errors:**
- Hook required
- Hook > 150 chars
- Body required
- CTA > 150 chars

**Warnings:**
- Body < 10 words
- Body > 150 words
- No CTA
- No hashtags
- Too many hashtags (> 10)

### Twitter Thread
**Errors:**
- Missing tweets array
- Less than 2 tweets
- Empty tweet
- Tweet > 280 chars

**Warnings:**
- Very long thread (> 25 tweets)
- Tweet close to limit (> 260 chars)
- No hashtags

## Usage Example

1. **Generate content:**
```typescript
const response = await fetch('/api/content/generate-quick', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'agent-uuid',
    contentType: 'engagement_post',
    options: {
      topic: 'ADHD productivity tips',
      tone: 'empathetic',
      goal: 'engagement'
    }
  })
})

const { draft } = await response.json()
// Navigate to editor: /quick-editor/${draft.id}
```

2. **Edit content:**
   - User edits in the UI
   - Real-time validation
   - Live preview updates

3. **Save changes:**
   - Click "Save" button
   - Validation runs automatically
   - Can't save if validation errors exist

## Technical Requirements Met

✅ No AI regeneration (direct user edits only)
✅ Fast response times
✅ Real-time validation
✅ Simple, clean UI
✅ Minimal dependencies (uses existing UI components)

## Integration

To add quick content editors to existing flows:

1. **Add to agent pages:**
```tsx
import QuickContentButton from '@/components/quick-editor/QuickContentButton'

// In your agent page
<QuickContentButton agentId={agent.id} />
```

2. **Link to generator:**
```tsx
import Link from 'next/link'

<Link href="/quick-generate">
  Generate Quick Content
</Link>
```

3. **Use in content creation modals:**
```tsx
// After generating content, redirect to editor
router.push(`/quick-editor/${draftId}`)
```

## Database Schema

Uses existing `content_drafts` table:
```sql
CREATE TABLE content_drafts (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  content_type TEXT, -- 'engagement_post' | 'thread'
  draft JSONB, -- { hook, body, cta, hashtags } or { tweets, hashtags }
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Character Limits

| Field | Limit | Warning Threshold |
|-------|-------|-------------------|
| Hook | 150 chars | - |
| Body | 50-150 words | < 10 or > 150 |
| CTA | 150 chars | - |
| Tweet | 280 chars | > 260 |
| Hashtags | 10 max | > 10 |

## Error Handling

All API endpoints return consistent error responses:
```json
{
  "error": "Error message"
}
```

Frontend displays errors with alerts and prevents invalid saves.
