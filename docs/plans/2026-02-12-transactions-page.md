# Transactions Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Transactions page showing MLB-level player moves (trades, signings, DFAs, roster moves) for the selected season with infinite scroll, type filters, and clickable player names.

**Architecture:** New `fetchTransactions()` API function with client-side filtering. Self-contained `Transactions.jsx` component with IntersectionObserver-based infinite scroll. Wired into existing nav/routing in App.jsx.

**Tech Stack:** React 18, Tailwind CSS, MLB Stats API `/transactions` endpoint. No new dependencies.

---

### Task 1: Add `fetchTransactions` API function

**Files:**
- Modify: `src/utils/api.js`

**Step 1: Add the transactions cache and type filter constants**

At the bottom of the cache declarations section (after the existing caches around line 42), add:

```js
// Cache for transactions (key: "season-offset", value: result object)
const transactionsCache = new TtlCache(TTL_SHORT);

// MLB-level transaction type codes to keep (filter out minor league noise)
const MLB_TYPE_CODES = new Set([
  'TR',   // Trade
  'SGN',  // Signed
  'SFA',  // Signed as Free Agent
  'DES',  // Designated for Assignment
  'CLW',  // Claimed Off Waivers
  'REL',  // Released
  'RET',  // Retired
  'OPT',  // Optioned
  'CU',   // Recalled
  'SC',   // Status Change (filtered further — IL only)
]);
```

**Step 2: Add the `fetchTransactions` function**

At the bottom of `api.js` (after `fetchTopPlayerNames`), add:

```js
/**
 * Fetch MLB-level transactions for a season
 * @param {number} season - Season year
 * @param {AbortSignal} signal - Optional abort signal
 * @param {number} offset - Pagination offset (default 0)
 * @param {number} limit - Results per page (default 50)
 * @returns {Promise<{transactions: Array, hasMore: boolean}>}
 */
export const fetchTransactions = async (season, signal, offset = 0, limit = 50) => {
  // We need to over-fetch because we filter client-side
  // Request 5x the limit to ensure we get enough MLB-level transactions after filtering
  const fetchLimit = limit * 5;
  const cacheKey = `${season}-${offset}`;

  if (transactionsCache.has(cacheKey)) {
    return transactionsCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${MLB_API_BASE}/transactions?startDate=01/01/${season}&endDate=12/31/${season}&limit=${fetchLimit}&offset=${offset}`,
      { signal }
    );
    const data = await response.json();
    const raw = data.transactions || [];

    // Filter to MLB-level moves only
    const filtered = raw.filter(t => {
      if (!t.typeCode || !MLB_TYPE_CODES.has(t.typeCode)) return false;
      // For Status Changes, only keep IL-related ones
      if (t.typeCode === 'SC') {
        const desc = (t.description || '').toLowerCase();
        return desc.includes('injured list') || desc.includes('disabled list');
      }
      return true;
    });

    const result = { transactions: filtered, hasMore: raw.length >= fetchLimit };

    if (filtered.length > 0) {
      transactionsCache.set(cacheKey, result);
    }

    return result;
  } catch (error) {
    if (error.name === 'AbortError') return { transactions: [], hasMore: false };
    console.error('Transactions error:', error);
    throw error;
  }
};
```

**Step 3: Add `fetchTransactions` to the import in App.jsx**

In `src/App.jsx` line 14, add `fetchTransactions` to the named imports from `'./utils/api'`.

**Step 4: Deploy checkpoint**

```bash
bash scripts/deploy.sh "v4.8.0 — Add fetchTransactions API function"
```

---

### Task 2: Add route and navigation for Transactions

**Files:**
- Modify: `src/hooks/useHashRouter.js`
- Modify: `src/App.jsx`

**Step 1: Add transactions route pattern**

In `src/hooks/useHashRouter.js`, add to `ROUTE_PATTERNS` array (after `scoreboard`, before `bracket`):

```js
{ pattern: /^\/transactions\/?$/, route: 'transactions', extract: () => ({}) },
```

**Step 2: Add transactions to `getCurrentPath`**

In the `getCurrentPath` switch statement, add:

```js
case 'transactions': return 'transactions';
```

**Step 3: Add "Transactions" to NAV_ITEMS in App.jsx**

In `src/App.jsx`, in the `NAV_ITEMS` array (line 65-71), add between `scoreboard` and `bracket`:

```js
{ key: 'transactions', label: 'Transactions' },
```

**Step 4: Add transactions case to route restoration**

In the `restoreRoute` switch in `useEffect` (around line 224), add before the default:

```js
case 'transactions':
  setView('transactions');
  setPlayer1(null); setPlayer2(null);
  setStats1(null); setStats2(null);
  setIsComparing(false);
  setSelectedTeam(null);
  break;
