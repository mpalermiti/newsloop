import './style.css'
import { getTechmemeNews, enrichWithSummaries } from './techmeme.js'

const app = document.querySelector('#app')
let activeFilters = new Set()
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
      <h1 class="page-title" id="page-title">Latest tech news</h1>
      <span class="new-count-badge" id="new-count" style="display:none"></span>
      <div class="header-divider"></div>
      <div class="pulse-mini" id="pulse-mini" style="display:none">
        <div class="pulse-mini-bars" id="pulse-bars"></div>
        <span class="pulse-mini-stat"><strong id="pulse-num">0</strong>/hr \u00B7 <span id="pulse-label"></span></span>
      </div>
      <div class="header-divider" id="pulse-divider" style="display:none"></div>
      <div class="header-topics" id="header-topics"></div>
      <button class="header-clear-btn" id="header-clear-btn" style="display:none">\u2715 Clear</button>
      <div class="header-spacer"></div>
      <div class="header-actions">
        <button class="header-briefing-btn" id="briefing-open-btn">Briefing</button>
        <kbd class="kbd-hint" id="kbd-hint">\u2318K</kbd>
        <span class="last-updated" id="last-updated"></span>
      </div>
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
  <div class="briefing-overlay" id="briefing-overlay" style="display:none">
    <div class="briefing-container">
      <div class="briefing-header">
        <span class="briefing-header-title">Your morning briefing</span>
        <button class="briefing-close-btn" id="briefing-close-btn">\u2715</button>
      </div>
      <div class="briefing-viewport">
        <div class="briefing-cards" id="briefing-track"></div>
      </div>
      <div class="briefing-timer" id="briefing-timer"><div class="briefing-timer-fill" id="briefing-timer-fill"></div></div>
      <div class="briefing-nav">
        <button class="briefing-btn" id="briefing-prev">\u2039</button>
        <div class="briefing-dots" id="briefing-dots"></div>
        <button class="briefing-btn" id="briefing-next">\u203A</button>
      </div>
    </div>
  </div>
  <div class="cmd-palette-overlay" id="cmd-overlay" style="display:none">
    <div class="cmd-palette" id="cmd-palette">
      <input type="text" class="cmd-input" id="cmd-input" placeholder="Search stories, filter by topic..." autocomplete="off" />
      <div class="cmd-results" id="cmd-results"></div>
      <div class="cmd-footer">
        <span class="cmd-hint">\u2191\u2193 navigate</span>
        <span class="cmd-hint">\u21B5 select</span>
        <span class="cmd-hint">esc close</span>
      </div>
    </div>
  </div>
