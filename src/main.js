import './style.css'
import { getTechmemeNews, enrichWithSummaries } from './techmeme.js'

const app = document.querySelector('#app')
let activeFilter = null

// Show loading state with skeleton cards
app.innerHTML = `
  <div class="news-container">
    <div class="page-header">
      <h1 class="page-title">Latest tech news</h1>
      <span class="last-updated" id="last-updated"></span>
    </div>
    <div class="active-filter" id="active-filter" style="display:none">
      <span class="active-filter-label">Filtered by <strong id="filter-name"></strong></span>
      <button class="clear-filter-btn" id="clear-filter">Clear filter</button>
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

// Filter cards by topic
function applyFilter(topic) {
  activeFilter = topic
  const filterBar = document.getElementById('active-filter')
  const filterName = document.getElementById('filter-name')
  filterBar.style.display = 'flex'
  filterName.textContent = topic

  document.querySelectorAll('.news-card:not(.skeleton-card)').forEach(card => {
    const cardTopics = Array.from(card.querySelectorAll('.topic-tag')).map(t => t.textContent)
    if (cardTopics.includes(topic)) {
      card.style.display = ''
      card.style.animation = 'none'
      card.offsetHeight // trigger reflow
      card.style.animation = 'fadeUp 0.3s ease-out both'
    } else {
      card.style.display = 'none'
    }
  })
}

function clearFilter() {
  activeFilter = null
  document.getElementById('active-filter').style.display = 'none'
  document.querySelectorAll('.news-card:not(.skeleton-card)').forEach(card => {
    card.style.display = ''
    card.style.animation = 'none'
    card.offsetHeight
    card.style.animation = 'fadeUp 0.3s ease-out both'
  })
}

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
    card.dataset.topics = JSON.stringify(item.topics)
    card.style.animationDelay = `${index * 0.05}s`

    if (item.trending) card.classList.add('trending')

    card.innerHTML = `
      <div class="news-card-header">
        ${item.trending ? '<span class="trending-badge">🔥</span>' : ''}
        ${item.urgency ? `<span class="urgency-label">${item.urgency}</span>` : ''}
        <span class="news-source">${item.domain}</span>
        <span class="news-time">${item.pubDate}</span>
      </div>
      <h3 class="news-title">${item.title}</h3>
      <div class="card-meta">
        ${item.topics.length > 0 ? `<div class="topic-tags">${item.topics.map(t => `<span class="topic-tag" data-topic="${t}">${t}</span>`).join('')}</div>` : ''}
        ${item.sourceCount > 1 ? `<span class="source-count">${item.sourceCount} sources</span>` : ''}
      </div>
      <p class="quick-take" data-index="${index}">${item.summary || '<span class="summary-shimmer">Fetching summary...</span>'}</p>
      ${item.relatedSources.length > 0 ? `
        <div class="related-sources">
          ${item.relatedSources.map(s => `<span class="source-tag">${s}</span>`).join('')}
        </div>
      ` : ''}
      <div class="expand-content">
        <div class="deep-extract" data-deep-index="${index}">
          <div class="deep-extract-loading">
            <span class="summary-shimmer">Loading deeper summary...</span>
          </div>
        </div>
        <a href="${item.link}" target="_blank" class="read-link">Read full article →</a>
      </div>
      <button class="expand-btn">Deeper dive</button>
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

  // Re-apply active filter if one was set
  if (activeFilter) applyFilter(activeFilter)

  // Add event listeners AFTER appending to DOM
  setupInteractions()

  // Fetch real article content in background
  enrichWithSummaries(news).then(enriched => {
    enriched.forEach((item, index) => {
      // Populate quick-take summary
      const el = document.querySelector(`.quick-take[data-index="${index}"]`)
      if (el && item.summary) {
        el.textContent = item.summary
      } else if (el) {
        el.textContent = ''
        el.style.display = 'none'
      }

      // Populate deep extract in expand content
      const deepEl = document.querySelector(`.deep-extract[data-deep-index="${index}"]`)
      if (deepEl && item.deepExtract && item.deepExtract.length > 0) {
        deepEl.innerHTML = item.deepExtract
          .map(p => `<p class="deep-extract-paragraph">${p}</p>`)
          .join('')
      } else if (deepEl) {
        // Build useful fallback from what we have
        const parts = []
        if (item.summary) {
          parts.push(`<p class="deep-extract-paragraph">${item.summary}</p>`)
        }
        if (item.relatedSources && item.relatedSources.length > 0) {
          parts.push(`<p class="deep-extract-paragraph fallback">Also covered by ${item.relatedSources.join(', ')}.</p>`)
        }
        if (parts.length === 0) {
          parts.push(`<p class="deep-extract-paragraph fallback">Could not extract article content. Click "Read full article" below.</p>`)
        }
        deepEl.innerHTML = parts.join('')
      }
    })
  })
}

// Setup interactions
function setupInteractions() {
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const card = btn.closest('.news-card')
      card.classList.toggle('expanded')
      btn.textContent = card.classList.contains('expanded') ? 'Show less' : 'Deeper dive'
    })
  })

  document.querySelectorAll('.topic-tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.stopPropagation()
      applyFilter(tag.dataset.topic)
    })
  })
}

// Clear filter button
document.getElementById('clear-filter').addEventListener('click', clearFilter)

// Initial load
loadNews()

// Auto-refresh every 5 minutes
setInterval(() => {
  loadNews()
}, 5 * 60 * 1000)
