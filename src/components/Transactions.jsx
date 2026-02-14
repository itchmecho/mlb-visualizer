// Transactions Feed
// v2.3.0 | 2026-02-14

import React, { useState, useEffect, useMemo } from 'react';
import { fetchTransactions } from '../utils/api';
import { getTeamLogoUrl } from '../utils/teamData';
import DatePicker from './DatePicker';

// Type filter categories
const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'trades', label: 'Trades', codes: ['TR'] },
  { key: 'signings', label: 'Signings', codes: ['SGN', 'SFA'] },
  { key: 'dfa', label: 'DFA / Waivers', codes: ['DES', 'CLW', 'REL'] },
  { key: 'roster', label: 'Roster Moves', codes: ['OPT', 'CU', 'SC', 'RET'] },
];

// Date mode options
const DATE_MODES = [
  { key: 'month', label: 'Month' },
  { key: 'day', label: 'Day' },
  { key: 'range', label: 'Date Range' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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
const formatDateDisplay = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// Convert YYYY-MM-DD to MM/DD/YYYY for the API
const toApiDate = (isoDate) => {
  const [y, m, d] = isoDate.split('-');
  return `${m}/${d}/${y}`;
};

// Get last day of a month
const lastDayOfMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Get the API date range based on current mode and selections
const getDateRange = (mode, season, month, monthYear, day, rangeStart, rangeEnd) => {
  switch (mode) {
    case 'day':
      return { start: toApiDate(day), end: toApiDate(day) };
    case 'month': {
      const m = String(month + 1).padStart(2, '0');
      const lastDay = lastDayOfMonth(monthYear, month);
      return {
        start: `${m}/01/${monthYear}`,
        end: `${m}/${String(lastDay).padStart(2, '0')}/${monthYear}`,
      };
    }
    case 'range':
      return { start: toApiDate(rangeStart), end: toApiDate(rangeEnd) };
    default:
      return { start: `01/01/${season}`, end: `12/31/${season}` };
  }
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

// Render description with clickable player name(s)
const TransactionDescription = ({ transaction, onPlayerClick }) => {
  const { description, person, players } = transaction;
  if (!description) return null;

  // Use merged players array for trades, fall back to single person
  const clickable = players?.length > 0
    ? players.filter(p => p.fullName && description.includes(p.fullName))
    : person?.fullName && description.includes(person.fullName)
      ? [person]
      : [];

  if (clickable.length === 0) {
    return <p className="text-sm text-text-primary leading-relaxed">{description}</p>;
  }

  // Sort by position in description for correct splitting
  const sorted = [...clickable].sort(
    (a, b) => description.indexOf(a.fullName) - description.indexOf(b.fullName)
  );

  const segments = [];
  let remaining = description;
  for (const player of sorted) {
    const idx = remaining.indexOf(player.fullName);
    if (idx === -1) continue;
    if (idx > 0) segments.push({ text: remaining.slice(0, idx) });
    segments.push({ player });
    remaining = remaining.slice(idx + player.fullName.length);
  }
  if (remaining) segments.push({ text: remaining });

  return (
    <p className="text-sm text-text-primary leading-relaxed">
      {segments.map((seg, i) =>
        seg.player ? (
          <button
            key={i}
            onClick={() => onPlayerClick({ id: seg.player.id, fullName: seg.player.fullName })}
            className="font-semibold text-accent hover:text-accent-hover hover:underline transition-colors"
          >
            {seg.player.fullName}
          </button>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  );
};

// Single transaction row
const TransactionRow = ({ transaction, onPlayerClick }) => {
  const badge = BADGE_CONFIG[transaction.typeCode] || { label: transaction.typeDesc, color: 'bg-bg-tertiary text-text-secondary border-border' };
  const isTrade = transaction.typeCode === 'TR' && transaction.players?.length > 0;

  let teamLogos;
  if (isTrade) {
    // Extract both team IDs from merged players
    const seen = new Set();
    const teamIds = [];
    for (const p of transaction.players) {
      for (const team of [p.fromTeam, p.toTeam]) {
        if (team?.id && !seen.has(team.id)) {
          seen.add(team.id);
          teamIds.push(team.id);
        }
      }
    }
    teamLogos = (
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        {teamIds[0] && <img src={getTeamLogoUrl(teamIds[0])} alt="" className="w-6 h-6 object-contain" loading="lazy" />}
        <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16l-4-4m4 4l-4 4M20 16H4l4-4m-4 4l4 4" />
        </svg>
        {teamIds[1] && <img src={getTeamLogoUrl(teamIds[1])} alt="" className="w-6 h-6 object-contain" loading="lazy" />}
        {teamIds.length > 2 && teamIds.slice(2).map(id => (
          <img key={id} src={getTeamLogoUrl(id)} alt="" className="w-6 h-6 object-contain" loading="lazy" />
        ))}
      </div>
    );
  } else {
    const toTeamId = transaction.toTeam?.id;
    const fromTeamId = transaction.fromTeam?.id;
    teamLogos = (
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        {fromTeamId && (
          <>
            <img src={getTeamLogoUrl(fromTeamId)} alt="" className="w-6 h-6 object-contain" loading="lazy" />
            <svg className="w-3 h-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </>
        )}
        {toTeamId && (
          <img src={getTeamLogoUrl(toTeamId)} alt="" className="w-6 h-6 object-contain" loading="lazy" />
        )}
        {!toTeamId && !fromTeamId && <div className="w-6 h-6" />}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-3 px-4 hover:bg-bg-elevated/50 transition-colors rounded-lg">
      {teamLogos}
      <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
        {badge.label}
      </span>
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

// Shared input classes
const inputClass = 'px-3 py-2 bg-bg-input border border-border rounded-lg text-text-primary text-sm font-medium focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 cursor-pointer theme-transition';

// Detect if this is the "current" season (offseason = before April, latest season is prev year)
const isOffseason = (season) => {
  const now = new Date();
  return now.getMonth() < 3 && season === now.getFullYear() - 1;
};

const isCurrentSeason = (season) => {
  const now = new Date();
  return now.getFullYear() === season || isOffseason(season);
};

// For current season during offseason, the max date extends into the next year (today)
// For past seasons, max date is Dec 31 of that season year
const getMaxDate = (season) => {
  if (isOffseason(season)) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return `${season}-12-31`;
};

// Get the "current" month index and year for default selections
const getDefaultMonth = (season) => {
  const now = new Date();
  if (isCurrentSeason(season)) return { month: now.getMonth(), year: now.getFullYear() };
  return { month: 11, year: season }; // December for past seasons
};

const getDefaultDay = (season) => {
  const now = new Date();
  if (isCurrentSeason(season)) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return `${season}-12-31`;
};

// Get default range start (7 days before the range end)
const getDefaultRangeStart = (season) => {
  const endStr = getMaxDate(season);
  const end = new Date(endStr + 'T00:00:00');
  const sevenAgo = new Date(end);
  sevenAgo.setDate(sevenAgo.getDate() - 8);
  const seasonStart = new Date(`${season}-01-01T00:00:00`);
  const d = sevenAgo < seasonStart ? seasonStart : sevenAgo;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Transactions({ season, onPlayerClick }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortAsc, setSortAsc] = useState(false);
  const [error, setError] = useState(null);

  // Date selection state
  const [dateMode, setDateMode] = useState('range');
  const [selectedMonth, setSelectedMonth] = useState(() => getDefaultMonth(season).month);
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => getDefaultMonth(season).year);
  const [selectedDay, setSelectedDay] = useState(() => getDefaultDay(season));
  const [rangeStart, setRangeStart] = useState(() => getDefaultRangeStart(season));
  const [rangeEnd, setRangeEnd] = useState(() => getMaxDate(season));

  // Reset date selections when season changes
  useEffect(() => {
    const def = getDefaultMonth(season);
    setSelectedMonth(def.month);
    setSelectedMonthYear(def.year);
    setSelectedDay(getDefaultDay(season));
    setRangeStart(getDefaultRangeStart(season));
    setRangeEnd(getMaxDate(season));
  }, [season]);

  // Fetch transactions when date selection changes
  useEffect(() => {
    const controller = new AbortController();
    setTransactions([]);
    setLoading(true);
    setError(null);

    const { start, end } = getDateRange(dateMode, season, selectedMonth, selectedMonthYear, selectedDay, rangeStart, rangeEnd);

    const load = async () => {
      try {
        const result = await fetchTransactions(start, end, controller.signal);
        setTransactions(result);
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
  }, [season, dateMode, selectedMonth, selectedMonthYear, selectedDay, rangeStart, rangeEnd]);

  // Apply type filter
  const filtered = useMemo(() => {
    if (typeFilter === 'all') return transactions;
    const filterDef = TYPE_FILTERS.find(f => f.key === typeFilter);
    if (!filterDef?.codes) return transactions;
    return transactions.filter(t => filterDef.codes.includes(t.typeCode));
  }, [transactions, typeFilter]);

  const dateGroups = useMemo(() => {
    const groups = groupByDate(filtered);
    if (sortAsc) return [...groups].reverse().map(g => ({ ...g, items: [...g.items].reverse() }));
    return groups;
  }, [filtered, sortAsc]);

  const maxDate = getMaxDate(season);

  // Build month options — Jan-Dec of season year, plus Jan-Mar of next year during offseason
  const monthOptions = useMemo(() => {
    const opts = MONTHS.map((name, i) => ({
      value: `${season}-${i}`,
      label: `${name} ${season}`,
    }));
    if (isOffseason(season)) {
      const now = new Date();
      const nextYear = season + 1;
      for (let i = 0; i <= now.getMonth(); i++) {
        opts.push({
          value: `${nextYear}-${i}`,
          label: `${MONTHS[i]} ${nextYear}`,
        });
      }
    }
    return opts;
  }, [season]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-3xl tracking-wide text-text-primary">TRANSACTIONS</h2>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={inputClass}
        >
          {TYPE_FILTERS.map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Date controls */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        {/* Date mode toggle */}
        <div className="flex bg-bg-tertiary rounded-lg p-1 border border-border theme-transition">
          {DATE_MODES.map(mode => (
            <button
              key={mode.key}
              onClick={() => setDateMode(mode.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                dateMode === mode.key
                  ? 'bg-accent text-text-inverse shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Date inputs based on mode */}
        {dateMode === 'month' && (
          <select
            value={`${selectedMonthYear}-${selectedMonth}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              setSelectedMonth(m);
              setSelectedMonthYear(y);
            }}
            className={inputClass}
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {dateMode === 'day' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const d = new Date(selectedDay + 'T00:00:00');
                d.setDate(d.getDate() - 1);
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (iso >= `${season}-01-01`) setSelectedDay(iso);
              }}
              disabled={selectedDay <= `${season}-01-01`}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <DatePicker
              value={selectedDay}
              onChange={setSelectedDay}
              min={`${season}-01-01`}
              max={maxDate}
            />
            <button
              onClick={() => {
                const d = new Date(selectedDay + 'T00:00:00');
                d.setDate(d.getDate() + 1);
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (iso <= maxDate) setSelectedDay(iso);
              }}
              disabled={selectedDay >= maxDate}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedDay(getDefaultDay(season))}
              disabled={selectedDay === getDefaultDay(season)}
              className="ml-1 px-2.5 py-1 rounded-md text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Today
            </button>
          </div>
        )}

        {dateMode === 'range' && (
          <DatePicker
            isRange
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onRangeChange={({ start, end }) => {
              setRangeStart(start);
              setRangeEnd(end);
            }}
            min={`${season}-01-01`}
            max={maxDate}
          />
        )}

        {/* Sort toggle + result count */}
        {!loading && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
              title={sortAsc ? 'Oldest first' : 'Newest first'}
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${sortAsc ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="text-xs font-medium">{sortAsc ? 'Oldest' : 'Newest'}</span>
            </button>
            <span className="text-text-muted text-sm">
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-accent-soft border border-accent/30 rounded-xl p-4 mb-6 theme-transition">
          <p className="text-accent">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && <TransactionsSkeleton />}

      {/* Empty state */}
      {!loading && !error && dateGroups.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-text-muted text-lg">No transactions found</p>
        </div>
      )}

      {/* Transaction feed */}
      {!loading && dateGroups.length > 0 && (
        <div className="space-y-6">
          {dateGroups.map(group => (
            <div key={group.date}>
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">
                {formatDateDisplay(group.date)}
              </h3>

              <div className="bg-bg-card border border-border rounded-xl overflow-hidden theme-transition divide-y divide-border/50">
                {group.items.map(t => (
                  <TransactionRow key={t.id} transaction={t} onPlayerClick={onPlayerClick} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