`

// ——— News Pulse ———

let pulseInterval = null

function initPulseBars() {
  const container = document.getElementById('pulse-bars')
  if (!container || container.children.length > 0) return
  for (let i = 0; i < 16; i++) {
    const bar = document.createElement('div')
    bar.className = 'pulse-bar'
    const h = 4 + Math.random() * 14
    bar.style.setProperty('--h', h + 'px')
    bar.style.animationDelay = (i * 0.1) + 's'
    container.appendChild(bar)
  }
}

function updatePulse(news) {
  initPulseBars()

  // Count stories in last hour
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  const recentCount = news.filter(item => {
    if (!item.rawPubDate) return false
    return new Date(item.rawPubDate).getTime() > oneHourAgo
  }).length

  // Qualitative label
  let label = 'Quiet'
  if (recentCount >= 10) label = 'Busy'
  else if (recentCount >= 4) label = 'Steady'

  // Topic frequency
  const topicCounts = {}
  news.forEach(item => {
    item.topics.forEach(t => {
      topicCounts[t] = (topicCounts[t] || 0) + 1
    })
  })
  const sortedTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const maxCount = sortedTopics.length > 0 ? sortedTopics[0][1] : 0

  // Update pulse stat
  const numEl = document.getElementById('pulse-num')
  const labelEl = document.getElementById('pulse-label')
  if (numEl) numEl.textContent = recentCount
  if (labelEl) labelEl.textContent = label

  // Show pulse
  const pulseEl = document.getElementById('pulse-mini')
  const pulseDivider = document.getElementById('pulse-divider')
  if (pulseEl) pulseEl.style.display = ''
  if (pulseDivider) pulseDivider.style.display = ''

  // Update topic pills in header
  const topicsEl = document.getElementById('header-topics')
  if (topicsEl) {
    topicsEl.innerHTML = sortedTopics.map(([topic, count]) => {
      const isHot = count === maxCount && count >= 3
      return `<span class="header-topic-pill${isHot ? ' hot' : ''}" data-topic="${topic}">${topic}${isHot ? ' \u2014 surging' : ''}</span>`
    }).join('')

    // Attach filter click handlers to topic pills
    topicsEl.querySelectorAll('.header-topic-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const topic = pill.dataset.topic
        if (activeFilters.has(topic)) {
          activeFilters.delete(topic)
        } else {
          activeFilters.add(topic)
        }
        applyFilters()
      })
    })
  }

  // Animate number drift
  if (pulseInterval) clearInterval(pulseInterval)
  let displayNum = recentCount
  pulseInterval = setInterval(() => {
    displayNum += Math.round((Math.random() - 0.45) * 2)
    displayNum = Math.max(0, displayNum)
    if (numEl) numEl.textContent = displayNum
  }, 3000)
}

// ——— Morning Briefing ———

let briefingIdx = 0
let briefingStories = []
let briefingAutoTimer = null
let briefingAnimFrame = null
let briefingTimerStart = 0
const BRIEFING_INTERVAL = 5000

function openBriefing() {
  if (currentNews.length === 0) return
  const overlay = document.getElementById('briefing-overlay')
  overlay.style.display = ''

  // Top 5 stories by trendScore
  briefingStories = [...currentNews]
    .sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0))
    .slice(0, 5)

  // Render cards
  const track = document.getElementById('briefing-track')
  track.innerHTML = briefingStories.map((item, i) => `
    <div class="briefing-card">
      <div class="briefing-num">Story ${i + 1} of ${briefingStories.length}</div>
      <div class="briefing-title">${item.title}</div>
      <div class="briefing-summary">${item.summary || item.snippet || ''}</div>
      <div class="briefing-source">${item.domain} \u00B7 ${item.pubDate}</div>
    </div>
  `).join('')

  // Render dots
  const dotsEl = document.getElementById('briefing-dots')
  dotsEl.innerHTML = briefingStories.map((_, i) =>
    `<div class="briefing-dot${i === 0 ? ' active' : ''}"></div>`
  ).join('')

  briefingIdx = 0
  goToBriefing(0)
  startBriefingTimer()

  // Mark first story as read
  markAsRead(briefingStories[0].link)
}

function closeBriefing() {
  document.getElementById('briefing-overlay').style.display = 'none'
  stopBriefingTimer()
}

function goToBriefing(i) {
  briefingIdx = i
  const track = document.getElementById('briefing-track')
  track.style.transform = `translateX(-${i * 100}%)`
  const dots = document.querySelectorAll('#briefing-dots .briefing-dot')
  dots.forEach((d, j) => d.classList.toggle('active', j === i))

  // Mark story as read
  if (briefingStories[i]) markAsRead(briefingStories[i].link)

  // Reset auto-advance timer
  startBriefingTimer()
}

function startBriefingTimer() {
  stopBriefingTimer()
  briefingTimerStart = Date.now()
  const fill = document.getElementById('briefing-timer-fill')

  function tick() {
    const elapsed = Date.now() - briefingTimerStart
    const pct = Math.min(100, (elapsed / BRIEFING_INTERVAL) * 100)
    if (fill) fill.style.width = pct + '%'
    if (elapsed >= BRIEFING_INTERVAL) {
      goToBriefing((briefingIdx + 1) % briefingStories.length)
      return
    }
    briefingAnimFrame = requestAnimationFrame(tick)
  }
  briefingAnimFrame = requestAnimationFrame(tick)
}

function stopBriefingTimer() {
  if (briefingAnimFrame) cancelAnimationFrame(briefingAnimFrame)
  briefingAnimFrame = null
}

// Briefing event listeners
document.getElementById('briefing-open-btn').addEventListener('click', openBriefing)
document.getElementById('briefing-close-btn').addEventListener('click', closeBriefing)
document.getElementById('briefing-prev').addEventListener('click', () => {
  goToBriefing((briefingIdx + briefingStories.length - 1) % briefingStories.length)
})
document.getElementById('briefing-next').addEventListener('click', () => {
  goToBriefing((briefingIdx + 1) % briefingStories.length)
})
document.getElementById('briefing-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'briefing-overlay') closeBriefing()
})

// Pause auto-advance on hover
const briefingContainer = document.querySelector('.briefing-container')
if (briefingContainer) {
  briefingContainer.addEventListener('mouseenter', stopBriefingTimer)
  briefingContainer.addEventListener('mouseleave', () => {
    if (document.getElementById('briefing-overlay').style.display !== 'none') {
      startBriefingTimer()
    }
  })
}

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
  if (activeFilters.size > 0) {
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
      description: `${item.domain} \u00B7 ${item.pubDate}`,
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
    const icon = item.type === 'topic' ? '\u22B9' : item.type === 'action' ? '\u21BA' : '\u2192'
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

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    if (cmdOverlay.style.display === 'none') openPalette()
    else closePalette()
  }
  if (e.key === 'Escape') {
    if (document.getElementById('briefing-overlay').style.display !== 'none') {
      closeBriefing()
    } else if (cmdOverlay.style.display !== 'none') {
      closePalette()
    }
  }
  // Briefing arrow navigation
  if (document.getElementById('briefing-overlay').style.display !== 'none') {
    if (e.key === 'ArrowRight') {
      goToBriefing((briefingIdx + 1) % briefingStories.length)
    } else if (e.key === 'ArrowLeft') {
      goToBriefing((briefingIdx + briefingStories.length - 1) % briefingStories.length)
    }
  }
})

// Kbd hint click opens palette
document.getElementById('kbd-hint').addEventListener('click', openPalette)

// ——— Filter ———

function applyFilter(topic) {
  activeFilters.clear()
  activeFilters.add(topic)
  applyFilters()
}

function clearFilter() {
  activeFilters.clear()
  applyFilters()
}

function applyFilters() {
  updateTopicPillStates()

  document.querySelectorAll('.news-card:not(.skeleton-card)').forEach(card => {
    if (activeFilters.size === 0) {
      card.style.display = ''
      card.style.animation = 'none'
      card.offsetHeight
      card.style.animation = 'cardEnter 0.3s ease-out both'
    } else {
      const cardTopics = Array.from(card.querySelectorAll('.topic-tag')).map(t => t.textContent)
      const matches = cardTopics.some(t => activeFilters.has(t))
      if (matches) {
        card.style.display = ''
        card.style.animation = 'none'
        card.offsetHeight
        card.style.animation = 'cardEnter 0.3s ease-out both'
      } else {
        card.style.display = 'none'
      }
    }
  })
}

function updateTopicPillStates() {
  document.querySelectorAll('.header-topic-pill').forEach(pill => {
    pill.classList.toggle('active', activeFilters.has(pill.dataset.topic))
  })

  const clearBtn = document.getElementById('header-clear-btn')
  if (clearBtn) {
    clearBtn.style.display = activeFilters.size > 0 ? '' : 'none'
  }
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
        ${item.trending ? '<span class="trending-badge">\uD83D\uDD25</span>' : ''}
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
        <a href="${item.link}" target="_blank" class="read-link">Read full article \u2192</a>
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
    timestamp.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // Re-apply active filters if any were set
  if (activeFilters.size > 0) applyFilters()

  // Update new count badge
  updateNewCount()

  // Update News Pulse
  updatePulse(news)

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

document.getElementById('page-title').addEventListener('click', () => location.reload())
document.getElementById('header-clear-btn').addEventListener('click', clearFilter)

// ——— Init ———

loadNews()

setInterval(() => {
  loadNews()
}, 5 * 60 * 1000)
