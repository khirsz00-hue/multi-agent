// Facebook to Notion - Content Script

console.log('Facebook to Notion Saver: Content script loaded');

// Modern Facebook post selectors (2024)
const POST_SELECTORS = [
  // Feed posts
  'div[role="article"]',
  'div.x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z',
  
  // Group posts
  'div[data-pagelet^="FeedUnit"]',
  
  // Profile posts
  'div.x1hc1fzr.x1unhpq9',
  
  // Fallback
  'div[data-ad-preview="message"]'
];

const TEXT_SELECTORS = [
  'div[dir="auto"][style*="text-align"]',
  'div.xdj266r.x11i5rnm.xat24cr.x1mh8g0r',
  'div[data-ad-comet-preview="message"]',
  'span.x193iq5w'
];

// Retry mechanism with exponential backoff
async function waitForElement(selectors, timeout = 5000, retries = 5) {
  const startTime = Date.now();
  
  for (let attempt = 0; attempt < retries; attempt++) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`Found element with selector: ${selector}`);
        return element;
      }
    }
    
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout: Could not find element after ${timeout}ms`);
    }
    
    // Wait with exponential backoff
    await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
  }
  
  throw new Error('Could not find element with any selector');
}

// Improved text extraction
function extractPostText(container) {
  let text = '';
  
  // Try all text selectors
  for (const selector of TEXT_SELECTORS) {
    const elements = container.querySelectorAll(selector);
    if (elements.length > 0) {
      text = Array.from(elements)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0)
        .join('\n');
      
      if (text.length > 0) break;
    }
  }
  
  // Fallback: get all text from container
  if (!text) {
    text = container.textContent.trim();
  }
  
  return text;
}

// Extract post metadata
function extractPostMetadata(container) {
  const metadata = {
    author: '',
    timestamp: '',
    url: window.location.href,
    type: 'post'
  };
  
  // Author
  const authorEl = container.querySelector('a[role="link"] strong, h4 a, span.x193iq5w strong');
  if (authorEl) {
    metadata.author = authorEl.textContent.trim();
  }
  
  // Timestamp
  const timeEl = container.querySelector('a[aria-label*="ago"], span[id*="jsc_"] a');
  if (timeEl) {
    metadata.timestamp = timeEl.getAttribute('aria-label') || timeEl.textContent;
  }
  
  // Detect post type
  if (window.location.href.includes('/groups/')) {
    metadata.type = 'group_post';
  } else if (window.location.href.includes('/profile/')) {
    metadata.type = 'profile_post';
  }
  
  return metadata;
}

// Create save button
function createSaveButton() {
  const button = document.createElement('button');
  button.textContent = '💾 Save to Notion';
  button.className = 'fb-to-notion-save-btn';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
  `;
  
  button.onmouseover = () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
  };
  
  button.onmouseout = () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  };
  
  button.onclick = async () => {
    button.textContent = '⏳ Extracting...';
    button.disabled = true;
    
    try {
      await extractAndSavePost();
      button.textContent = '✅ Saved!';
      button.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
      
      setTimeout(() => {
        button.textContent = '💾 Save to Notion';
        button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        button.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Save error:', error);
      button.textContent = '❌ Error';
      button.style.background = 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)';
      alert(`Error: ${error.message}`);
      
      setTimeout(() => {
        button.textContent = '💾 Save to Notion';
        button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        button.disabled = false;
      }, 2000);
    }
  };
  
  return button;
}

// Main extraction function
async function extractAndSavePost() {
  console.log('🔍 Starting post extraction...');
  
  // Wait for post container
  const container = await waitForElement(POST_SELECTORS);
  console.log('✅ Found post container:', container);
  
  // Extract text
  const text = extractPostText(container);
  if (!text || text.length < 10) {
    throw new Error('Post text too short or empty');
  }
  console.log('✅ Extracted text:', text.substring(0, 100) + '...');
  
  // Extract metadata
  const metadata = extractPostMetadata(container);
  console.log('✅ Extracted metadata:', metadata);
  
  // Send to background script (which will save to Notion)
  const response = await chrome.runtime.sendMessage({
    action: 'saveToNotion',
    data: {
      content: text,
      metadata: metadata
    }
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to save to Notion');
  }
  
  console.log('✅ Saved to Notion successfully!');
  return response;
}

// Initialize when page loads
function init() {
  console.log('Facebook to Notion Saver: Content script loaded');
  
  // Remove old button if exists
  const oldButton = document.querySelector('.fb-to-notion-save-btn');
  if (oldButton) oldButton.remove();
  
  // Add save button
  const button = createSaveButton();
  document.body.appendChild(button);
  
  console.log('✅ Save button added to page');
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-init on navigation (Facebook is SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(init, 1000); // Wait for new content to load
  }
}).observe(document, { subtree: true, childList: true });