```

**Step 5: Add transactions case to `handleViewChange`**

In the `handleViewChange` switch (around line 652), add:

```js
case 'transactions':
  router.navigate(buildHash('transactions', season, latestSeason));
  break;
```

**Step 6: Add view flags and render section**

After the `showBracket` const (line 828), add:

```js
const showTransactions = view === 'transactions';
```

In the JSX, after the `{showBracket && ...}` block (around line 1097), add:

```jsx
{/* Transactions View */}
{showTransactions && (
  <Transactions season={season} onPlayerClick={handleLeaderPlayerClick} />
)}
```

**Step 7: Add Transactions import**

At the top of `App.jsx`, add:

```js
import Transactions from './components/Transactions';
```

(This will error until Task 3 creates the component, that's fine — we'll deploy after Task 3.)

---

### Task 3: Build `Transactions.jsx` component

**Files:**
- Create: `src/components/Transactions.jsx`

**Step 1: Create the full component**

```jsx
// Transactions Feed
// v1.0.0 | 2026-02-12

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchTransactions } from '../utils/api';
import { getTeamLogoUrl } from '../utils/teamData';

// Filter categories mapping typeCode → display group
const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'trades', label: 'Trades', codes: ['TR'] },
  { key: 'signings', label: 'Signings', codes: ['SGN', 'SFA'] },
  { key: 'dfa', label: 'DFA / Waivers', codes: ['DES', 'CLW', 'REL'] },
  { key: 'roster', label: 'Roster Moves', codes: ['OPT', 'CU', 'SC', 'RET'] },
];

