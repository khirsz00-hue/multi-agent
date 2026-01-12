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
  '[data-ad-comet-preview="message"]',
  '[data-ad-preview="message"]',
  'div[dir="auto"][style*="text-align"]',
  'div.xdj266r.x11i5rnm.xat24cr.x1mh8g0r',
  'span.x193iq5w',
  'div[dir="auto"]'
];

// Configuration constants
const MIN_POST_TEXT_LENGTH = 100; // Minimum chars for valid main post
const MAX_PARENT_LEVELS = 5; // Max parent levels to check for comment detection
const METADATA_PATTERNS = /\d+ godz\.|\d+ min\.|\d+ d\.|Lubię to!|Komentarz|Wyślij|Like|Comment|Share|Zobacz więcej|See more|\d+ reactions?|\d+ comments?/gi;

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

// Improved text extraction with multiple strategies
function extractPostText(container) {
  let text = '';
  
  // Try all text selectors from global constant
  for (const selector of TEXT_SELECTORS) {
    const elements = container.querySelectorAll(selector);
    if (elements.length > 0) {
      text = Array.from(elements)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 20) // Only substantial text
        .join('\n');
      
      if (text.length > 0) {
        console.log(`📝 Extracted text using selector: ${selector}`);
        break;
      }
    }
  }
  
  // Fallback: get innerText of entire element
  if (!text || text.length === 0) {
    text = container.innerText?.trim() || '';
  }
  
  return text;
}

// Helper function to extract text from different element types
function extractTextFromElement(element) {
  if (!element) return '';
  
  // For span[class^="f"] elements (Facebook Groups - dynamic class names)
  if (element.tagName === 'SPAN' && element.className && element.className.match(/^f/)) {
    const text = element.innerText?.trim() || '';
    
    // Clean metadata noise (buttons, timestamps, reactions)
    return text.replace(METADATA_PATTERNS, '').trim();
  }
  
  // For div[role="article"] (Facebook Newsfeed) - use existing extractPostText
  return extractPostText(element);
}

// Helper function to check if element is a comment by checking parent aria-labels
function isComment(element) {
  let current = element;
  
  // Check up to MAX_PARENT_LEVELS parent levels
  for (let i = 0; i < MAX_PARENT_LEVELS; i++) {
    if (!current) break;
    
    const ariaLabel = current.getAttribute('aria-label') || '';
    const ariaLabelLower = ariaLabel.toLowerCase();
    
    // Check for comment indicators in multiple languages
    if (ariaLabelLower.includes('comment') || 
        ariaLabelLower.includes('komentarz')) {
      console.log(`  ⏭️ Comment detected (level ${i+1} aria-label: "${ariaLabel.substring(0, 50)}...")`);
      return true;
    }
    
    current = current.parentElement;
  }
  
  return false;
}

// Find the main post (not comments)
function findMainPost() {
  console.log('🔍 Starting main post detection...');
  
  // Try div[role="article"] first (for newsfeed)
  let articles = document.querySelectorAll('div[role="article"]');
  console.log(`🔍 Found ${articles.length} div[role="article"]`);
  
  // Fallback to span[class^="f"] for Facebook groups (dynamic class names)
  if (articles.length === 0) {
    articles = document.querySelectorAll('span[class^="f"]');
    console.log(`🔄 Using span[class^="f"] selector (Facebook Groups mode)`);
    console.log(`🔍 Found ${articles.length} span elements with dynamic "f*" classes`);
  }
  
  if (articles.length === 0) {
    console.error('❌ No posts found on page');
    return null;
  }
  
  // Filter by text length
  const postsWithText = [];
  
  for (const article of articles) {
    const text = extractTextFromElement(article);
    const textLength = text.length;
    
    if (textLength < MIN_POST_TEXT_LENGTH) {
      console.log(`⏭️ Skipping: Text too short (${textLength} chars, minimum ${MIN_POST_TEXT_LENGTH})`);
      continue;
    }
    
    postsWithText.push({
      element: article,
      text: text,
      textLength: textLength
    });
  }
  
  console.log(`✅ Found ${postsWithText.length} elements with sufficient text`);
  
  if (postsWithText.length === 0) {
    console.error('❌ No elements with sufficient text found');
    return null;
  }
  
  // Filter out comments by checking parent aria-labels
  const nonComments = postsWithText.filter(post => {
    const isCommentPost = isComment(post.element);
    
    if (isCommentPost) {
      console.log(`⏭️ Skipping comment: ${post.text.substring(0, 50)}...`);
      return false;
    }
    
    return true;
  });
  
  console.log(`✅ Found ${nonComments.length} non-comment posts`);
  
  if (nonComments.length === 0) {
    console.error('❌ No valid main posts found after filtering');
    return null;
  }
  
  // Sort by text length (longest = main post)
  nonComments.sort((a, b) => b.textLength - a.textLength);
  
  const mainPost = nonComments[0];
  
  console.log(`🎯 Selected main post (${mainPost.textLength} chars)`);
  console.log(`📄 Preview: ${mainPost.text.substring(0, 100)}...`);
  
  return mainPost.element;
}

