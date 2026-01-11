// Background service worker

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveToNotion') {
    saveToNotion(request.data)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }))
    
    return true // Keep channel open for async response
  }
})

// Send post data to API
async function saveToNotion(postData) {
  try {
    // Get API URL from storage
    const { apiUrl } = await chrome.storage.sync.get({ 
      apiUrl: 'https://multi-agent-one.vercel.app' 
    })
    
    const response = await fetch(`${apiUrl}/api/facebook-to-notion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'API request failed')
    }
    
    const result = await response.json()
    
    // Show browser notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'Saved to Notion',
      message: postData.title || 'Post saved successfully',
      priority: 1
    })
    
    return result
    
  } catch (error) {
    console.error('Failed to save to Notion:', error)
    throw error
  }
}
