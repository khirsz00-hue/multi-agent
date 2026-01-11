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
  const { mainPost, comments, metadata, stats } = data;
  
  // Get Notion credentials from storage
  const config = await chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId']);
  
  if (!config.notionApiKey || !config.notionDatabaseId) {
    throw new Error('Notion API key or Database ID not configured. Please set them in extension options.');
  }
  
  // Save to Notion with new structure
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
        // Main post as title
        'Treść Posta': {
          title: [
            {
              text: {
                content: mainPost.substring(0, 100) + (mainPost.length > 100 ? '...' : '')
              }
            }
          ]
        },
        
        // Source
        'Source': {
          rich_text: [
            {
              text: {
                content: 'Facebook'
              }
            }
          ]
        },
        
        // Author
        'Author': {
          rich_text: [
            {
              text: {
                content: metadata.author || 'Unknown'
              }
            }
          ]
        },
        
        // URL
        'URL': {
          url: metadata.url
        },
        
        // Comments Count
        'Comments Count': {
          number: stats.commentsCount
        },
        
        // Top Engagement
        'Top Engagement': {
          number: stats.topEngagement
        },
        
        // Saved At
        'Saved At': {
          date: {
            start: new Date().toISOString()
          }
        }
      },
      children: [
        // Full main post text
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: '📄 Treść Posta'
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: mainPost.substring(0, 2000) // Notion has 2000 char limit per block
                }
              }
            ]
          }
        },
        
        // Divider
        {
          object: 'block',
          type: 'divider',
          divider: {}
        },
        
        // Comments section
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `💬 Komentarze (${stats.commentsCount} total)`
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: comments.substring(0, 2000) // Notion has 2000 char limit per block
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
