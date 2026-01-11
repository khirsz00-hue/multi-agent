// Background service worker

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveToNotion') {
    saveToNotion(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Keep channel open for async response
  }
});

async function saveToNotion(data) {
  const { content, metadata } = data;
  
  // Get Notion credentials from storage
  const config = await chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId']);
  
  if (!config.notionApiKey || !config.notionDatabaseId) {
    throw new Error('Notion API key or Database ID not configured. Please set them in extension options.');
  }
  
  // Save to Notion
  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.notionApiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      parent: { database_id: config.notionDatabaseId },
      properties: {
        'Treść': {
          title: [
            {
              text: {
                content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
              }
            }
          ]
        },
        'Source': {
          rich_text: [
            {
              text: {
                content: 'Facebook'
              }
            }
          ]
        },
        'Author': {
          rich_text: [
            {
              text: {
                content: metadata.author || 'Unknown'
              }
            }
          ]
        },
        'URL': {
          url: metadata.url
        },
        'Saved At': {
          date: {
            start: new Date().toISOString()
          }
        }
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: content
                }
              }
            ]
          }
        }
      ]
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Notion API error: ${error.message || response.statusText}`);
  }
  
  return await response.json();
}
