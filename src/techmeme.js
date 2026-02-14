// AI Worker URL — set after deploying Cloudflare Worker, empty string disables AI
const AI_WORKER_URL = 'https://glosignal-ai.michaelp-6a2.workers.dev'

const CORS_PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
]
const CORS = 'https://corsproxy.io/?'
const stopWords = new Set(['the','a','an','is','are','was','were','in','on','at','to','for','of','and','or','with','that','this','from','by','as','its','it','has','have','had','be','been','but','not','will','can','may','new','how','why','what','who','says','said','more','about','into','over','after','some','just','than','also','would','could','should','their','they','them','been','being','other','which','when','where','were','there','these','those'])

// Topic detection rules
const topicRules = [
  { tag: 'AI', keywords: ['ai', 'artificial intelligence', 'chatgpt', 'openai', 'llm', 'generative', 'copilot', 'gemini', 'claude', 'machine learning', 'deep learning', 'neural', 'gpt', 'anthropic', 'midjourney', 'stable diffusion', 'perplexity'] },
  { tag: 'Apple', keywords: ['apple', 'iphone', 'ipad', 'mac', 'ios', 'macos', 'wwdc', 'airpods', 'vision pro', 'app store', 'tim cook', 'siri'] },
  { tag: 'Google', keywords: ['google', 'alphabet', 'android', 'chrome', 'youtube', 'pixel', 'waymo', 'deepmind'] },
  { tag: 'Microsoft', keywords: ['microsoft', 'windows', 'azure', 'xbox', 'linkedin', 'bing', 'teams', 'satya nadella'] },
  { tag: 'Meta', keywords: ['meta', 'facebook', 'instagram', 'whatsapp', 'threads', 'zuckerberg', 'quest'] },
  { tag: 'Amazon', keywords: ['amazon', 'aws', 'alexa', 'prime', 'bezos'] },
  { tag: 'Crypto', keywords: ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'nft', 'web3', 'defi', 'coinbase', 'binance'] },
  { tag: 'Funding', keywords: ['raises', 'funding', 'valuation', 'series a', 'series b', 'series c', 'ipo', 'venture', 'investors', 'billion-dollar', 'acquisition', 'acquires', 'acquired', 'merger'] },
  { tag: 'Security', keywords: ['hack', 'breach', 'vulnerability', 'cybersecurity', 'ransomware', 'malware', 'privacy', 'surveillance', 'exploit', 'data leak'] },
  { tag: 'Startups', keywords: ['startup', 'launches', 'founded', 'y combinator', 'techstars'] },
  { tag: 'EVs', keywords: ['tesla', 'ev ', 'electric vehicle', 'rivian', 'lucid', 'charging', 'elon musk'] },
  { tag: 'Social', keywords: ['twitter', 'tiktok', 'snapchat', 'social media', 'x.com', 'bluesky', 'mastodon'] },
  { tag: 'Space', keywords: ['spacex', 'nasa', 'rocket', 'satellite', 'orbit', 'starship', 'launch', 'mars', 'moon'] },
  { tag: 'Policy', keywords: ['regulation', 'antitrust', 'lawsuit', 'legislation', 'congress', 'fcc', 'ftc', 'eu ', 'european commission', 'ban', 'fine', 'ruling', 'court', 'senate', 'doj', 'subpoena', 'dhs', 'executive order'] },
  { tag: 'Chips', keywords: ['chip', 'semiconductor', 'nvidia', 'amd', 'intel', 'tsmc', 'qualcomm', 'arm', 'gpu'] },
  { tag: 'Gaming', keywords: ['gaming', 'game', 'playstation', 'nintendo', 'steam', 'epic games', 'unity', 'unreal'] },
  { tag: 'Cloud', keywords: ['cloud', 'saas', 'infrastructure', 'kubernetes', 'serverless', 'databricks', 'snowflake'] },
  { tag: 'Health', keywords: ['health', 'biotech', 'medical', 'fda', 'drug', 'clinical', 'genomic', 'crispr', 'pharma'] },
  { tag: 'Telecom', keywords: ['5g', '6g', 'telecom', 'broadband', 'spectrum', 'carrier', 'verizon', 'at&t', 't-mobile'] },
  { tag: 'Robotics', keywords: ['robot', 'drone', 'autonomous', 'self-driving', 'humanoid'] },
]

