# Long-form Content Editor Documentation

## Overview

The Long-form Content Editor is an iterative editing system designed for creating and refining newsletter and deep post content. It provides section-by-section editing with AI-powered refinement and comprehensive version tracking.

## Features

### 1. Initial Generation with Section Editing
- Generate newsletter or deep_post content with structured sections:
  - **Hook**: Compelling opening that captures attention
  - **Body**: Main content with depth and value
  - **CTA**: Clear call-to-action for engagement
  - **Visual Suggestions**: Formatting and imagery recommendations
- Each section is stored separately for independent editing
- Maintain context of pain point and brand settings

### 2. AI-Powered Section Refinement
- Select any section and provide natural language instructions
- Examples:
  - "Make this more funny"
  - "Simplify the language"
  - "Add more emojis"
  - "Make it more professional"
- AI regenerates only the selected section while keeping others intact
- Changes are tracked with the instruction used

### 3. Manual Editing
- Edit any section inline with a textarea editor
- Changes are immediately saved as new versions
- Support for both text content and JSON (visual_suggestions)
- Maintains proper formatting and line breaks

### 4. Version Tracking
- Every change (AI or manual) creates a new version
- Version history shows:
  - Version number
  - Change reason/instruction
  - Whether changed by AI or manually
  - Timestamp
  - Which sections were modified
- Compare versions side-by-side
- Restore any previous version

### 5. Live Preview
- Real-time preview of current content
- See all sections at a glance
- Updates immediately after edits

## API Endpoints

### POST /api/content/generate-long-form
Generate initial newsletter or deep_post content.

**Request:**
```json
{
  "painPointId": "uuid",
  "contentType": "newsletter" | "deep_post",
  "options": {
    "tone": "empathetic" | "humorous" | "educational" | "controversial",
    "goal": "engagement" | "viral" | "education",
    "title": "Optional title",
    "additionalNotes": "Optional additional instructions"
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
    "pain_point_id": "uuid",
    "content_type": "newsletter",
    "title": "Newsletter title",
    "status": "draft",
    "current_version": {
      "id": "uuid",
      "version_number": 1,
      "hook": "Compelling headline...",
      "body": "Main content...",
      "cta": "Call to action...",
      "visual_suggestions": { /* formatting details */ },
      "modified_sections": ["hook", "body", "cta", "visual_suggestions"],
      "change_reason": "Initial generation",
      "changed_by_ai": true
    }
  }
}
```

### PUT /api/content/edit-section
Manually edit a specific section.

**Request:**
```json
{
  "versionId": "uuid",
  "section": "hook" | "body" | "cta" | "visual_suggestions",
  "content": "New section content or JSON object"
}
```

**Response:**
```json
{
  "success": true,
  "version": {
    "id": "uuid",
    "version_number": 2,
    "hook": "Updated hook...",
    // ... other sections unchanged
    "modified_sections": ["hook"],
    "change_reason": "Manual edit",
    "changed_by_ai": false
  }
}
```

### POST /api/content/regenerate-section
AI-powered section regeneration with instructions.

**Request:**
```json
{
  "versionId": "uuid",
  "section": "hook" | "body" | "cta" | "visual_suggestions",
  "instruction": "Make this more funny and add emojis"
}
```

**Response:**
```json
{
  "success": true,
  "version": {
    "id": "uuid",
    "version_number": 3,
    "hook": "AI-regenerated hook with humor...",
    // ... other sections unchanged
    "modified_sections": ["hook"],
    "change_reason": "Make this more funny and add emojis",
    "changed_by_ai": true
  }
}
```

### POST /api/content/long-form-preview
Get current state of a draft with all versions.

**Request:**
```json
{
  "draftId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "draft": {
    "id": "uuid",
    "title": "Draft title",
    "content_type": "newsletter",
    "current_version": { /* current version details */ },
    "versions": [
      { /* version 3 */ },
      { /* version 2 */ },
      { /* version 1 */ }
    ]
  }
}
```

