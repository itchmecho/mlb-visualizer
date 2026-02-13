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
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const observerRef = useRef(null);

  // Filter helper
  const applyFilter = useCallback((txns, filterKey) => {
    if (filterKey === 'all') return txns;
    const filterDef = TYPE_FILTERS.find(f => f.key === filterKey);
    if (!filterDef?.codes) return txns;
    return txns.filter(t => filterDef.codes.includes(t.typeCode));
  }, []);

  // Reset and load when season or filter changes
  useEffect(() => {
    const controller = new AbortController();
    setTransactions([]);
    setLoading(true);
    setHasMore(true);
    hasMoreRef.current = true;
    setError(null);
    offsetRef.current = 0;

    const load = async () => {
      try {
        const result = await fetchTransactions(season, controller.signal, 0);
        const filtered = applyFilter(result.transactions, filter);
        setTransactions(filtered);
        setHasMore(result.hasMore);
        hasMoreRef.current = result.hasMore;
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
  }, [season, filter, applyFilter]);

  // Load more — uses refs to avoid recreating the callback
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const result = await fetchTransactions(season, undefined, offsetRef.current);
      const filtered = applyFilter(result.transactions, filter);
      setTransactions(prev => [...prev, ...filtered]);
      setHasMore(result.hasMore);
      hasMoreRef.current = result.hasMore;
      offsetRef.current += result.transactions.length;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Load more error:', err);
      }
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [season, filter, applyFilter]);

  // Sentinel ref callback — attaches IntersectionObserver when sentinel mounts
  const sentinelRef = useCallback((node) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '400px' }
    );
    observerRef.current.observe(node);
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
