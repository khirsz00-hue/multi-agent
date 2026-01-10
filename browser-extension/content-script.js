// Facebook to Notion - Content Script

console.log('Facebook to Notion Saver: Content script loaded')

// Listen for clicks on Facebook
document.addEventListener('click', async (event) => {
  const target = event.target
  
  // Check if clicked element is a "Save" button
  // Facebook uses various selectors, we need to check multiple patterns
  const isSaveButton = 
    target.getAttribute('aria-label')?.includes('Save') ||
    target.getAttribute('aria-label')?.includes('Zapisz') ||
    target.closest('[aria-label*="Save"]') ||
    target.closest('[aria-label*="Zapisz"]')
  
  if (isSaveButton) {
    console.log('Save button clicked! Extracting post data...')
    
    try {
      // Find the post container
      const postElement = target.closest('[role="article"]') || 
                         target.closest('[data-pagelet^="FeedUnit"]')
      
      if (!postElement) {
        console.warn('Could not find post container')
        return
      }
      
      // Extract post data
      const postData = extractPostData(postElement)
      
      if (postData.content) {
        // Send to background script
        chrome.runtime.sendMessage({
          action: 'saveToNotion',
          data: postData
        }, (response) => {
          if (response?.success) {
            showNotification('✅ Zapisano do Notion!')
          } else {
            showNotification('❌ Błąd: ' + (response?.error || 'Unknown error'))
          }
        })
      }
      
    } catch (error) {
      console.error('Error extracting post:', error)
      showNotification('❌ Nie udało się wyodrębnić posta')
    }
  }
}, true) // Use capture phase to catch events early

// Extract post data from DOM
function extractPostData(postElement) {
  try {
    // Get post URL
    const linkElement = postElement.querySelector('a[href*="/posts/"]') || 
                       postElement.querySelector('a[href*="/permalink/"]')
    const url = linkElement ? linkElement.href : window.location.href
    
    // Get post content - try multiple selectors
    const contentElement = postElement.querySelector('[data-ad-comet-preview="message"]') ||
                          postElement.querySelector('[data-ad-preview="message"]') ||
                          postElement.querySelector('[dir="auto"]')
    
    const content = contentElement ? contentElement.innerText.trim() : ''
    
    // Get author
    const authorElement = postElement.querySelector('a[role="link"] strong') ||
                         postElement.querySelector('h2 a') ||
                         postElement.querySelector('h3 a')
    const author = authorElement ? authorElement.innerText.trim() : 'Unknown'
    
    // Generate title (first 100 chars of content or author + date)
    const title = content.length > 0 
      ? content.substring(0, 100) + (content.length > 100 ? '...' : '')
      : `${author} - ${new Date().toLocaleDateString()}`
    
    // Get comments (top level only, limit to 10)
    const comments = []
    const commentElements = postElement.querySelectorAll('[role="article"] [dir="auto"]')
    
    for (let i = 0; i < Math.min(commentElements.length, 10); i++) {
      const commentText = commentElements[i].innerText.trim()
      if (commentText && commentText !== content) {
        comments.push(commentText)
      }
    }
    
    return {
      url,
      title,
      content,
      author,
      comments,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Error extracting post data:', error)
    return { content: null }
  }
}

// Show notification toast
function showNotification(message) {
  const notification = document.createElement('div')
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${message.includes('✅') ? '#10b981' : '#ef4444'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 999999;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `
  
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in'
    setTimeout(() => notification.remove(), 300)
  }, 3000)
}

// Add CSS animations
const style = document.createElement('style')
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`
document.head.appendChild(style)
