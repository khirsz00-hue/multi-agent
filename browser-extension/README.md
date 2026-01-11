# Facebook to Notion Saver - Browser Extension

Chrome/Firefox extension that saves Facebook posts directly to Notion with a custom "Save to Notion" button.

## Features

- 🎯 **Modern Selectors**: Works with 2024 Facebook layout
- 🔄 **Retry Mechanism**: Exponential backoff for reliable detection
- 💾 **Custom Save Button**: Fixed button in bottom-right corner
- 📱 **SPA Support**: Handles Facebook's single-page app navigation
- ✅ **Visual Feedback**: Loading, success, and error states
- 🔐 **Direct Integration**: Saves directly to Notion API (no intermediary)
- 🧠 **Smart Post Detection**: Separates main post from comments
- 💬 **Comment Extraction**: Extracts comments with engagement metrics
- 📊 **Engagement Sorting**: Sorts comments by likes and replies
- ⚙️ **Configurable**: Choose how many top comments to save

## Installation

### Chrome/Edge
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this folder

### Firefox
1. Open `about:debugging`
2. Click "Load Temporary Add-on"
3. Select `manifest.json`

## Configuration

### 1. Get Notion API Key
1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Give it a name (e.g., "Facebook Saver")
4. Copy the API key (starts with `secret_`)

### 2. Get Database ID
1. Open your Notion database
2. Copy the database ID from the URL
   - URL format: `https://notion.so/<workspace>/<database_id>?v=...`
   - Copy the long ID between workspace and `?v=`

### 3. Configure Extension
1. Right-click the extension icon
2. Click "Options"
3. Enter your Notion API Key and Database ID
4. Click "Save Settings"

### 4. Set Up Database
Your Notion database should have these properties:

| Property Name    | Type      | Description                        |
|------------------|-----------|-------------------------------------|
| Treść Posta      | Title     | Main post text (first 100 chars)   |
| Source           | Text      | "Facebook"                         |
| Author           | Text      | Post author name                   |
| URL              | URL       | Link to Facebook post              |
| Comments Count   | Number    | Total number of comments           |
| Top Engagement   | Number    | Engagement score of top comment    |
| Saved At         | Date      | When the post was saved            |

**Page Content:**
- Full main post text (all content)
- Top N comments sorted by engagement (likes × 2 + replies × 1)
- Each comment shows: author, likes, replies

**Note**: The extension now separates the main post from comments and saves them in structured sections.

## Usage

1. Browse Facebook (feed, groups, or profiles)
2. Look for the **"💾 Save to Notion"** button in the bottom-right corner
3. Click it to save the current post with its top comments
4. Watch the button change:
   - ⏳ Extracting... (processing)
   - ✅ Saved! (success)
   - ❌ Error (if something went wrong)
5. Check your Notion database - the post should appear with:
   - Main post text in the title and content
   - Top comments sorted by engagement in a separate section
   - Engagement metrics (likes, replies) for each comment

## How It Works

1. **Main Post Detection**: Identifies the actual post (not comments) by checking:
   - Not inside a comment section
   - Has substantial content (>100 characters)
   - Has post header with author and timestamp
   - Is near the top of the page
2. **Comment Extraction**: Collects all comments with engagement metrics (likes, replies)
3. **Smart Sorting**: Sorts comments by engagement score (likes × 2 + replies × 1)
4. **Structured Save**: Saves main post and top comments in separate, formatted sections

## Supported Facebook Pages

- ✅ News Feed
- ✅ Groups
- ✅ Profile pages
- ✅ Single post pages

## Troubleshooting

### "Could not find post container"
- Make sure you're on a Facebook page with posts
- Try scrolling to load posts
- The button appears on all pages but only works where posts exist

### "Notion API key or Database ID not configured"
- Go to extension options and configure your credentials
- Make sure your API key starts with `secret_`

### "Notion API error"
- Check that your integration has access to the database
- In Notion, click "..." on your database → "Add connections" → Select your integration
- Verify property names match exactly:
  - **Treść Posta** (title) - Main post content
  - **Source** (text) - Should be "Facebook"
  - **Author** (text) - Post author name
  - **URL** (url) - Facebook post link
  - **Comments Count** (number) - Total comments
  - **Top Engagement** (number) - Highest engagement score
  - **Saved At** (date) - When saved

## Settings

In the extension options, you can configure:
- **Notion API Key**: Your integration token
- **Notion Database ID**: The database where posts will be saved
- **Max Comments to Save**: Choose 5, 10, 20, 50, or all comments (default: 10)

Comments are always sorted by engagement score (highest first).

## Files

- `manifest.json` - Extension configuration (v2.0)
- `content-script.js` - Runs on Facebook, adds save button and extracts posts
- `background.js` - Saves to Notion API
- `options.html/js` - Settings page for Notion credentials
- `icon16.png`, `icon48.png`, `icon128.png` - Extension icons

## Version History

### v2.0 (Current)
- **Smart post detection**: Separates main post from comments
- **Comment extraction**: Extracts all comments with engagement metrics
- **Engagement sorting**: Sorts comments by likes × 2 + replies × 1
- **Configurable**: Choose how many top comments to save (5-50 or all)
- Modern Facebook post selectors for 2024 layout
- Custom "Save to Notion" button
- Direct Notion API integration
- Retry mechanism with exponential backoff
- SPA navigation support
- Enhanced error handling

### v1.0 (Legacy)
- Listened for native Facebook save button clicks
- Used intermediary API endpoint
