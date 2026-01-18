# Content Calendar Integration - Feature Documentation

## Overview
The redesigned Content Calendar provides a comprehensive view of all content drafts with multiple viewing modes, bulk actions, and advanced scheduling capabilities. The calendar integrates seamlessly with the dashboard sidebar and provides real-time alerts for upcoming content.

## Components

### 1. ContentCalendar (`components/ContentCalendar.tsx`)
Main calendar component that manages all calendar views and interactions.

**Features:**
- **Multiple View Modes:**
  - Monthly Grid View (default) - Shows content distributed across calendar days
  - Weekly View - Focused 7-day view for detailed planning
  - List View - Flat list of all drafts for easy bulk management

- **Filtering:**
  - All Content - Shows everything
  - Drafts Only - Filters to show only draft and ready status items
  - Published - Shows only published/posted content

- **Bulk Actions:**
  - Select multiple items with checkboxes
  - Bulk publish selected items
  - Bulk delete selected items
  - Select all/deselect all functionality

- **Content Management:**
  - Click on any content cell to preview
  - Quick edit modal with inline editing
  - Engine selector (GPT-4, GPT-3.5, Claude, Gemini)
  - Schedule date/time picker with timezone support
  - Regenerate content option

**Props:**
```typescript
interface ContentCalendarProps {
  calendar: any                                    // Calendar data from API
  onRefresh: () => void                           // Reload calendar data
  onUpdateStatus: (draftId: string, newStatus: string) => void
  onDelete: (draftId: string) => void
  onBulkDelete: (draftIds: string[]) => void
  onBulkPublish: (draftIds: string[]) => void
  onUpdateDraft: (draftId: string, updates: any) => void
  onSchedule: (draftId: string, date: string) => void
}
```

### 2. CalendarCell (`components/CalendarCell.tsx`)
Individual content item displayed in the calendar.

**Features:**
- **Visual Indicators:**
  - Content type icons (Video for reels, Image for memes, FileText for posts, Mail for newsletters, Twitter for threads)
  - Status badges with color coding (draft: gray, ready: green, scheduled: blue, published: purple)
  - Engine color coding via left border (GPT-4: green, GPT-3.5: blue, Claude: purple, Gemini: orange)

- **Hover Preview:**
  - Tooltip shows expanded content preview
  - Displays audience insights (pain point addressed)
  - Shows tone and engine information

- **Quick Actions:**
  - Edit content
  - Copy to clipboard
  - Schedule for publication
  - Mark as published
  - Delete

- **Bulk Selection:**
  - Optional checkbox for multi-select
  - Visual highlight when selected (blue ring)

**Props:**
```typescript
interface CalendarCellProps {
  draft: any                                      // Draft content object
  isSelected?: boolean                            // Selection state for bulk actions
  onSelect?: (id: string, selected: boolean) => void
  onClick?: (draft: any) => void                  // Preview handler
  onEdit?: (draft: any) => void
  onDelete?: (id: string) => void
  onStatusChange?: (id: string, status: string) => void
  onCopy?: (draft: any) => void
  showCheckbox?: boolean                          // Enable bulk selection mode
}
```

### 3. DashboardSidebar (`components/dashboard/DashboardSidebar.tsx`)
Persistent sidebar navigation with content calendar integration.

**Features:**
- **Navigation:**
  - Dashboard link
  - Content Calendar link with upcoming count badge
  - Long Form Editor link
  - Audience Insights link
  - KPI Tracker link

- **Content Alerts:**
  - Highlights calendar link when content is due soon (within 24 hours)
  - Alert card shows due content with times
  - Quick link to view calendar
  - Auto-refreshes upcoming content count

- **Upcoming Content Summary:**
  - Shows total scheduled items
  - Displays when no urgent content is due

**Props:**
```typescript
interface DashboardSidebarProps {
  spaceId?: string  // Optional space ID for space-specific navigation
}
```

## UI Components Added

### Checkbox (`components/ui/checkbox.tsx`)
- Based on Radix UI primitives
- Styled with Tailwind for consistency
- Used for bulk selection in calendar views

### Popover (`components/ui/popover.tsx`)
- Portal-based overlay component
- Positioned relative to trigger element
- Used for context menus and additional actions

### Tooltip (`components/ui/tooltip.tsx`)
- Hover-triggered information display
- Used for content previews in calendar cells
- Configurable delay and positioning

## Page Integration

### Content Calendar Page (`app/dashboard/content-calendar/page.tsx`)
Updated to use the new ContentCalendar component with all new features.

**API Integration:**
- `GET /api/content/calendar` - Load calendar data
- `PATCH /api/content/calendar` - Update draft status or properties
- `DELETE /api/content/calendar?id={id}` - Delete draft

