# MLB Player Visualizer

**v2.0.1** | Live at [itchmecho.github.io/mlb-visualizer](https://itchmecho.github.io/mlb-visualizer/)

Interactive MLB player stat card visualizer with percentile rankings and head-to-head comparisons.

## Features

- **Search any MLB player** - Active players from 2001-present
- **Percentile rankings** - See how players rank vs qualified players
- **Compare mode** - Head-to-head stat comparisons
- **Dark/Light mode** - Toggle in header, persists to localStorage
- **Export as PNG** - Download stat cards as images

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- html2canvas (lazy-loaded for exports)
- MLB Stats API

## Quick Start

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This project auto-deploys to GitHub Pages via GitHub Actions.

### How it works

1. Push to `main` branch
2. GitHub Actions runs `.github/workflows/deploy.yml`
3. Builds the Vite project
4. Deploys `dist/` to GitHub Pages

### Manual deployment

```bash
# Build and deploy manually (if needed)
npm run build
# Then upload dist/ folder to your hosting provider
```

### Setting up GitHub Pages (for forks)

1. Fork this repo
2. Go to **Settings > Pages**
3. Under "Build and deployment", select **GitHub Actions**
4. Push any change to `main` - the workflow will run automatically

### Important: Base path

The `vite.config.js` has `base: '/mlb-visualizer/'` set for GitHub Pages. If deploying elsewhere or with a different repo name, update this value.

## Project Structure

```
src/
├── components/
│   ├── PlayerCard.jsx      # Main stat card
│   ├── PlayerSearch.jsx    # Search with autocomplete
│   ├── CompareView.jsx     # Head-to-head comparison
│   ├── CompareStatBar.jsx  # Comparison stat bars
│   ├── StatBar.jsx         # Individual stat bar
│   └── StatCategory.jsx    # Stat grouping
├── utils/
│   ├── api.js              # MLB API calls + caching
│   ├── percentile.js       # Percentile calculations
│   └── teamData.js         # Team colors, logos, IDs
├── App.jsx                 # Main app component
├── main.jsx                # Entry point
└── index.css               # Tailwind + theme variables
```

## Data Source

All data from the official [MLB Stats API](https://statsapi.mlb.com). Percentiles calculated against qualified players (50+ IP for pitchers, 200+ PA for hitters).

## License

MIT
