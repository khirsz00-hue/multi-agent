# Facebook to Notion Saver - Browser Extension

Chrome/Firefox extension that automatically saves Facebook posts to Notion when you click the "Save" button.

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

1. Click extension icon
2. Enter API URL (your Multi-Agent platform URL)
3. Save settings

## Usage

Browse Facebook and click "Save" on any post - it will automatically be sent to your Notion database!

## Files

- `manifest.json` - Extension configuration
- `content-script.js` - Runs on Facebook, detects Save clicks
- `background.js` - Communicates with API
- `popup.html/js` - Settings UI
- `icon16.png`, `icon48.png`, `icon128.png` - Extension icons