// Fallback: extract the most distinctive capitalized word/phrase from the title
function fallbackTopic(title) {
  // Find capitalized multi-word proper nouns or single capitalized words
  const words = title.split(/\s+/)
  const candidates = []
  for (let i = 0; i < words.length; i++) {
    const w = words[i].replace(/[^a-zA-Z']/g, '')
    if (w.length < 3) continue
    // Skip common title-case words
    if (stopWords.has(w.toLowerCase())) continue
    if (/^[A-Z]/.test(w) && i > 0) {
      candidates.push(w)
    }
  }
  return candidates.length > 0 ? candidates[0] : 'Tech'
}

function detectTopics(title) {
  const lower = title.toLowerCase()
  const matched = topicRules
    .filter(rule => rule.keywords.some(kw => lower.includes(kw)))
    .map(rule => rule.tag)
    .slice(0, 2)
  if (matched.length > 0) return matched
  // Guarantee at least one topic
  return [fallbackTopic(title)]
}

function getUrgencyLabel(pubDate) {
  if (!pubDate) return null
  const ageMs = Date.now() - new Date(pubDate)
  const ageMins = ageMs / 60000
  if (ageMins < 30) return 'Just in'
  if (ageMins < 120) return 'Developing'
  return null
}

function extractDomain(url) {
  try { return new URL(url).hostname.replace('www.', '') }
  catch { return '' }
}

// Try fetching a URL through multiple CORS proxies
async function fetchWithProxy(url) {
  for (const makeProxy of CORS_PROXIES) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 6000)
      const res = await fetch(makeProxy(url), { signal: controller.signal })
      clearTimeout(timeout)
      if (res.ok) {
        const text = await res.text()
        if (text.length > 500) return text
      }
    } catch { /* try next proxy */ }
  }
  return null
}

// Parse an HTML string into article content
function extractFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // Get meta description for the short summary
  const metaDesc = doc.querySelector('meta[property="og:description"]')?.content
    || doc.querySelector('meta[name="description"]')?.content
    || doc.querySelector('meta[name="twitter:description"]')?.content
    || ''

  // Extract meaningful paragraphs from article body
  const selectors = [
    'article p', '[class*="article"] p', '[class*="story"] p',
    '[class*="post"] p', '[class*="content"] p', 'main p',
    '.entry-content p', '.body p', '#article-body p'
  ]
  const skipPattern = /^(by |photo |image |credit |published |updated |share |comment|advertisement|subscribe|sign up|newsletter)/i
  const paragraphs = Array.from(doc.querySelectorAll(selectors.join(', ')))
    .map(p => p.textContent.trim())
    .filter(t => t.length > 60 && !skipPattern.test(t))

  // Deduplicate paragraphs (some selectors overlap)
  const seen = new Set()
  const uniqueParagraphs = paragraphs.filter(p => {
    const key = p.substring(0, 80)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Short summary: meta description or first paragraph
  const shortSummary = (metaDesc && metaDesc.length > 40)
    ? cleanSummary(metaDesc, 200)
    : (uniqueParagraphs[0] ? cleanSummary(uniqueParagraphs[0], 200) : null)

  // Deep extract: multiple paragraphs for expanded view
  const deepParagraphs = uniqueParagraphs.slice(0, 4).map(p => cleanSummary(p, 300))

  // Raw text for AI summarization input
  const rawText = uniqueParagraphs.slice(0, 8).join('\n\n')

  return {
    summary: shortSummary,
    deepExtract: deepParagraphs.length > 0 ? deepParagraphs : null,
    rawText: rawText.length > 100 ? rawText : null,
  }
}

// Fetch the actual article and extract both a short summary and deeper extract
async function fetchArticleContent(url) {
  try {
    const html = await fetchWithProxy(url)
    if (!html) return null
    return extractFromHtml(html)
  } catch {
    return null
  }
}

function cleanSummary(text, maxLen) {
  // Clean up whitespace and truncate at sentence boundary
  let clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLen) return clean
  // Try to cut at last sentence boundary before maxLen
  const truncated = clean.substring(0, maxLen)
  const lastPeriod = truncated.lastIndexOf('. ')
  if (lastPeriod > maxLen * 0.5) {
    return truncated.substring(0, lastPeriod + 1)
  }
  return truncated + '...'
}

