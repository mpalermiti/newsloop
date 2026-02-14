import './style.css'
import { getTechmemeNews, enrichWithSummaries } from './techmeme.js'

const app = document.querySelector('#app')
let activeFilters = new Set()
let currentNews = []

// ——— Theme ———

const THEME_KEY = 'glowstack_theme'
const DEFAULT_THEME = 'warm-ember'

const DARK_THEMES = [
  { id: 'warm-ember', name: 'Ember', color: '#f0a060' },
  { id: 'midnight-slate', name: 'Slate', color: '#5b9fff' },
  { id: 'matrix', name: 'Matrix', color: '#00ff78' },
  { id: 'graphite', name: 'Graphite', color: '#888' },
  { id: 'cosmic', name: 'Cosmic', color: '#c78dff' },
]
const LIGHT_THEMES = [
  { id: 'clean-paper', name: 'Paper', color: '#b07830' },
  { id: 'electric-ink', name: 'Ink', color: '#4a52e0' },
  { id: 'mint-fresh', name: 'Mint', color: '#0d9668' },
  { id: 'coral-pop', name: 'Coral', color: '#e05540' },
  { id: 'lavender-haze', name: 'Lavender', color: '#7c4dca' },
]

function isDarkTheme(id) {
  return DARK_THEMES.some(t => t.id === id)
}

function getTheme() {
  return localStorage.getItem(THEME_KEY) || DEFAULT_THEME
}

function setTheme(theme) {
  const scrollY = window.scrollY
  const docHeight = document.documentElement.scrollHeight
  const scrollRatio = docHeight > window.innerHeight ? scrollY / (docHeight - window.innerHeight) : 0
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem(THEME_KEY, theme)
  updateThemeSelector(theme)
  const newDocHeight = document.documentElement.scrollHeight
  window.scrollTo(0, scrollRatio * (newDocHeight - window.innerHeight))
}

function updateThemeSelector(theme) {
  const dark = isDarkTheme(theme)
  document.querySelectorAll('.theme-mode-btn').forEach(b => {
    b.classList.toggle('active', (b.dataset.mode === 'dark') === dark)
  })
  document.querySelectorAll('.theme-accent').forEach(d => {
    d.classList.toggle('active', d.dataset.theme === theme)
  })
  // Show the right accent group
  const group = dark ? 'dark' : 'light'
  document.querySelectorAll('.theme-accent-group').forEach(g => {
    g.style.display = g.dataset.group === group ? 'flex' : 'none'
  })
}

// Apply theme immediately (before render)
document.documentElement.setAttribute('data-theme', getTheme())

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
      <h1 class="page-title" id="page-title">Glow Stack</h1>
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
    <div class="theme-selector">
      <div class="theme-mode-toggle">
        <button class="theme-mode-btn${isDarkTheme(getTheme()) ? ' active' : ''}" data-mode="dark" aria-label="Dark mode">&#9790;</button>
        <button class="theme-mode-btn${!isDarkTheme(getTheme()) ? ' active' : ''}" data-mode="light" aria-label="Light mode">&#9728;</button>
      </div>
      <div class="theme-accent-divider"></div>
      <div class="theme-accent-group" data-group="dark" style="display:${isDarkTheme(getTheme()) ? 'flex' : 'none'}">
        ${DARK_THEMES.map(t => `<button class="theme-accent${getTheme() === t.id ? ' active' : ''}" data-theme="${t.id}" data-name="${t.name}" style="--dot:${t.color}" aria-label="${t.name}"></button>`).join('')}
      </div>
      <div class="theme-accent-group" data-group="light" style="display:${!isDarkTheme(getTheme()) ? 'flex' : 'none'}">
        ${LIGHT_THEMES.map(t => `<button class="theme-accent${getTheme() === t.id ? ' active' : ''}" data-theme="${t.id}" data-name="${t.name}" style="--dot:${t.color}" aria-label="${t.name}"></button>`).join('')}
      </div>
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
  const topicLimit = window.innerWidth <= 768 ? 3 : 6
  const sortedTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topicLimit)
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
        const card = document.querySelector(`.news-card[data-link="${CSS.escape(item.link)}"]`)
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

// ——— Deep Dive Extras ———

// Normalize a source name or domain for comparison: strip spaces, dots, "the", "www"
function normSource(str) {
  return str.toLowerCase().replace(/^(the |www\.)/g, '').replace(/[\s.\-]+/g, '').replace(/\.com$|\.org$|\.net$|\.io$|\.co$/g, '')
}