### POST /api/content/finalize-long-form
Finalize and publish the content.

**Request:**
```json
{
  "draftId": "uuid",
  "status": "ready" | "scheduled" | "posted"
}
```

**Response:**
```json
{
  "success": true,
  "draft": {
    "id": "uuid",
    "status": "ready",
    "updated_at": "2024-01-17T12:00:00Z"
  }
}
```

## Frontend Component

### LongFormEditor Component

```tsx
import LongFormEditor from '@/components/LongFormEditor'

<LongFormEditor 
  draftId="uuid"
  onClose={() => {
    // Optional callback when editor is closed
  }}
/>
```

**Props:**
- `draftId` (string, required): ID of the content draft to edit
- `onClose` (function, optional): Callback when editor is closed

## Database Schema

### content_versions Table

```sql
CREATE TABLE content_versions (
  id UUID PRIMARY KEY,
  draft_id UUID REFERENCES content_drafts(id),
  version_number INTEGER,
  is_current BOOLEAN,
  
  -- Sections
  hook TEXT,
  body TEXT,
  cta TEXT,
  visual_suggestions JSONB,
  
  -- Metadata
  modified_sections TEXT[],
  change_reason TEXT,
  changed_by_ai BOOLEAN,
  created_at TIMESTAMP
)
```

## Usage Flow

### 1. Generate Initial Content

From the ContentCreationModal, select "newsletter" or "deep_post" as content type:

```javascript
// Automatically redirects to editor after generation
router.push(`/dashboard/long-form-editor/${draftId}`)
```

### 2. Edit Sections

**Manual Edit:**
1. Click the edit icon (✏️) on any section
2. Modify the content in the textarea
3. Click "Save"

**AI Refinement:**
1. Click the sparkle icon (✨) on any section
2. Enter instructions like "Make this more engaging"
3. Click "Regenerate with AI"
4. New version is created with only that section changed

### 3. Review Versions

1. Click "History" to see all versions
2. Click on any version to compare with current
3. Click "Restore" to revert to a previous version

### 4. Finalize

1. Click "Mark Ready" to finalize the content
2. Content status changes to "ready"
3. Can be scheduled or posted from content calendar

## Best Practices

### Writing Instructions for AI Refinement

**Good Instructions:**
- "Make the hook more curiosity-driven"
- "Simplify the body to 8th grade reading level"
- "Add 3-4 relevant emojis throughout"
- "Make the CTA more action-oriented"
- "Convert formal tone to conversational"

**Poor Instructions:**
- "Make it better" (too vague)
- "Fix this" (unclear what to fix)
- "Rewrite everything" (should edit manually instead)

### Section-by-Section Approach

1. **Start with Hook**: Get the opening right first
2. **Build the Body**: Ensure value and flow
3. **Refine the CTA**: Clear next step for reader
4. **Polish Visual Suggestions**: Enhance presentation

### Version Management

- Keep meaningful change reasons for tracking
- Don't create too many similar versions
- Use comparison view to verify improvements
- Restore older versions if recent changes didn't improve

## Troubleshooting

### Content Not Loading
- Check if draftId exists in database
- Verify user has access to the draft's space
- Check browser console for API errors

### AI Regeneration Fails
- Ensure OPENAI_API_KEY is set in environment
- Check if instruction is clear and specific
- Verify section name is valid
- Check API rate limits

### Version Not Saving
- Ensure user is authenticated
- Check RLS policies on content_versions table
- Verify draft_id foreign key constraint

### UI Not Updating After Edit
- Check if loadDraft() is being called
- Verify API response structure
- Check browser console for errors

## Future Enhancements

- Collaborative editing with multiple users
- Inline comments on specific sections
- A/B testing of different versions
- Export to various formats (Markdown, HTML, PDF)
- Integration with scheduling system
- Analytics on version performance
- Bulk operations on multiple sections
- Templates for common content patterns