// Parse Techmeme description HTML for article URL, summary snippet, and related sources
function parseDescription(html) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html

  // Get the real article URL (first link that's not techmeme.com)
  const allLinks = Array.from(tmp.querySelectorAll('a[href]'))
  const articleLink = allLinks.find(a => {
    const href = a.getAttribute('href') || ''
    return href.startsWith('http') && !href.includes('techmeme.com')
  })
  const articleUrl = articleLink?.getAttribute('href') || ''

  // Extract summary: text after the em dash (—/&mdash;)
  const fullText = tmp.textContent || ''
  const dashIndex = fullText.indexOf('—')
  let snippet = ''
  if (dashIndex !== -1) {
    snippet = fullText.substring(dashIndex + 1).trim()
    // There may be multiple em-dash separated parts, join them
    snippet = snippet.replace(/\s+/g, ' ').trim()
    // Remove trailing ellipsis artifacts
    snippet = snippet.replace(/\s*…\s*$/, '...')
  }

  // Related sources: names + URLs from links after the first article link
  const sourceNames = []
  const sourceLinks = []
  allLinks.slice(1).forEach(a => {
    const name = a.textContent.trim()
    const href = a.getAttribute('href') || ''
    if (name.length > 2 && name.length < 60 && href.startsWith('http') && !href.includes('techmeme.com')) {
      sourceNames.push(name)
      sourceLinks.push(href)
    }
  })

  return { articleUrl, snippet, sourceNames: sourceNames.slice(0, 5), sourceLinks: sourceLinks.slice(0, 5) }
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Extract significant keywords from a title
function getKeywords(text) {
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w))
}

// Check if two titles share enough keywords to be about the same topic
function titlesOverlap(a, b) {
  const wordsA = getKeywords(a)
  const wordsB = new Set(getKeywords(b))
  if (wordsA.length === 0 || wordsB.size === 0) return false
  const matches = wordsA.filter(w => wordsB.has(w)).length
  return matches >= 3
}

// Fetch Hacker News top stories
async function fetchHN() {
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    const ids = await res.json()
    const stories = await Promise.all(
      ids.slice(0, 30).map(id =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
      )
    )
    return stories.filter(s => s?.url).map(s => ({
      title: s.title || '',
      domain: extractDomain(s.url),
      score: s.score || 0,
      id: s.id,
    }))
  } catch {
    return []
  }
}

// Fetch and parse an RSS feed, return titles
async function fetchRSSTitles(url) {
  try {
    const res = await fetch(CORS + encodeURIComponent(url))
    if (!res.ok) return []
    const text = await res.text()
    const xml = new DOMParser().parseFromString(text, 'text/xml')
    return Array.from(xml.querySelectorAll('item')).slice(0, 20).map(item =>
      item.querySelector('title')?.textContent || ''
    )
  } catch {
    return []
  }
}