// Extract comments with engagement metrics
function extractComments(postContainer) {
  const comments = [];
  console.log('💬 Starting comment extraction...');
  
  // Find comment section
  const commentSection = document.querySelector('[aria-label*="omment"]') ||
                        document.querySelector('[aria-label*="Comment"]') ||
                        postContainer.parentElement?.querySelector('[data-pagelet*="Comment"]');
  
  if (!commentSection) {
    console.log('ℹ️ No comment section found');
    return comments;
  }
  
  // Find all comment articles within the comment section
  const commentArticles = commentSection.querySelectorAll('div[role="article"]');
  console.log(`Found ${commentArticles.length} potential comments`);
  
  commentArticles.forEach((article, index) => {
    try {
      // Extract comment text
      const textElement = article.querySelector('div[dir="auto"]');
      const text = textElement ? textElement.textContent.trim() : '';
      
      if (text.length < 10) return; // Skip very short comments
      
      // Extract author
      const authorElement = article.querySelector('a[role="link"] span, strong');
      const author = authorElement ? authorElement.textContent.trim() : 'Unknown';
      
      // Extract likes
      let likes = 0;
      const likeElements = article.querySelectorAll('[aria-label*="reakcj"], [aria-label*="reakcje"], [aria-label*="Like"], [aria-label*="like"]');
      likeElements.forEach(el => {
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) {
          const match = ariaLabel.match(/(\d+)/);
          if (match) likes = Math.max(likes, parseInt(match[1]));
        }
      });
      
      // Extract reply count
      let replies = 0;
      const replyElements = article.querySelectorAll('[aria-label*="odpowied"], [aria-label*="odpowiedzi"], [aria-label*="repl"], [aria-label*="Repl"]');
      replyElements.forEach(el => {
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) {
          const match = ariaLabel.match(/(\d+)/);
          if (match) replies = Math.max(replies, parseInt(match[1]));
        }
      });
      
      // Calculate engagement score (likes weighted 2x, replies weighted 1x)
      const LIKE_WEIGHT = 2;
      const REPLY_WEIGHT = 1;
      const engagementScore = (likes * LIKE_WEIGHT) + (replies * REPLY_WEIGHT);
      
      comments.push({
        text,
        author,
        likes,
        replies,
        engagementScore,
        position: index + 1
      });
      
    } catch (error) {
      console.error('Error extracting comment:', error);
    }
  });
  
  // Sort by engagement score (highest first)
  comments.sort((a, b) => b.engagementScore - a.engagementScore);
  
  console.log(`✅ Extracted ${comments.length} comments`);
  return comments;
}

// Format comments for Notion
function formatCommentsForNotion(comments, maxComments = 10) {
  if (comments.length === 0) {
    return 'Brak komentarzy';
  }
  
  const topComments = maxComments > 0 ? comments.slice(0, maxComments) : comments;
  
  let formatted = `🔥 Top ${topComments.length} Komentarzy (sorted by engagement):\n\n`;
  
  topComments.forEach((comment, index) => {
    formatted += `---\n`;
    formatted += `#${index + 1} 👤 ${comment.author}  |  ❤️ ${comment.likes} lajków  |  💬 ${comment.replies} odpowiedzi\n\n`;
    formatted += `${comment.text}\n\n`;
  });
  
  formatted += `---\n`;
  formatted += `Total comments analyzed: ${comments.length}\n`;
  formatted += `Top engagement score: ${topComments[0]?.engagementScore || 0}\n`;
  
  return formatted;
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
  console.log('🔍 Starting smart post extraction...');
  
  // 1. Find main post (not comments)
  const mainPost = findMainPost();
  if (!mainPost) {
    throw new Error('❌ Nie można znaleźć głównego posta.\n\n' +
                   'Upewnij się że:\n' +
                   '1. Jesteś na stronie z postem Facebook\n' +
                   '2. Post jest widoczny na stronie\n' +
                   '3. Nie próbujesz zapisać samego komentarza\n\n' +
                   'Spróbuj odświeżyć stronę i spróbuj ponownie.');
  }
  console.log('✅ Found main post:', mainPost);
  
  // 2. Extract main post text
  const postText = extractPostText(mainPost);
  if (!postText || postText.length < 10) {
    throw new Error('Post text too short or empty');
  }
  console.log('✅ Extracted main post:', postText.substring(0, 100) + '...');
  
  // 3. Extract post metadata
  const metadata = extractPostMetadata(mainPost);
  console.log('✅ Extracted metadata:', metadata);
  
  // 4. Extract and sort comments
  console.log('💬 Extracting comments...');
  const comments = extractComments(mainPost);
  console.log(`✅ Found ${comments.length} comments`);
  
  // Get max comments setting (default to 10)
  const settings = await chrome.storage.sync.get(['maxComments']);
  const maxComments = settings.maxComments !== undefined ? settings.maxComments : 10;
  
  const formattedComments = formatCommentsForNotion(comments, maxComments);
  console.log('✅ Formatted top comments');
  
  // 5. Calculate stats
  const totalLikes = comments.reduce((sum, c) => sum + c.likes, 0);
  const totalReplies = comments.reduce((sum, c) => sum + c.replies, 0);
  const topEngagement = comments[0]?.engagementScore || 0;
  
  // 6. Send to background script
  const response = await chrome.runtime.sendMessage({
    action: 'saveToNotion',
    data: {
      mainPost: postText,
      comments: formattedComments,
      metadata: metadata,
      stats: {
        commentsCount: comments.length,
        totalLikes: totalLikes,
        totalReplies: totalReplies,
        topEngagement: topEngagement
      }
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
