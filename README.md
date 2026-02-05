# MLB Player Visualizer

**v1.0.0 | 2026-02-04**

Interactive MLB player stat card visualizer with percentile rankings.

## Features

- Search any active MLB player
- View percentile rankings against qualified players
- Separate stat categories for pitchers and hitters
- Export cards as PNG images
- Real-time MLB Stats API data

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- html2canvas (for PNG export)
- MLB Stats API

## Data Source

All data comes from the official MLB Stats API. Percentiles are calculated against qualified players (50+ IP for pitchers, 200+ PA for hitters).
