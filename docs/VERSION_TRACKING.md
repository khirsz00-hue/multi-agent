# Content Version Tracking System

The Content Version Tracking System provides comprehensive version control for all content drafts in the multi-agent platform. It automatically tracks changes, allows comparison between versions, and supports restoration of previous versions.

## Features

### 1. Automatic Version Creation
- Every content update automatically creates a new version
- Tracks which fields were changed (title, body, hook, CTA, hashtags, etc.)
- Stores complete snapshot of content at each version
- Records timestamp and user who made the change

### 2. Version Types
- **Generated**: Initial AI-generated content
- **User Edited**: Manual edits by users
- **AI Refined**: Content refined by AI based on feedback
- **Restored**: Content restored from a previous version

### 3. Version History
- Timeline view of all versions
- Shows version number, type, and timestamp
- Displays what fields were changed in each version
- Quick access to preview and restore options

### 4. Version Comparison
- Visual diff between any two versions
- Side-by-side comparison of old vs new values
- Color-coded changes (green for new, red for old)
- Supports all content fields including JSONB data

### 5. Version Restoration
- Restore any previous version with one click
- Creates backup of current version before restoring
- Marks restored version with special type
- Maintains complete audit trail

## API Endpoints

### Get All Versions
```typescript
GET /api/content/versions/{contentDraftId}
```

### Get Specific Version
```typescript
GET /api/content/version/{versionId}
```

### Compare Versions
```typescript
POST /api/content/version-diff
Body: { versionId1: string, versionId2: string }
```

### Restore Version
```typescript
POST /api/content/restore-version/{versionId}
```

## Usage Example

```tsx
import ContentVersionManager from '@/components/content/ContentVersionManager'

<ContentVersionManager
  contentDraftId={contentDraftId}
  onVersionRestore={() => refetchContent()}
/>
```

## Best Practices

1. **Auto-generate change descriptions**: Use the `generateChangeDescription()` helper
2. **Limit version retention**: Consider cleanup policy for old versions
3. **Preview before restore**: Always let users preview before restoring
4. **Inform users of changes**: Show notifications when versions are created/restored
