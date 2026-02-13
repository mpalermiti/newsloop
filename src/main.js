import './style.css'
import { getTechmemeNews } from './techmeme.js'

const app = document.querySelector('#app')

// Show loading state with skeleton cards
app.innerHTML = `
  <div class="news-container">
    <div class="page-header">
      <h1 class="page-title">Latest tech news</h1>
      <span class="last-updated" id="last-updated"></span>
    </div>
    <div class="news-grid">
      ${Array(6).fill('').map(() => `
        <div class="news-card skeleton-card">
          <div class="skeleton skeleton-badge"></div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-title short"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
      `).join('')}
    </div>
  </div>
`

// Load news
async function loadNews() {
  const container = document.querySelector('.news-container')
  const news = await getTechmemeNews()

  if (news.length === 0) {
    const existingError = container.querySelector('.error')
    if (!existingError) {
      container.innerHTML += '<div class="error">Failed to load news. Retrying...</div>'
    }
    return
  }

  const newsGrid = document.createElement('div')
  newsGrid.className = 'news-grid'

  news.forEach((item, index) => {
    const card = document.createElement('div')
    card.className = 'news-card card-type-1'
    card.dataset.link = item.link
    card.style.animationDelay = `${index * 0.05}s`

    const wordCount = item.description ? item.description.split(/\s+/).length : 0
    const readTime = Math.max(1, Math.ceil(wordCount / 200))

    card.innerHTML = `
      <div class="news-card-header">
        <span class="news-source">${item.domain}</span>
        <span class="news-time">${item.pubDate}</span>
      </div>
      <h3 class="news-title">${item.title}</h3>
      <div class="reading-meta">
        <span class="read-time">${readTime} min read</span>
      </div>
      <p class="news-description">${item.description ? item.description.substring(0, 120) + '...' : ''}</p>
      <div class="expand-content">
        <p class="full-description">${item.description || ''}</p>
        <a href="${item.link}" target="_blank" class="read-link">Read full article →</a>
      </div>
      <button class="expand-btn">Read more</button>
    `

    newsGrid.appendChild(card)
  })

  const loading = container.querySelector('.loading')
  if (loading) loading.remove()

  const error = container.querySelector('.error')
  if (error) error.remove()

  const existingGrid = container.querySelector('.news-grid')
  if (existingGrid) existingGrid.remove()

  container.appendChild(newsGrid)

  // Update timestamp
  const timestamp = document.getElementById('last-updated')
  if (timestamp) {
    timestamp.textContent = `Updated ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }

  // Add event listeners AFTER appending to DOM
  setupInteractions()
}

// Setup interactions
function setupInteractions() {
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const card = btn.closest('.news-card')
      card.classList.toggle('expanded')
      btn.textContent = card.classList.contains('expanded') ? 'Show less' : 'Read more'
    })
  })
}

// Initial load
loadNews()

// Auto-refresh every 5 minutes
setInterval(() => {
  loadNews()
}, 5 * 60 * 1000)
