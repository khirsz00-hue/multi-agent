# Reel/Video Scenario Editor - Feature Documentation

## Overview
This feature implements a two-stage reel generation flow where users can edit and refine their content BEFORE final generation.

## Architecture

### Database Schema
- **Table**: `draft_reel_scenarios`
- **Key Fields**:
  - `draft_scenario` (JSONB): Editable scenario with hook, body, cta, key_moments, visual_suggestions
  - `original_scenario` (JSONB): Original AI-generated scenario for comparison
  - `edit_history` (JSONB): Array tracking all changes made
  - `validation_results` (JSONB): Current validation state
  - `estimated_quality_score` (INT): 0-100 score based on content quality
  - `status`: 'draft' | 'editing' | 'ready_to_finalize' | 'finalized' | 'archived'
  - `final_draft_id`: Reference to finalized content_draft

### API Endpoints

#### 1. POST /api/content/draft-reel
**Purpose**: Generate initial draft scenario
**Request**:
```json
{
  "painPointId": "uuid",
  "options": {
    "tone": "empathetic",
    "goal": "engagement",
    "additionalNotes": "optional instructions"
  }
}
```
**Response**:
```json
{
  "success": true,
  "draft": {
    "id": "uuid",
    "draft_scenario": {
      "hook": "...",
      "body": "...",
      "cta": "...",
      "key_moments": [...],
      "visual_suggestions": {...},
      "hashtags": [...]
    },
    "validation_results": {...},
    "estimated_quality_score": 75
  },
  "validation": {...},
  "qualityScore": 75
}
```

#### 2. PUT /api/content/draft-reel/[draftId]
**Purpose**: Update draft scenario with user edits
**Request**:
```json
{
  "updatedScenario": {
    "hook": "Updated hook text",
    "body": "Updated body",
    ...
  },
  "changedFields": {
    "hook": "Updated hook text",
    "body": "Updated body"
  }
}
```
**Response**:
```json
{
  "success": true,
  "draft": {...},
  "validation": {...},
  "qualityScore": 82,
  "editsCount": 2
}
```

#### 3. POST /api/content/finalize-reel
**Purpose**: Generate final optimized reel from edited scenario
**Request**:
```json
{
  "draftId": "uuid"
}
```
**Response**:
```json
{
  "success": true,
  "finalDraft": {
    "id": "uuid",
    "hook": "Optimized hook",
    "body": "Optimized body",
    "cta": "Optimized CTA",
    ...
  },
  "message": "Reel finalized successfully!"
}
```

#### 4. GET /api/content/draft-reel/[draftId]
**Purpose**: Retrieve current state of draft scenario
**Response**: Same as POST /api/content/draft-reel

## Validation System

### Hook Validation
- **Character Count**: 30-150 characters
- **Word Count**: 6-30 words
- **Timing**: Equivalent to 3-10 seconds of speech
- **Quality Checks**: Presence of emotion words, questions, exclamations

### Key Moments Validation
- **Minimum**: 2-3 key moments required
- **Format**: Timing must be in format "0-3s", "3-15s", etc.
- **Completeness**: All fields (timing, description, text) must be filled
- **Overlap**: No overlapping time ranges

### CTA Validation
- **Minimum Length**: 10 characters
- **Action Words**: Should include action words (comment, share, follow, etc.)
- **Format**: Questions work best for engagement

### Quality Score Calculation
- Base score: 50
- Hook quality: +20 max
- Key moments quality: +15 max
- CTA quality: +15 max
- Visual suggestions: +10 max
- Hashtags: +10 max
- Warnings penalty: -5 per warning (max -20)

## UI Components

### ScenarioEditor Component
**Location**: `/app/components/ScenarioEditor.tsx`

**Features**:
1. **Editable Fields**:
   - Hook (with character count)
   - Body (multi-line)
   - CTA (with character count)

2. **Key Moments Timeline Editor**:
   - Add/remove moments
   - Edit timing, description, and text for each moment
   - Visual cards for each moment

3. **Visual Suggestions**:
   - Format input (talking head, b-roll, text overlay)
   - Music vibe input (upbeat, emotional, trending)

4. **Live Validation**:
   - Real-time validation feedback
   - Color-coded character counts
   - Checkmarks for valid fields
   - Warning/error messages

5. **Quality Score Display**:
   - Gradient progress bar
   - Real-time score updates
   - Visual feedback on content quality

6. **Suggestions Panel**:
   - AI-powered improvement suggestions
   - Contextual tips

### ContentCreationModal Updates
**Location**: `/app/components/ContentCreationModal.tsx`

**Changes**:
1. Added two-stage flow for reels:
   - Stage 1: Configuration → Generate Draft
   - Stage 2: Edit Scenario → Finalize
   - Stage 3: View Final Content

2. Conditional rendering based on `reelStage` state

3. Integration with ScenarioEditor component

4. Different button text for reel workflow

## User Flow

### Two-Stage Reel Generation
1. **User selects "Create Reel" from pain point**
2. **Configuration Stage**:
   - User selects tone (humorous, empathetic, controversial, educational)
   - User selects goal (viral, engagement, education)
   - User adds optional instructions
   - User clicks "Generate Draft Scenario"

3. **Editing Stage**:
   - AI generates draft scenario with validation
   - Quality score is calculated and displayed
   - User reviews scenario in ScenarioEditor
   - User can edit:
     - Hook text
     - Body content
     - CTA
     - Key moments (timing and content)
     - Visual suggestions
     - Hashtags
   - Real-time validation feedback
   - Save changes button (tracks unsaved changes)
   - Must save changes before finalizing

4. **Finalization Stage**:
   - User clicks "Finalize & Generate Reel"
   - AI optimizes the edited scenario
   - Final content is saved to content_drafts
   - Draft scenario status updated to 'finalized'
   - User sees final optimized content
   - Copy to clipboard available

### Edit History Tracking
Every change is tracked in `edit_history`:
```json
[
  {
    "timestamp": "2024-01-17T10:00:00Z",
    "field": "hook",
    "old_value": "Original hook",
    "new_value": "Updated hook"
  }
]
```

## Benefits

### For Users
1. **Control**: Full control over content before final generation
2. **Learning**: See AI suggestions and learn what works
3. **Quality**: Higher quality output through refinement
4. **Confidence**: Review and approve before committing

### For System
1. **Data**: Track user preferences and editing patterns
2. **Quality**: Generate better final content based on user input
3. **Feedback Loop**: Learn from user edits to improve initial generation
4. **Version History**: Keep track of iterations for analytics

## Technical Implementation Details

### State Management
- React useState for local component state
- Real-time validation on every change
- Debounced API calls for updates
- Optimistic UI updates

### Error Handling
- API errors displayed in Alert components
- Validation errors shown inline
- Graceful fallbacks for AI optimization failures

### Performance Considerations
- Only track changed fields for updates
- Batch multiple field changes
- Lazy validation (on save/finalize)
- Efficient JSONB queries in database

## Future Enhancements
1. **Compare View**: Side-by-side comparison of original vs edited
2. **Undo/Redo**: Step through edit history
3. **Templates**: Save successful scenarios as templates
4. **A/B Testing**: Generate multiple variations to test
5. **Analytics**: Track which edits lead to better performance
6. **Collaboration**: Multiple users editing same draft
7. **AI Suggestions**: Real-time AI suggestions as user types
8. **Preview Mode**: Visual preview of how reel will look
