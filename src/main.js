import './style.css'
import { getTechmemeNews, enrichWithSummaries } from './techmeme.js'

const app = document.querySelector('#app')
let activeFilter = null
let currentNews = []

// ——— Read Memory (localStorage) ———

const READ_KEY = 'technews_read'

function getReadSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'))
  } catch { return new Set() }
}

function markAsRead(link) {
  const read = getReadSet()
  if (read.has(link)) return
  read.add(link)
  // Keep only last 200 entries
  const arr = [...read].slice(-200)
  localStorage.setItem(READ_KEY, JSON.stringify(arr))
  // Update the card visually
  const card = document.querySelector(`.news-card[data-link="${CSS.escape(link)}"]`)
  if (card) card.classList.add('is-read')
  updateNewCount()
}

function isRead(link) {
  return getReadSet().has(link)
}

function updateNewCount() {
  const badge = document.getElementById('new-count')
  if (!badge) return
  const unread = document.querySelectorAll('.news-card:not(.skeleton-card):not(.is-read)').length
  if (unread > 0) {
    badge.textContent = `${unread} new`
    badge.style.display = ''
  } else {
    badge.style.display = 'none'
  }
}

// ——— Initial Layout ———

app.innerHTML = `
  <div class="news-container">
    <div class="page-header">
      <div class="page-title-row">
        <h1 class="page-title" id="page-title">Latest tech news</h1>
        <span class="new-count-badge" id="new-count" style="display:none"></span>
      </div>
      <div class="header-right">
        <kbd class="kbd-hint" id="kbd-hint">⌘K</kbd>
        <span class="last-updated" id="last-updated"></span>
      </div>
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
  <div class="cmd-palette-overlay" id="cmd-overlay" style="display:none">
    <div class="cmd-palette" id="cmd-palette">
      <input type="text" class="cmd-input" id="cmd-input" placeholder="Search stories, filter by topic..." autocomplete="off" />
      <div class="cmd-results" id="cmd-results"></div>
      <div class="cmd-footer">
        <span class="cmd-hint">↑↓ navigate</span>
        <span class="cmd-hint">↵ select</span>
        <span class="cmd-hint">esc close</span>
      </div>
    </div>
  </div>
`

// ——— Command Palette ———

const cmdOverlay = document.getElementById('cmd-overlay')
const cmdPalette = document.getElementById('cmd-palette')
const cmdInput = document.getElementById('cmd-input')
const cmdResults = document.getElementById('cmd-results')
let cmdSelectedIndex = 0

function openPalette() {
  cmdOverlay.style.display = ''
  cmdInput.value = ''
  cmdSelectedIndex = 0
  renderPaletteResults('')
  // Focus after display transition
  requestAnimationFrame(() => cmdInput.focus())
}

function closePalette() {
  cmdOverlay.style.display = 'none'
  cmdInput.blur()
}

function getPaletteItems(query) {
  const q = query.toLowerCase().trim()
  const items = []

  // Topic filters
  const allTopics = new Set()
  currentNews.forEach(n => n.topics.forEach(t => allTopics.add(t)))
  allTopics.forEach(topic => {
    items.push({
      type: 'topic',
      label: topic,
      description: `Filter by ${topic}`,
      action: () => { applyFilter(topic); closePalette() }
    })
  })

  // Clear filter action
  if (activeFilter) {
    items.unshift({
      type: 'action',
      label: 'Clear filter',
      description: 'Show all stories',
      action: () => { clearFilter(); closePalette() }
    })
  }

  // Story results
  currentNews.forEach((item, i) => {
    items.push({
      type: 'story',
      label: item.title,
      description: `${item.domain} · ${item.pubDate}`,
      read: isRead(item.link),
      action: () => {
        closePalette()
        clearFilter()
        const card = document.querySelectorAll('.news-card:not(.skeleton-card)')[i]
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' })
          card.style.animation = 'none'
          card.offsetHeight
          card.style.animation = 'cardEnter 0.4s ease-out both'
        }
      }
    })
  })

  if (!q) return items

  // Filter by query
  return items.filter(item =>
    item.label.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q)
  )
}

function renderPaletteResults(query) {
  const items = getPaletteItems(query)
  cmdSelectedIndex = Math.min(cmdSelectedIndex, Math.max(0, items.length - 1))

  if (items.length === 0) {
    cmdResults.innerHTML = '<div class="cmd-empty">No results</div>'
    return
  }

  cmdResults.innerHTML = items.map((item, i) => {
    const icon = item.type === 'topic' ? '⊹' : item.type === 'action' ? '↺' : '→'
    const readClass = item.read ? ' cmd-item-read' : ''
    const selectedClass = i === cmdSelectedIndex ? ' cmd-item-selected' : ''
    return `<div class="cmd-item${selectedClass}${readClass}" data-index="${i}">
      <span class="cmd-item-icon">${icon}</span>
      <div class="cmd-item-text">
        <span class="cmd-item-label">${item.label}</span>
        <span class="cmd-item-desc">${item.description}</span>
      </div>
    </div>`
  }).join('')

  // Scroll selected into view
  const selected = cmdResults.querySelector('.cmd-item-selected')
  if (selected) selected.scrollIntoView({ block: 'nearest' })

  // Click handlers
  cmdResults.querySelectorAll('.cmd-item').forEach((el, i) => {
    el.addEventListener('click', () => items[i].action())
  })
}

