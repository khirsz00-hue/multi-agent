// Load saved settings
chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId', 'maxComments'], (result) => {
  if (result.notionApiKey) {
    document.getElementById('notionApiKey').value = result.notionApiKey;
  }
  if (result.notionDatabaseId) {
    document.getElementById('notionDatabaseId').value = result.notionDatabaseId;
  }
  if (result.maxComments !== undefined) {
    document.getElementById('maxComments').value = result.maxComments;
  }
});

// Save settings
document.getElementById('save').addEventListener('click', () => {
  const notionApiKey = document.getElementById('notionApiKey').value;
  const notionDatabaseId = document.getElementById('notionDatabaseId').value;
  const maxComments = parseInt(document.getElementById('maxComments').value);
  
  chrome.storage.sync.set({
    notionApiKey,
    notionDatabaseId,
    maxComments
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