function sourcesMatch(a, b) {
  const na = normSource(a)
  const nb = normSource(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

function buildExtras(item, original, hasDeepExtract) {
  const parts = []

  // HN discussion link
  if (original.hnUrl) {
    parts.push(`<div class="deep-extract-link"><a href="${original.hnUrl}" target="_blank" class="hn-link">Hacker News discussion \u2192</a></div>`)
  }

  // Related sources as clickable links — filter out the primary source and the alt source used for deep extract
  if (original.relatedLinks && original.relatedLinks.length > 0) {
    const links = []
    original.relatedSources.forEach((name, i) => {
      if (sourcesMatch(name, original.domain)) return
      if (item.altSource && sourcesMatch(name, item.altSource)) return
      const url = original.relatedLinks[i]
      // Also filter by URL domain matching
      if (url && sourcesMatch(url.replace(/^https?:\/\//, '').split('/')[0], original.domain)) return
      links.push(url ? `<a href="${url}" target="_blank" class="related-link">${name}</a>` : name)
    })
    if (links.length > 0) {
      parts.push(`<p class="deep-extract-label">${hasDeepExtract ? 'Also covering this story' : 'Read from another source'}</p>`)
      parts.push(`<p class="deep-extract-paragraph">${links.join(' \u00B7 ')}</p>`)
    }
  }

  // Techmeme discussion page — curated multi-source coverage
  if (original.techmemeUrl) {
    parts.push(`<div class="deep-extract-link"><a href="${original.techmemeUrl}" target="_blank" class="hn-link">View full discussion on Techmeme \u2192</a></div>`)
  }

  // Search link as fallback
  const searchQuery = encodeURIComponent(original.title)
  parts.push(`<div class="deep-extract-link"><a href="https://news.google.com/search?q=${searchQuery}" target="_blank" class="search-link">Search for more coverage \u2192</a></div>`)

  return parts.join('')
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

  // Sort by trendScore descending, preserving Techmeme order as tiebreaker
  const sorted = news.map((item, i) => ({ ...item, originalIndex: i }))
    .sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0) || a.originalIndex - b.originalIndex)

  const newsGrid = document.createElement('div')
  newsGrid.className = 'news-grid'

  sorted.forEach((item, sortedIndex) => {
    const index = item.originalIndex
    const card = document.createElement('div')
    card.className = 'news-card card-type-1'
    if (sortedIndex === 0) card.classList.add('top-story')
    card.dataset.link = item.link
    card.dataset.topics = JSON.stringify(item.topics)
    card.style.animationDelay = `${sortedIndex * 0.05}s`

    if (item.trending) card.classList.add('trending')
    if (isRead(item.link)) card.classList.add('is-read')

    card.innerHTML = `
      <div class="news-card-header">
        ${sortedIndex === 0 ? '<span class="top-story-label">Top story</span>' : sortedIndex < 3 ? '<span class="top-story-label">Trending</span>' : (item.trending ? '<span class="trending-badge">\uD83D\uDD25</span>' : '')}
        ${item.urgency ? `<span class="urgency-label">${item.urgency}</span>` : ''}
        <span class="news-source">${item.domain}</span>
        <span class="news-time">${item.pubDate}</span>
      </div>
      <h3 class="news-title">${item.title}</h3>
      <div class="card-meta">
        ${item.topics.length > 0 ? `<div class="topic-tags">${item.topics.map(t => `<span class="topic-tag" data-topic="${t}">${t}</span>`).join('')}</div>` : ''}
      </div>
      ${item.summary ? `<p class="quick-take" data-index="${index}">${item.summary}</p>` : ''}
      <div class="expand-content">
        <div class="deep-extract" data-deep-index="${index}">
          <div class="deep-extract-loading">
            <span class="summary-shimmer">Loading deeper summary...</span>
          </div>
        </div>
        <a href="${item.link}" target="_blank" class="read-link">Read full article \u2192</a>
      </div>
      <button class="expand-btn">Summary</button>
    `

    newsGrid.appendChild(card)
  })

  const loading = container.querySelector('.loading')
  if (loading) loading.remove()

  const error = container.querySelector('.error')
  if (error) error.remove()

  const existingGrid = container.querySelector('.news-grid')
  if (existingGrid) existingGrid.remove()

  const themeSelector = container.querySelector('.theme-selector')
  if (themeSelector) {
    container.insertBefore(newsGrid, themeSelector)
  } else {
    container.appendChild(newsGrid)
  }

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
      if (!deepEl) return

      let html = ''
      const hasDeep = item.deepExtract && item.deepExtract.length > 0

      if (hasDeep) {
        if (item.altSource && !sourcesMatch(item.altSource, news[index].domain)) {
          html += `<p class="deep-extract-label">Via ${item.altSource}</p>`
        }
        html += item.deepExtract.map(p => `<p class="deep-extract-paragraph">${p}</p>`).join('')
      }

      html += buildExtras(item, news[index], hasDeep)
      deepEl.innerHTML = html

      // Update button label based on content type
      const card = deepEl.closest('.news-card')
      const btn = card?.querySelector('.expand-btn')
      if (btn && !card.classList.contains('expanded')) {
        btn.textContent = hasDeep ? 'Summary' : 'Explore'
      }
      btn?.setAttribute('data-label', hasDeep ? 'Summary' : 'Explore')
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
      btn.textContent = card.classList.contains('expanded') ? 'Show less' : (btn.getAttribute('data-label') || 'Summary')
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
// Theme accent dots
document.querySelectorAll('.theme-accent').forEach(dot => {
  dot.addEventListener('click', () => setTheme(dot.dataset.theme))
})

// Theme mode toggle (dark/light)
document.querySelectorAll('.theme-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetMode = btn.dataset.mode
    const current = getTheme()
    const currentIsDark = isDarkTheme(current)
    if ((targetMode === 'dark') === currentIsDark) return
    // Switch to first theme of the target mode
    const targetThemes = targetMode === 'dark' ? DARK_THEMES : LIGHT_THEMES
    setTheme(targetThemes[0].id)
  })
})

// ——— Init ———

loadNews()

setInterval(() => {
  loadNews()
}, 5 * 60 * 1000)