**Handler Functions:**
- `loadCalendar()` - Fetches calendar data
- `updateDraftStatus()` - Changes status (draft → ready → scheduled → published)
- `deleteDraft()` - Deletes single draft with confirmation
- `bulkDelete()` - Deletes multiple drafts in parallel
- `bulkPublish()` - Publishes multiple drafts in parallel
- `updateDraft()` - Updates draft properties (hook, body, cta, engine, etc.)
- `scheduleDraft()` - Sets scheduled date and updates status

### Dashboard Layout (`app/dashboard/layout.tsx`)
New layout wrapper that includes the sidebar for all dashboard pages.

## Usage Examples

### Viewing Content in Monthly View
1. Navigate to `/dashboard/content-calendar`
2. Default view shows current month with all scheduled content
3. Each day shows content cells with type icons and status badges
4. Hover over any cell to see preview tooltip
5. Click cell to open full preview modal

### Bulk Actions
1. Switch to List view for easier bulk management
2. Check boxes for items to select
3. Use "Select All" to select all visible items
4. Click "Publish" or "Delete" in the bulk action bar
5. Confirm action in dialog

### Editing Content
1. Click on any content cell to preview
2. Click "Edit" button in preview modal
3. Edit hook, body, and CTA text
4. Change engine if needed
5. Set or update scheduled date
6. Save changes

### Scheduling
1. Open content in edit mode
2. Set date/time in schedule picker
3. Content automatically moves to "scheduled" status
4. Appears in calendar on scheduled date
5. Alert appears 24 hours before scheduled time

### Sidebar Integration
1. Sidebar shows on all dashboard pages
2. "Content Calendar" link displays badge with upcoming count
3. Orange highlight when content due in < 24 hours
4. Alert card shows which content is due soon
5. Click card to navigate to calendar

## Color Coding System

### Status Colors
- **Draft** (gray): Content in initial draft state
- **Ready** (green): Content reviewed and ready to schedule
- **Scheduled** (blue): Content scheduled for specific date/time
- **Published** (purple): Content that has been posted

### Engine Colors (Left Border)
- **GPT-4** (green): Content generated with GPT-4
- **GPT-3.5** (blue): Content generated with GPT-3.5 Turbo
- **Claude** (purple): Content generated with Claude
- **Gemini** (orange): Content generated with Gemini
- **Default** (gray): Unknown or unspecified engine

## Responsive Design

### Desktop (1024px+)
- Full sidebar visible
- Monthly view shows 7-column grid
- Weekly view shows 7 columns
- List view shows 1 column

### Tablet (768px - 1023px)
- Collapsible sidebar
- Monthly view remains 7 columns (smaller cells)
- Weekly view scrolls horizontally
- List view shows 1 column

### Mobile (< 768px)
- Sidebar converts to hamburger menu
- Monthly view shows simplified 7-column grid
- Weekly view recommended default
- List view optimal for mobile

## Future Enhancements

### Planned Features
- Drag-and-drop to reschedule content
- Recurring content templates
- Team collaboration (assign reviewers)
- Integration with social media platforms for direct publishing
- Analytics view (performance metrics per content)
- AI-powered content suggestions based on calendar gaps
- Export calendar to external formats (iCal, CSV)
- Content approval workflows
- Version history for edited content

### Known Limitations
- Timezone currently uses browser default (not selectable)
- Regenerate feature shows placeholder (needs AI integration)
- No drag-and-drop support yet
- Bulk actions limited to publish and delete
- No undo functionality for bulk actions

## Testing Recommendations

### Manual Testing Checklist
- [ ] Load calendar page successfully
- [ ] Switch between month, week, and list views
- [ ] Filter content (all, drafts, published)
- [ ] Select single item with checkbox
- [ ] Select all items
- [ ] Bulk delete multiple items
- [ ] Bulk publish multiple items
- [ ] Preview content by clicking cell
- [ ] Edit content in modal
- [ ] Change engine in edit modal
- [ ] Schedule content with date picker
- [ ] Copy content to clipboard
- [ ] Delete single content item
- [ ] Navigate months (prev/next)
- [ ] Navigate weeks (prev/next)
- [ ] View upcoming count in sidebar
- [ ] See due content alert when content scheduled < 24hrs
- [ ] Navigate from sidebar alert to calendar
- [ ] Hover over cell to see tooltip preview

### API Testing
- Verify `/api/content/calendar` GET returns expected structure
- Test PATCH endpoint updates status correctly
- Test PATCH endpoint updates content properties
- Test DELETE endpoint removes content
- Verify bulk operations handle failures gracefully

## Dependencies Added

```json
{
  "@radix-ui/react-checkbox": "^1.x",
  "@radix-ui/react-popover": "^1.x",
  "@radix-ui/react-tooltip": "^1.x"
}
```

All dependencies are lightweight UI primitives that follow existing patterns in the codebase.
