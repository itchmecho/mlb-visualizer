# Transactions Page Design

**Date:** 2026-02-12
**Version:** v4.8.0

## Overview

Add a "Transactions" page showing all MLB-level trades, signings, DFAs, roster moves, etc. for the selected season. Chronological feed with infinite scroll, type filters, and clickable player names.

## Navigation

- New "Transactions" nav item between "Scores" and "Playoffs"
- Route: `#/transactions`
- Respects global season selector

## API

### `fetchTransactions(season, signal, offset, limit)`

- Endpoint: `GET /api/v1/transactions?startDate=01/01/{season}&endDate=12/31/{season}&limit={limit}&offset={offset}`
- Default: offset=0, limit=50
- Client-side filter to MLB-level moves only. Keep these typeCodes:
  - `TR` (Trade)
  - `SGN` (Signed)
  - `SFA` (Signed as Free Agent)
  - `DES` (Designated for Assignment)
  - `CLW` (Claimed Off Waivers)
  - `REL` (Released)
  - `RET` (Retired)
  - `OPT` (Optioned)
  - `CU` (Recalled)
  - `SC` (Status Change) — only if description contains "injured list" or "disabled list"
- Returns `{ transactions: [...], hasMore: boolean }`
- Map cache with composite key (same pattern as other API functions)

## Component: `Transactions.jsx`

### Header

- Page title "Transactions"
- Filter dropdown: "All", "Trades", "Signings", "DFA / Waivers", "Roster Moves"
  - Trades: `TR`
  - Signings: `SGN`, `SFA`
  - DFA / Waivers: `DES`, `CLW`, `REL`
  - Roster Moves: `OPT`, `CU`, `SC` (IL only), `RET`

### Transaction List

- Grouped by date (date header: "January 15, 2024" format)
- Each transaction card:
  - Type badge — coloured pill (red=Trade, green=Signing, orange=DFA/Waivers, blue=Roster Move)
  - Team logo(s) — toTeam, plus fromTeam if present
  - Description text with player name as clickable link
- Player click: `fetchPlayerById` first, then navigate to PlayerCard (same as Leaders/Roster)

### Infinite Scroll

- IntersectionObserver on sentinel div at bottom
- Fetch next 50 on trigger
- "Loading more..." spinner
- Stop when API returns fewer than limit

### Loading State

- Skeleton component with shimmer cards under shimmer date headers

### Empty State

- "No transactions found for {season}"

## Styling

- CSS custom properties for dark/light theme compatibility
- Type badge colours work in both themes
- Responsive: `px-4 md:px-6` padding, cards full-width on mobile
- Date headers use `text-muted` styling

## Type Badge Colours

| Category | Colour | TypeCodes |
|----------|--------|-----------|
| Trade | Red | TR |
| Signing | Green | SGN, SFA |
| DFA / Waivers | Orange | DES, CLW, REL |
| Roster Move | Blue | OPT, CU, SC, RET |