cmdInput.addEventListener('input', () => {
  cmdSelectedIndex = 0
  renderPaletteResults(cmdInput.value)
})

cmdInput.addEventListener('keydown', (e) => {
  const items = getPaletteItems(cmdInput.value)
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    cmdSelectedIndex = Math.min(cmdSelectedIndex + 1, items.length - 1)
    renderPaletteResults(cmdInput.value)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    cmdSelectedIndex = Math.max(cmdSelectedIndex - 1, 0)
    renderPaletteResults(cmdInput.value)
  } else if (e.key === 'Enter' && items[cmdSelectedIndex]) {
    e.preventDefault()
    items[cmdSelectedIndex].action()
  } else if (e.key === 'Escape') {
    closePalette()
  }
})

cmdOverlay.addEventListener('click', (e) => {
  if (e.target === cmdOverlay) closePalette()
})

// Global keyboard shortcut
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    if (cmdOverlay.style.display === 'none') openPalette()
    else closePalette()
  }
  if (e.key === 'Escape' && cmdOverlay.style.display !== 'none') {
    closePalette()
  }
})

// Kbd hint click opens palette
document.getElementById('kbd-hint').addEventListener('click', openPalette)

// ——— Filter ———

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
      card.offsetHeight
      card.style.animation = 'cardEnter 0.3s ease-out both'
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
    card.style.animation = 'cardEnter 0.3s ease-out both'
  })
}

// ——— Load News ———

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

  currentNews = news

  const newsGrid = document.createElement('div')
  newsGrid.className = 'news-grid'

  news.forEach((item, index) => {
    const card = document.createElement('div')
    card.className = 'news-card card-type-1'
    card.dataset.link = item.link
    card.dataset.topics = JSON.stringify(item.topics)
    card.style.animationDelay = `${index * 0.05}s`

    if (item.trending) card.classList.add('trending')
    if (isRead(item.link)) card.classList.add('is-read')

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
      ${item.summary ? `<p class="quick-take" data-index="${index}">${item.summary}</p>` : ''}
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

  // Update new count badge
  updateNewCount()

  // Add event listeners AFTER appending to DOM
  setupInteractions()

  // Fetch deeper article content in background
  enrichWithSummaries(news).then(enriched => {
    enriched.forEach((item, index) => {
      const el = document.querySelector(`.quick-take[data-index="${index}"]`)
      if (el && item.summary && item.summary !== news[index].snippet) {
        el.textContent = item.summary
      }

      const deepEl = document.querySelector(`.deep-extract[data-deep-index="${index}"]`)
      if (deepEl && item.deepExtract && item.deepExtract.length > 0) {
        deepEl.innerHTML = item.deepExtract
          .map(p => `<p class="deep-extract-paragraph">${p}</p>`)
          .join('')
      } else if (deepEl) {
        const parts = []
        if (item.relatedSources && item.relatedSources.length > 0) {
          parts.push(`<p class="deep-extract-paragraph fallback">Also covered by ${item.relatedSources.join(', ')}.</p>`)
        }
        parts.push(`<p class="deep-extract-paragraph fallback">This article's content is behind a paywall or couldn't be loaded. Tap below to read it directly.</p>`)
        deepEl.innerHTML = parts.join('')
      }
    })
  })
}

// ——— Interactions ———

function setupInteractions() {
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const card = btn.closest('.news-card')
      card.classList.toggle('expanded')
      btn.textContent = card.classList.contains('expanded') ? 'Show less' : 'Deeper dive'
      // Mark as read when expanded
      if (card.classList.contains('expanded')) {
        markAsRead(card.dataset.link)
      }
    })
  })

  document.querySelectorAll('.read-link').forEach(link => {
    link.addEventListener('click', () => {
      const card = link.closest('.news-card')
      markAsRead(card.dataset.link)
    })
  })

  document.querySelectorAll('.topic-tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.stopPropagation()
      applyFilter(tag.dataset.topic)
    })
  })
}

// ——— Event Listeners ———

document.getElementById('clear-filter').addEventListener('click', clearFilter)
document.getElementById('page-title').addEventListener('click', () => location.reload())

// ——— Init ———

loadNews()

setInterval(() => {
  loadNews()
}, 5 * 60 * 1000)
