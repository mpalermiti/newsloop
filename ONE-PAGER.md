# GloSignal // tech news

**Tech news, amplified.**

Live at [mpalermiti.github.io/glosignal](https://mpalermiti.github.io/glosignal/)

---

## What it does

GloSignal aggregates the top tech stories from Techmeme into a fast, glass-morphism interface. Stories are ranked by trend score, enriched with AI-generated summaries via Claude, and organized by topic. The concentric-rings logo pulses based on news activity — the site's living signal meter.

---

## Key Features

### AI Summaries
Each story is summarized by Claude Sonnet via a Cloudflare Worker. Expands to show a concise summary and 3-4 key detail paragraphs. Falls back to HTML-extracted content when AI is unavailable.

### Signal Logo
The concentric-rings logo icon adapts to each theme's accent color and pulses based on news activity — quiet, steady, or busy. The logo is the site's real-time signal meter.

### Topic Filtering
Click any topic pill in the header to filter the grid. Multi-select supported — combine topics to narrow results. Surging topics glow to convey momentum. A clear button resets all filters.

### Story Ranking
Stories are sorted by trend score — a composite of Techmeme position, recency, Hacker News presence, and cross-source coverage. Top 3 stories get labeled badges (Top story / Trending).

### Morning Briefing
A swipeable card-by-card overlay of the top 5 trending stories. Auto-advances every 5 seconds with a progress bar, pauses on hover. Navigate with arrows, dots, or keyboard.

### Command Palette
`Cmd+K` opens a searchable command palette. Filter by topic, jump to a specific story, or clear filters — all from the keyboard.

### 10 Themes
5 dark + 5 light, switchable via a mode toggle (moon/sun) and accent dot picker. Theme persists across sessions.

| Dark         | Light        |
|-------------|-------------|
| Warm Ember  | Clean Paper  |
| Midnight Slate | Electric Ink |
| Matrix Terminal | Mint Fresh |
| Soft Graphite | Coral Pop |
| Cosmic Purple | Lavender Haze |

### Glow Effects
Cards emit a soft, multi-layered accent-colored glow on hover and a stronger persistent glow when expanded. Each theme defines its own glow color tuned to its palette.

### Read Tracking
Stories are marked as read when expanded, briefed, or clicked through. Read state persists in localStorage (last 200 articles).

### Responsive
Full mobile support — single-column grid, reduced topic count, touch-friendly 44px tap targets, and optimized layouts for small screens.

### Accessibility
Skip link, ARIA dialog roles with focus trapping on modals, keyboard-navigable topic filters and briefing (arrows, space to pause, escape to close), `focus-visible` outlines on all interactive elements, semantic HTML (`<main>`, `<time>`, `role="feed"`/`role="article"`), screen reader announcements for loading states and filter changes, improved color contrast across all themes, and `prefers-reduced-motion` support.

---

## Tech Stack

- **Vanilla JavaScript** — no frameworks, ES modules throughout
- **Vite** — dev server with HMR, optimized production builds
- **CSS custom properties** — full theme system with instant switching
- **Techmeme RSS** — news source, parsed and enriched client-side
- **Claude Sonnet 4.5** — AI-powered summaries via Cloudflare Worker
- **Cloudflare Workers** — serverless AI proxy (free tier)
- **GitHub Pages** — static hosting with automated deployment
