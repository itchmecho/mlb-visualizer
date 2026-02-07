# MLB Visualizer v4.0 — Feature Design
**Date:** 2026-02-06
**Status:** Approved

---

## Overview

Major feature expansion covering three areas: deeper player data, new pages/views, and visual polish. All features use the existing MLB Stats API unless noted. No new dependencies — charts and animations are pure CSS/SVG.

---

## 1. Player Card Tab System

Transform the player card from a single-view into a tabbed interface with three views.

### Tab Bar
- Sits below the player header (name, photo, team, position) — header stays constant
- Minimal text tabs with team-colored active underline, not chunky buttons
- Tabs: **Overview** | **Career** | **Game Log**

### 1a. Overview Tab (Default)
- Existing percentile stat bars — no changes needed
- Add additional MLB API stats to existing categories:
  - **Hitters:** BABIP, ISO (already calculated), BB%, K%
  - **Pitchers:** BABIP, K/BB ratio, HR/9, BB/9, H/9
- Future-proofed: a fourth "Advanced" tab can slot in later for Baseball Savant data (exit velo, barrel %, xBA, xSLG, hard hit %) without restructuring

### 1b. Career Tab
- **Sparkline charts** at top for 3-4 key stats:
  - Hitters: AVG, OPS, HR
  - Pitchers: ERA, WHIP, K
  - Pure inline SVG, thin lines, dots at data points
  - Team-colored or percentile-colored
  - Draw-in animation via SVG `stroke-dashoffset`
- **Year-by-year stat table** below:
  - One row per season, career totals row at bottom
  - Percentile coloring per cell (same 5-tier system)
  - Compact density, good column alignment
- **Radar chart:**
  - Pentagon/hexagon showing player profile across major categories
  - Hitters: Power, Contact, Speed, Discipline, Run Production
  - Pitchers: Strikeouts, Control, Durability, Ground Ball, Run Prevention
  - Pure SVG, thin lines, team-colored fill at low opacity
  - Small element — complements the table, not a hero
- **Data source:** MLB Stats API `statType=yearByYear`

### 1c. Game Log Tab
- **Split summaries** at top: Last 7 / 15 / 30 day toggleable pills
  - Summary stats for each window
  - Data source: `statType=lastXGames`
- **Game-by-game table** below:
  - Scrollable list, every game this season
  - Columns: Date, Opponent (logo + abbr), key stats
  - Tight row density, alternating row backgrounds
  - Data source: `statType=gameLog`
- **Offseason:** If current season has no games, default to previous season's log. Season selector allows browsing any year.

---

## 2. League Leaders Dashboard

New page — **Leaders** in main nav alongside Standings.

### Layout
- Dashboard showing **top 5 players** across multiple stat categories at a glance
- Two sections: **Hitting** and **Pitching**, toggled with tabs
- 6-8 stat cards per section:
  - Hitting: AVG, HR, RBI, OPS, SB, H
  - Pitching: ERA, K, W, WHIP, SV, IP

### Stat Card Design
- Each card shows: rank number (big, bold), player headshot (small), name, team, stat value (prominent)
- Strong visual hierarchy — rank dominates, stat value secondary, name/team tertiary
- Click any card to expand into a full top 20 leaderboard with percentile bars
- Expansion is smooth inline reveal, not a page jump

### Data & Routing
- MLB Stats API `/stats/leaders` endpoint — one call per stat
- Hash route: `/leaders`, with `?stat=homeRuns` deep linking to expanded category
- **Offseason:** Show previous season's leaders, labeled clearly (e.g., "2025 Season Leaders")

---

## 3. Schedule & Scoreboard

New page — **Scoreboard** in main nav.

### Default View: Today's Games
- Grid of score cards, each showing:
  - Teams (logos + abbreviations)
  - Score
  - Status: Final / In Progress / Scheduled
  - Status badges with distinct visual treatments (different background tones, not just text color)
- Click a game card → inline box score expansion:
  - Line score (innings), key performers (top hitter, winning/losing pitcher)
  - Data source: `/game/{gamePk}/boxscore`

