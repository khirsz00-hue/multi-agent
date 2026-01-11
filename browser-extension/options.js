// Load saved settings
chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId'], (result) => {
  if (result.notionApiKey) {
    document.getElementById('notionApiKey').value = result.notionApiKey;
  }
  if (result.notionDatabaseId) {
    document.getElementById('notionDatabaseId').value = result.notionDatabaseId;
  }
});

// Save settings
document.getElementById('save').addEventListener('click', () => {
  const notionApiKey = document.getElementById('notionApiKey').value;
  const notionDatabaseId = document.getElementById('notionDatabaseId').value;
  
  chrome.storage.sync.set({
    notionApiKey,
    notionDatabaseId
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Settings saved successfully!';
    status.className = 'status success';
    status.style.display = 'block';
    
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  });
});