// Badge config per typeCode
const BADGE_CONFIG = {
  TR:  { label: 'Trade',   color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  SGN: { label: 'Signed',  color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  SFA: { label: 'Signing', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  DES: { label: 'DFA',     color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  CLW: { label: 'Waivers', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  REL: { label: 'Released', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  RET: { label: 'Retired', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  OPT: { label: 'Optioned', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  CU:  { label: 'Recalled', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  SC:  { label: 'IL Move',  color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
};

// Format date as "January 15, 2024"
const formatDate = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// Group transactions by date
const groupByDate = (transactions) => {
  const groups = [];
  let currentDate = null;
  let currentGroup = null;

  for (const t of transactions) {
    const date = t.date || t.effectiveDate;
    if (date !== currentDate) {
      currentDate = date;
      currentGroup = { date, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(t);
  }

  return groups;
};

// Render description with clickable player name
const TransactionDescription = ({ transaction, onPlayerClick }) => {
  const { description, person } = transaction;
  if (!description) return null;

  // If we have a person, make their name clickable in the description
  if (person?.fullName && description.includes(person.fullName)) {
    const idx = description.indexOf(person.fullName);
    const before = description.slice(0, idx);
    const after = description.slice(idx + person.fullName.length);

    return (
      <p className="text-sm text-text-primary leading-relaxed">
        {before}
        <button
          onClick={() => onPlayerClick({ id: person.id, fullName: person.fullName })}
          className="font-semibold text-accent hover:text-accent-hover hover:underline transition-colors"
        >
          {person.fullName}
        </button>
        {after}
      </p>
    );
  }

  return <p className="text-sm text-text-primary leading-relaxed">{description}</p>;
};

// Single transaction row
const TransactionRow = ({ transaction, onPlayerClick }) => {
  const badge = BADGE_CONFIG[transaction.typeCode] || { label: transaction.typeDesc, color: 'bg-bg-tertiary text-text-secondary border-border' };
  const toTeamId = transaction.toTeam?.id;
  const fromTeamId = transaction.fromTeam?.id;

  return (
    <div className="flex items-start gap-3 py-3 px-4 hover:bg-bg-elevated/50 transition-colors rounded-lg">
      {/* Team logo(s) */}
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        {fromTeamId && (
          <>
            <img
              src={getTeamLogoUrl(fromTeamId)}
              alt=""
              className="w-6 h-6 object-contain"
              loading="lazy"
            />
            <svg className="w-3 h-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </>
        )}
        {toTeamId && (
          <img
            src={getTeamLogoUrl(toTeamId)}
            alt=""
            className="w-6 h-6 object-contain"
            loading="lazy"
          />
        )}
        {!toTeamId && !fromTeamId && (
          <div className="w-6 h-6" />
        )}
      </div>

      {/* Badge */}
      <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
        {badge.label}
      </span>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <TransactionDescription transaction={transaction} onPlayerClick={onPlayerClick} />
      </div>
    </div>
  );
};

// Loading skeleton
const TransactionsSkeleton = () => (
  <div className="space-y-6">
    {[1, 2, 3].map(group => (
      <div key={group}>
        <div className="skeleton-shimmer bg-bg-tertiary rounded h-5 w-40 mb-3" />
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          {[1, 2, 3, 4].map(row => (
            <div key={row} className="flex items-center gap-3 py-3 px-4">
              <div className="skeleton-shimmer bg-bg-tertiary rounded-full w-6 h-6 shrink-0" />
              <div className="skeleton-shimmer bg-bg-tertiary rounded-full h-5 w-16 shrink-0" />
              <div className="skeleton-shimmer bg-bg-tertiary rounded h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default function Transactions({ season, onPlayerClick }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  const offsetRef = useRef(0);
  const sentinelRef = useRef(null);

  // Reset and load when season or filter changes
  useEffect(() => {
    const controller = new AbortController();
    setTransactions([]);
    setLoading(true);
    setHasMore(true);
    setError(null);
    offsetRef.current = 0;

    const load = async () => {
      try {
        const result = await fetchTransactions(season, controller.signal, 0);
        const filtered = applyFilter(result.transactions, filter);
        setTransactions(filtered);
        setHasMore(result.hasMore);
        offsetRef.current = result.transactions.length;
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Failed to load transactions');
          console.error('Transactions load error:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [season, filter]);

  // Filter helper
  const applyFilter = useCallback((txns, filterKey) => {
    if (filterKey === 'all') return txns;
    const filterDef = TYPE_FILTERS.find(f => f.key === filterKey);
    if (!filterDef?.codes) return txns;
    return txns.filter(t => filterDef.codes.includes(t.typeCode));
  }, []);

  // Load more (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const result = await fetchTransactions(season, undefined, offsetRef.current);
      const filtered = applyFilter(result.transactions, filter);
      setTransactions(prev => [...prev, ...filtered]);
      setHasMore(result.hasMore);
      offsetRef.current += result.transactions.length;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Load more error:', err);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [season, filter, loadingMore, hasMore, applyFilter]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const dateGroups = groupByDate(transactions);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="font-display text-3xl tracking-wide text-text-primary">TRANSACTIONS</h2>

        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 bg-bg-input border border-border rounded-lg text-text-primary text-sm font-medium focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 cursor-pointer theme-transition"
        >
          {TYPE_FILTERS.map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-accent-soft border border-accent/30 rounded-xl p-4 mb-6 theme-transition">
          <p className="text-accent">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && <TransactionsSkeleton />}

      {/* Transaction feed */}
      {!loading && !error && dateGroups.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-text-muted text-lg">No transactions found for {season}</p>
        </div>
      )}

      {!loading && dateGroups.length > 0 && (
        <div className="space-y-6">
          {dateGroups.map(group => (
            <div key={group.date}>
              {/* Date header */}
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">
                {formatDate(group.date)}
              </h3>

              {/* Transaction cards for this date */}
              <div className="bg-bg-card border border-border rounded-xl overflow-hidden theme-transition divide-y divide-border/50">
                {group.items.map(t => (
                  <TransactionRow key={t.id} transaction={t} onPlayerClick={onPlayerClick} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && !loading && (
        <div ref={sentinelRef} className="py-8 flex justify-center">
          {loadingMore && (
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Deploy checkpoint**

```bash
bash scripts/deploy.sh "v4.8.0 — Transactions page with infinite scroll and type filters"
```

---

### Task 4: Verify and polish

**Step 1: Run dev server and test**

```bash
npm run dev
```

Open `http://localhost:5173/#/transactions` and verify:
- Transactions load for the current season
- Filter dropdown works (All, Trades, Signings, DFA/Waivers, Roster Moves)
- Infinite scroll loads more when scrolling to bottom
- Player names are clickable and navigate to PlayerCard
- Season selector changes transactions
- Dark/light theme works correctly
- Mobile layout looks good (nav item in hamburger menu)
- "Transactions" nav item appears between "Scores" and "Playoffs"
- Back/forward browser navigation works

**Step 2: Fix any issues found during testing**

Address any bugs discovered. Common things to watch for:
- Badge colours in light mode (may need separate light/dark variants)
- Transaction ordering (should be newest first — API returns newest first by default)
- Player names not found in description (edge case — some descriptions use different name formats)

**Step 3: Update version**

Update version in `package.json` and `App.jsx` header comment to v4.8.0.

**Step 4: Final deploy**

```bash
bash scripts/deploy.sh "v4.8.0 — Bump version"
```
