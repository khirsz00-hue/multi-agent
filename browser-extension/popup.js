// Load saved settings (default API URL is configurable via UI)
chrome.storage.sync.get({ 
  apiUrl: 'https://multi-agent-one.vercel.app' 
}, (items) => {
  document.getElementById('apiUrl').value = items.apiUrl
})

// Save settings
document.getElementById('saveBtn').addEventListener('click', () => {
  const apiUrl = document.getElementById('apiUrl').value.trim()
  
  chrome.storage.sync.set({ apiUrl }, () => {
    showStatus('✅ Settings saved!', 'success')
  })
})

function showStatus(message, type) {
  const statusEl = document.getElementById('status')
  statusEl.textContent = message
  statusEl.className = `status ${type}`
  statusEl.style.display = 'block'
  
  setTimeout(() => {
    statusEl.style.display = 'none'
  }, 3000)
}