### Team Filter
- Dropdown/search to filter to a specific team
- Shows their last 10 and next 10 games in a timeline/list view
- Data source: MLB Stats API `/schedule` with `teamId` param

### Offseason Handling
- Detect offseason: check if today's `/schedule` returns no games
- Show: "The 2026 season hasn't started yet" with Opening Day countdown
- Default to showing last season's postseason results as fallback
- Spring Training games shown with a "Spring Training" badge once available

---

## 4. Playoff Bracket

Accessible from Scoreboard page or own nav item during postseason.

### Layout
- Visual bracket: Wild Card → Division Series → Championship Series → World Series
- SVG connector lines between matchups
- Each matchup node: team logos, series score (e.g., 3-1)
- Horizontal layout on desktop, vertical stack on mobile
- Click a matchup → expand to show each game's score, date, winning pitcher

### Data & Offseason
- MLB Stats API `/schedule/postseason` endpoint
- Offseason: Show most recently completed postseason bracket by default
- Season selector to browse historical brackets

---

## 5. Visual Upgrades

Applied across all new and existing features.

### Loading Skeletons (High Priority)
- Pulsing skeleton shapes matching card layouts
- Grey bars where stat bars will be, grey circle where headshot goes
- Use existing `bg-bg-tertiary` color with CSS shimmer animation
- Replace all blank/spinner loading states

### Radar Chart (Career Tab + Compare Mode)
- Pure SVG, no charting library
- Thin lines, team-colored fill at low opacity
- In Compare mode: side-by-side radar overlay for visual comparison
- Small and integrated, not a hero element

### Career Sparklines
- Inline SVG line charts, 5-15 data points per stat
- Thin lines, dots at data points
- Draw-in animation via `stroke-dashoffset`
- No external dependencies

### Tab Content Transitions
- Reuse existing `animate-fade-in` (opacity 0→1, translateY 8→0, 200ms)
- Applied when switching between Overview/Career/Game Log tabs

### What We're NOT Doing
- ~~Team color gradient backgrounds~~ — clashes with percentile bar colors, looks tacky across 30 teams
- ~~Page route transitions~~ — awkward with hash routing, stagger animations on content load already sufficient
- ~~Stat bar animations~~ — already shipped (`grow-bar` + stagger delays)
- ~~New dependencies~~ — everything is CSS + inline SVG

---

## 6. Offseason Logic (Global Pattern)

Every view that depends on current-season data follows this pattern:
1. Attempt to load current season data
2. If empty/unavailable, gracefully fall back to most recent completed season
3. Label clearly what season is being displayed
4. Season selector allows browsing any year

Specific handling:
- **Schedule/Scoreboard:** Opening Day countdown + previous postseason results
- **Game Log tab:** Default to previous season, season selector to browse
- **League Leaders:** Previous season leaders with clear "2025 Season" label
- **Playoff Bracket:** Most recent completed bracket by default

---

## Implementation Priority

### Phase 1 — Foundation
1. Player card tab system (Overview/Career/Game Log structure)
2. Loading skeletons across all views
3. Career tab: year-by-year table with percentile coloring

### Phase 2 — Career Depth
4. Career sparklines (SVG, draw-in animation)
5. Radar chart (Career tab)
6. Game log tab (splits + game-by-game)

### Phase 3 — New Pages
7. League Leaders dashboard
8. Schedule/Scoreboard
9. Playoff Bracket

### Phase 4 — Polish
10. Compare mode radar overlay
11. Offseason handling across all views
12. Additional MLB API stats on Overview tab

---

## Technical Notes

- All charts/animations: pure CSS + inline SVG, zero new dependencies
- Data sources: MLB Stats API only (for now). Tab structure allows future Baseball Savant integration.
- Caching: Extend existing cache pattern to new endpoints (leaders, schedule, game logs)
- Routing: New hash routes — `/leaders`, `/scoreboard`, `/bracket`
- Bundle impact: Minimal — no new libraries
