# Glow Stack // tech news

**A curated tech news reader with a signature glow.**

Live at [mpalermiti.github.io/glowstack](https://mpalermiti.github.io/glowstack/)

---

## What it does

Glow Stack aggregates the top tech stories from Techmeme into a fast, glass-morphism interface. Stories are ranked by trend score, enriched with AI-generated summaries, and organized by topic. Cards glow in the active theme's accent color on hover and expansion — the signature visual of the app.

---

## Key Features

### News Pulse
A real-time activity indicator in the header. Shows stories per hour, a qualitative label (Busy / Steady / Quiet), and the hottest topics as filterable pills. The number drifts subtly to convey liveness.

### Topic Filtering
Click any topic pill in the header to filter the grid. Multi-select supported — combine topics to narrow results. A clear button resets all filters. On mobile, topics are capped at 3 to keep the header on one line.

### Deeper Dive
Each card has a "Deeper dive" button that expands to show an AI-extracted deep summary of the article, plus a direct link to the source. Expanded cards get an accent-colored glow border.

### Morning Briefing
A swipeable card-by-card overlay of the top 5 trending stories. Auto-advances every 5 seconds with a progress bar, pauses on hover. Navigate with arrows, dots, or keyboard. Accessible via the "Briefing" button in the header.

### Command Palette
`Cmd+K` opens a searchable command palette. Filter by topic, jump to a specific story, or clear filters — all from the keyboard. Supports arrow key navigation and enter to select.

### 10 Themes
5 dark + 5 light, switchable via a mode toggle (moon/sun) and accent dot picker at the bottom of the page. Theme persists across sessions via localStorage.

| Dark         | Light        |
|-------------|-------------|
| Warm Ember  | Clean Paper  |
| Midnight Slate | Electric Ink |
| Matrix Terminal | Mint Fresh |
| Soft Graphite | Coral Pop |
| Cosmic Purple | Lavender Haze |

### Glow Effects
The namesake feature. Cards emit a soft, multi-layered accent-colored glow on hover and a stronger persistent glow when expanded. Each theme defines its own glow color tuned to its palette.

### Read Tracking
Stories are marked as read when expanded, briefed, or clicked through. Read state persists in localStorage (last 200 articles). Unread count shown in the header.

### Responsive
Full mobile support — single-column grid, reduced topic count, touch-friendly 44px tap targets on the theme switcher, and optimized layouts for small screens.

---

## Tech Stack

- **Vanilla JavaScript** — no frameworks, ES modules throughout
- **Vite** — dev server with HMR, optimized production builds
- **CSS custom properties** — full theme system with instant switching
- **Techmeme RSS** — news source, parsed and enriched client-side
- **AI summaries** — articles enriched with deeper extracts via API
- **GitHub Pages** — static hosting with automated deployment