// Main: fetch Techmeme + cross-reference for trending
export async function getTechmemeNews() {
  try {
    // Fetch all sources in parallel
    const [techmemeRes, hnStories, vergeTitles, arsTitles] = await Promise.all([
      fetch(CORS + encodeURIComponent('https://www.techmeme.com/feed.xml')),
      fetchHN(),
      fetchRSSTitles('https://www.theverge.com/rss/index.xml'),
      fetchRSSTitles('https://feeds.arstechnica.com/arstechnica/index'),
    ])

    if (!techmemeRes.ok) throw new Error('Techmeme fetch failed')

    const techmemeXml = new DOMParser().parseFromString(await techmemeRes.text(), 'text/xml')
    const items = Array.from(techmemeXml.querySelectorAll('item')).slice(0, 20)

    return items.map((item, index) => {
      const rawTitle = item.querySelector('title')?.textContent || ''
      // Strip trailing source attribution like "(The Information)" or "(Joe Smith/TechCrunch)"
      const title = rawTitle.replace(/\s*\([^)]+\)\s*$/, '').trim()
      const rawDescription = item.querySelector('description')?.textContent || ''
      const { articleUrl, snippet, sourceNames, sourceLinks } = parseDescription(rawDescription)
      const techmemeUrl = item.querySelector('link')?.textContent || ''
      const link = articleUrl || techmemeUrl
      const pubDate = item.querySelector('pubDate')?.textContent || ''
      const domain = extractDomain(link)

      // Trending score from multiple signals
      let trendScore = 0

      // Signal 1: Top of Techmeme feed
      if (index < 5) trendScore++

      // Signal 2: Posted recently
      if (pubDate) {
        const ageHours = (Date.now() - new Date(pubDate)) / 3600000
        if (ageHours < 3) trendScore++
      }

      // Signal 3: On Hacker News front page
      const hnMatch = hnStories.find(hn =>
        hn.domain === domain || titlesOverlap(hn.title, title)
      )
      if (hnMatch) {
        trendScore++
        if (hnMatch.score > 200) trendScore++
      }

      // Signal 4: Covered by The Verge
      if (vergeTitles.some(t => titlesOverlap(t, title))) trendScore++

      // Signal 5: Covered by Ars Technica
      if (arsTitles.some(t => titlesOverlap(t, title))) trendScore++

      return {
        title,
        link,
        snippet,
        summary: snippet || null,
        deepExtract: null,
        relatedSources: sourceNames,
        relatedLinks: sourceLinks,
        sourceCount: Math.max(1, sourceNames.length + 1),
        domain,
        pubDate: pubDate ? formatDate(pubDate) : '',
        rawPubDate: pubDate,
        trending: trendScore >= 2,
        trendScore,
        topics: detectTopics(title),
        urgency: getUrgencyLabel(pubDate),
        hnUrl: hnMatch ? `https://news.ycombinator.com/item?id=${hnMatch.id}` : null,
        techmemeUrl: techmemeUrl.includes('techmeme.com') ? techmemeUrl : null,
      }
    })
  } catch (error) {
    console.error('Error fetching news:', error)
    return []
  }
}

// AI-powered summarization via Cloudflare Worker
async function aiSummarize(title, rawText) {
  if (!AI_WORKER_URL || !rawText) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(AI_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, text: rawText }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    if (data.summary && data.deepExtract) return data
    return null
  } catch {
    return null
  }
}

// Try fetching article content, falling back to related source URLs
async function fetchWithFallbacks(item) {
  // Try the primary article first
  const primary = await fetchArticleContent(item.link)
  if (primary?.deepExtract) {
    return { ...primary, altSource: null }
  }

  // Primary failed — try related source URLs
  if (item.relatedLinks && item.relatedLinks.length > 0) {
    for (let i = 0; i < Math.min(item.relatedLinks.length, 3); i++) {
      const alt = await fetchArticleContent(item.relatedLinks[i])
      if (alt?.deepExtract) {
        return { ...alt, altSource: item.relatedSources[i] || extractDomain(item.relatedLinks[i]) }
      }
    }
  }

  // Nothing worked
  return { summary: primary?.summary || null, deepExtract: null, altSource: null }
}

// Enrich stories with deeper article content (called after initial render)
export async function enrichWithSummaries(news) {
  // Phase 1: Scrape articles for raw text + fallback summaries
  const batchSize = 6
  const contents = new Array(news.length).fill(null)

  for (let i = 0; i < news.length; i += batchSize) {
    const batch = news.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map(item => fetchWithFallbacks(item))
    )
    results.forEach((result, j) => {
      contents[i + j] = result.status === 'fulfilled' ? result.value : null
    })
  }

  // Phase 2: AI enhancement (if worker is configured)
  if (AI_WORKER_URL) {
    for (let i = 0; i < news.length; i += batchSize) {
      const aiResults = await Promise.allSettled(
        news.slice(i, i + batchSize).map((item, j) => {
          const rawText = contents[i + j]?.rawText
          if (!rawText) return Promise.resolve(null)
          return aiSummarize(item.title, rawText)
        })
      )
      aiResults.forEach((result, j) => {
        if (result.status === 'fulfilled' && result.value) {
          contents[i + j] = {
            ...contents[i + j],
            summary: result.value.summary,
            deepExtract: result.value.deepExtract,
          }
        }
      })
    }
  }

  return news.map((item, i) => {
    const fetched = contents[i]
    return {
      ...item,
      summary: fetched?.summary || item.snippet || null,
      deepExtract: fetched?.deepExtract || null,
      altSource: fetched?.altSource || null,
    }
  })
}
