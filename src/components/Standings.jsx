// Team Standings Component
// v4.3.0 | 2026-02-09

import React, { useState, useEffect } from 'react';
import { getTeamLogoUrl, TEAM_DATA } from '../utils/teamData';
import { StandingsSkeleton } from './Skeleton';
import { fetchAwards, fetchLeaders } from '../utils/api';

// World Series winners by year (team ID)
const WORLD_SERIES_WINNERS = {
  2001: 109, // Arizona Diamondbacks
  2002: 108, // Anaheim Angels (now LA Angels)
  2003: 146, // Florida Marlins (now Miami)
  2004: 111, // Boston Red Sox
  2005: 145, // Chicago White Sox
  2006: 138, // St. Louis Cardinals
  2007: 111, // Boston Red Sox
  2008: 143, // Philadelphia Phillies
  2009: 147, // New York Yankees
  2010: 137, // San Francisco Giants
  2011: 138, // St. Louis Cardinals
  2012: 137, // San Francisco Giants
  2013: 111, // Boston Red Sox
  2014: 137, // San Francisco Giants
  2015: 118, // Kansas City Royals
  2016: 112, // Chicago Cubs
  2017: 117, // Houston Astros
  2018: 111, // Boston Red Sox
  2019: 120, // Washington Nationals
  2020: 119, // Los Angeles Dodgers
  2021: 144, // Atlanta Braves
  2022: 117, // Houston Astros
  2023: 140, // Texas Rangers
  2024: 119, // Los Angeles Dodgers
  2025: 141, // Toronto Blue Jays
};

// Reverse-lookup: find team name from team ID
const getTeamNameById = (teamId) => {
  for (const [name, data] of Object.entries(TEAM_DATA)) {
    if (data.id === teamId) return name;
  }
  return null;
};

// Division display order and names (IDs from MLB Stats API)
const DIVISIONS = [
  { id: 201, name: 'AL East', league: 'American League' },
  { id: 202, name: 'AL Central', league: 'American League' },
  { id: 200, name: 'AL West', league: 'American League' },
  { id: 204, name: 'NL East', league: 'National League' },
  { id: 205, name: 'NL Central', league: 'National League' },
  { id: 203, name: 'NL West', league: 'National League' },
];

// Get team primary color by name
const getTeamColor = (teamName) => {
  const team = TEAM_DATA[teamName];
  return team?.primary || '#666';
};

// Relative luminance from hex color (0 = black, 1 = white)
const getLuminance = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

// Get hex alpha suffix for leader row tint — dark primaries get higher opacity so they're visible
const getTintAlpha = (teamName) => {
  const team = TEAM_DATA[teamName];
  if (!team) return '12';
  const lum = getLuminance(team.primary);
  if (lum >= 0.08) return '12'; // ~7% — bright colors (reds, oranges)
  if (lum >= 0.03) return '22'; // ~13% — medium darks (blues)
  return '35';                   // ~21% — very dark (navies, blacks)
};


// Column definitions for sortable headers
const COLUMNS = [
  { key: 'team', label: 'Team', align: 'left', condensed: true },
  { key: 'wins', label: 'W', align: 'center', condensed: true },
  { key: 'losses', label: 'L', align: 'center', condensed: true },
  { key: 'pct', label: 'PCT', align: 'center', condensed: false },
  { key: 'gb', label: 'GB', align: 'center', condensed: true },
  { key: 'diff', label: 'DIFF', align: 'center', condensed: false },
  { key: 'l10', label: 'L10', align: 'center', condensed: false },
  { key: 'strk', label: 'STRK', align: 'center', condensed: false },
];

// Extract sort value from a team record
const getSortValue = (team, key) => {
  switch (key) {
    case 'team': return team.team?.name || '';
    case 'wins': return team.wins || 0;
    case 'losses': return team.losses || 0;
    case 'pct': return parseFloat(team.winningPercentage) || 0;
    case 'gb': {
      const gb = team.gamesBack;
      return gb === '-' ? 0 : parseFloat(gb) || 0;
    }
    case 'diff': return team.runDifferential || 0;
    case 'l10': {
      const l10 = team.records?.splitRecords?.find(r => r.type === 'lastTen');
      return l10 ? l10.wins : 0;
    }
    case 'strk': {
      const code = team.streak?.streakCode || '';
      if (code.startsWith('W')) return parseInt(code.slice(1)) || 0;
      if (code.startsWith('L')) return -(parseInt(code.slice(1)) || 0);
      return 0;
    }
    default: return 0;
  }
};

const TeamRow = ({ team, rank, isLeader, season, onSelectTeam, condensed, maxAbsRunDiff }) => {
  const teamName = team.team?.name || 'Unknown';
  const teamId = team.team?.id;
  const wins = team.wins || 0;
  const losses = team.losses || 0;
  const pct = team.winningPercentage || '.000';
  const gb = team.gamesBack === '-' ? '-' : team.gamesBack;
  const streak = team.streak?.streakCode || '-';
  const last10 = team.records?.splitRecords?.find(r => r.type === 'lastTen');
  const last10Record = last10 ? `${last10.wins}-${last10.losses}` : '-';
  const runDiff = team.runDifferential || 0;
  const teamColor = getTeamColor(teamName);
  const isWorldSeriesWinner = WORLD_SERIES_WINNERS[season] === teamId;

  // Extract split records for tooltip
  const homeRecord = team.records?.splitRecords?.find(r => r.type === 'home');
  const awayRecord = team.records?.splitRecords?.find(r => r.type === 'away');
  const oneRunRecord = team.records?.splitRecords?.find(r => r.type === 'oneRun');

  // Run diff bar width percentage
  const barWidth = maxAbsRunDiff > 0 ? (Math.abs(runDiff) / maxAbsRunDiff) * 100 : 0;

  return (
    <tr
      className={`
        group/row border-b border-border/30 transition-all duration-200
        hover:bg-bg-elevated/80
      `}
      style={{
        animationDelay: `${rank * 50}ms`,
        backgroundColor: isLeader ? teamColor + getTintAlpha(teamName) : undefined,
      }}
    >
      <td className="py-2.5 px-2 md:px-3">
        <div className="flex items-center gap-1.5 md:gap-2">
          <span
            className={`
              font-display text-lg w-5 text-center shrink-0
              ${isLeader ? 'text-accent' : 'text-text-muted'}
            `}
          >
            {rank}
          </span>
          <div
            className="w-1 h-8 rounded-full shrink-0 hidden md:block"
            style={{ backgroundColor: teamColor }}
          />
          {teamId && (
            <img
              src={getTeamLogoUrl(teamId)}
              alt={teamName}
              className="w-6 h-6 md:w-7 md:h-7 object-contain shrink-0 transition-transform duration-300 group-hover/row:scale-110 team-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <div className="flex flex-col relative group/name min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectTeam?.(team)}
                className={`font-medium hover:underline transition-colors text-left cursor-pointer truncate ${isLeader ? 'text-accent hover:text-accent' : 'text-text-primary hover:text-accent'}`}
              >
                <span className="hidden md:inline">{teamName}</span>
                <span className="md:hidden">{TEAM_DATA[teamName]?.abbr || teamName}</span>
              </button>
              {isWorldSeriesWinner && (
                <span className="hidden md:inline-block px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs font-bold rounded tracking-wide">
                  WS CHAMP
                </span>
              )}
            </div>
            {/* Home/Away/1-Run tooltip */}
            {!condensed && (homeRecord || awayRecord || oneRunRecord) && (
              <div className="absolute top-full left-0 mt-1 opacity-0 group-hover/name:opacity-100 transition-opacity duration-200 bg-bg-elevated border border-border rounded-lg shadow-lg z-50 pointer-events-none px-3 py-2 whitespace-nowrap hidden md:block">
                <div className="flex gap-4 text-xs">
                  {homeRecord && (
                    <div>
                      <span className="text-text-muted">Home </span>
                      <span className="text-text-primary font-medium">{homeRecord.wins}-{homeRecord.losses}</span>
                    </div>
                  )}
                  {awayRecord && (
                    <div>
                      <span className="text-text-muted">Away </span>
                      <span className="text-text-primary font-medium">{awayRecord.wins}-{awayRecord.losses}</span>
                    </div>
                  )}
                  {oneRunRecord && (
                    <div>
                      <span className="text-text-muted">1-Run </span>
                      <span className="text-text-primary font-medium">{oneRunRecord.wins}-{oneRunRecord.losses}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="py-2.5 px-1.5 md:px-2 text-center">
        <span className="font-display text-lg text-text-primary">{wins}</span>
      </td>
      <td className="py-2.5 px-1.5 md:px-2 text-center">
        <span className="font-display text-lg text-text-secondary">{losses}</span>
      </td>
      <td className={`py-2.5 px-2 text-center ${condensed ? 'hidden' : 'hidden md:table-cell'}`}>
        <span className="text-sm font-medium text-text-secondary">{pct}</span>
      </td>
      <td className="py-2.5 px-1.5 md:px-2 text-center">
        <span className={`text-sm ${gb === '-' ? 'text-accent font-bold' : 'text-text-muted'}`}>
          {gb}
        </span>
      </td>
      <td className={`py-2.5 px-1.5 text-center ${condensed ? 'hidden' : 'hidden md:table-cell'}`}>
        <div className="relative h-5 flex items-center justify-center" style={{ minWidth: '3rem' }}>
          {/* Centered bar */}
          <div className="absolute inset-0 flex items-center">
            <div className="relative w-full h-3.5">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
              {/* Bar */}
              {runDiff !== 0 && (
                <div
                  className="absolute top-0 bottom-0 rounded-sm transition-all duration-500"
                  style={{
                    backgroundColor: runDiff > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                    width: `${barWidth / 2}%`,
                    ...(runDiff > 0
                      ? { left: '50%' }
                      : { right: '50%' }
                    ),
                  }}
                />
              )}
            </div>
          </div>
          {/* Number overlay */}
          <span
            className={`relative z-10 text-xs font-bold ${
              runDiff > 0 ? 'text-green-400' : runDiff < 0 ? 'text-red-400' : 'text-text-muted'
            }`}
          >
            {runDiff > 0 ? '+' : ''}{runDiff}
          </span>
        </div>
      </td>
      <td className={`py-2.5 px-2 text-center ${condensed ? 'hidden' : 'hidden md:table-cell'}`}>
        <span className="text-sm text-text-secondary">{last10Record}</span>
      </td>
      <td className={`py-2.5 px-1.5 text-center ${condensed ? 'hidden' : 'hidden md:table-cell'}`}>
        <span
          className={`
            inline-block min-w-[2rem] px-1.5 py-0.5 rounded text-sm font-bold
            ${streak.startsWith('W')
              ? 'bg-green-500/20 text-green-400'
              : streak.startsWith('L')
                ? 'bg-red-500/20 text-red-400'
                : 'text-text-muted'
            }
          `}
        >
          {streak}
        </span>
      </td>
    </tr>
  );
};

const SortableHeader = ({ column, sortConfig, onSort, condensed }) => {
  const isActive = sortConfig?.key === column.key;
  const arrow = isActive
    ? sortConfig.direction === 'desc' ? ' \u25BC' : ' \u25B2'
    : '';

  // Non-condensed columns: hidden when condensed toggle is on, AND always hidden on mobile
  const hiddenClass = !column.condensed
    ? (condensed ? 'hidden' : 'hidden md:table-cell')
    : '';

  return (
    <th
      className={`py-2.5 ${column.key === 'team' ? 'px-2 md:px-3' : 'px-1.5 md:px-2'} ${column.align === 'left' ? 'text-left' : 'text-center'} font-semibold cursor-pointer hover:text-accent transition-colors select-none ${hiddenClass}`}
      onClick={() => onSort(column.key)}
    >
      {column.label}{arrow}
    </th>
  );
};

const DivisionTable = ({ division, teams, animationDelay, season, onSelectTeam, condensed, sortConfig, onSort }) => {
  if (!teams || teams.length === 0) return null;

  // Sort by division rank
  const sortedTeams = [...teams].sort((a, b) =>
    parseInt(a.divisionRank || 99) - parseInt(b.divisionRank || 99)
  );

  // Compute max absolute run differential for this division
  const maxAbsRunDiff = Math.max(...sortedTeams.map(t => Math.abs(t.runDifferential || 0)), 1);

  return (
    <div
      className="bg-bg-card rounded-xl border border-border overflow-hidden theme-transition animate-fade-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Division Header */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-bg-elevated/80 to-transparent">
        <h3 className="font-display text-2xl tracking-wide text-text-primary">
          {division.name}
        </h3>
      </div>

      {/* Table */}
      <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs uppercase tracking-wider border-b border-border bg-bg-tertiary/50">
              {COLUMNS.map(col => (
                <SortableHeader key={col.key} column={col} sortConfig={sortConfig} onSort={onSort} condensed={condensed} />
              ))}
            </tr>
          </thead>
          <tbody className="stagger-children">
            {sortedTeams.map((team, index) => (
              <TeamRow
                key={team.team?.id || index}
                team={team}
                rank={index + 1}
                isLeader={index === 0}
                season={season}
                onSelectTeam={onSelectTeam}
                condensed={condensed}
                maxAbsRunDiff={maxAbsRunDiff}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Sorted full-league table (when a column header is clicked)
const SortedTable = ({ teams, sortConfig, onSort, season, onSelectTeam, condensed }) => {
  const sorted = [...teams].sort((a, b) => {
    const aVal = getSortValue(a, sortConfig.key);
    const bVal = getSortValue(b, sortConfig.key);
    const dir = sortConfig.direction === 'desc' ? -1 : 1;
    if (sortConfig.key === 'team') {
      return dir * aVal.localeCompare(bVal);
    }
    return dir * (aVal - bVal);
  });

  const maxAbsRunDiff = Math.max(...sorted.map(t => Math.abs(t.runDifferential || 0)), 1);

  return (
    <div className="bg-bg-card rounded-xl border border-border overflow-hidden theme-transition animate-fade-in">
      <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs uppercase tracking-wider border-b border-border bg-bg-tertiary/50">
              {COLUMNS.map(col => (
                <SortableHeader key={col.key} column={col} sortConfig={sortConfig} onSort={onSort} condensed={condensed} />
              ))}
            </tr>
          </thead>
          <tbody className="stagger-children">
            {sorted.map((team, index) => (
              <TeamRow
                key={team.team?.id || index}
                team={team}
                rank={index + 1}
                isLeader={false}
                season={season}
                onSelectTeam={onSelectTeam}
                condensed={condensed}
                maxAbsRunDiff={maxAbsRunDiff}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Player headshot URL
const getHeadshotUrl = (playerId) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`;

// Skeleton shimmer for snapshot loading state
const SnapshotSkeleton = () => (
  <div className="mb-8 bg-bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
    <div className="px-5 py-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-bg-tertiary skeleton-shimmer" />
      <div className="space-y-2 flex-1">
        <div className="h-5 w-48 rounded bg-bg-tertiary skeleton-shimmer" />
        <div className="h-4 w-32 rounded bg-bg-tertiary skeleton-shimmer" />
      </div>
    </div>
    <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-bg-tertiary/50 rounded-lg p-3 space-y-2">
          <div className="h-3 w-12 rounded bg-bg-tertiary skeleton-shimmer" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-bg-tertiary skeleton-shimmer" />
            <div className="h-4 w-20 rounded bg-bg-tertiary skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Award chip — compact card with headshot, label, name, team logo
const AwardChip = ({ label, data, onPlayerClick }) => (
  <div className="bg-bg-tertiary/40 rounded-lg p-3 flex items-center gap-2.5 group/award transition-colors hover:bg-bg-tertiary/70">
    <img
      src={getHeadshotUrl(data.id)}
      alt={data.name}
      className="w-9 h-9 rounded-full object-cover bg-bg-tertiary shrink-0 ring-1 ring-border"
      onError={(e) => { e.target.style.display = 'none'; }}
    />
    <div className="min-w-0 flex-1">
      <p className="text-[10px] uppercase tracking-widest text-text-muted leading-none mb-1 font-semibold">{label}</p>
      <button
        onClick={() => onPlayerClick?.({ id: data.id })}
        className="text-sm font-medium text-text-primary hover:text-accent transition-colors cursor-pointer truncate block max-w-full leading-tight"
      >
        {data.name}
      </button>
    </div>
    {data.teamId && (
      <img
        src={getTeamLogoUrl(data.teamId)}
        alt=""
        className="w-5 h-5 object-contain shrink-0 opacity-60 team-logo"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    )}
  </div>
);

// Leader chip — stat badge + value as tight unit, then player name
const LeaderChip = ({ label, data, onPlayerClick }) => (
  <div className="flex items-center min-w-0 py-1.5 gap-2.5">
    <div className="flex items-baseline gap-1.5 shrink-0">
      <span className="text-xs font-display font-bold text-accent tracking-wider">{label}</span>
      <span className="text-lg font-display font-bold text-text-primary tabular-nums">{data.value}</span>
    </div>
    <button
      onClick={() => onPlayerClick?.({ id: data.person?.id })}
      className="text-sm text-text-secondary hover:text-accent transition-colors cursor-pointer truncate"
    >
      {data.person?.fullName || 'Unknown'}
    </button>
  </div>
);

// Season Snapshot — WS champion, awards, stat leaders
const SeasonSnapshot = ({ season, seasonData, snapshotLoading, onPlayerClick, onSelectTeam }) => {
  const winnerId = WORLD_SERIES_WINNERS[season];
  const winnerName = winnerId ? getTeamNameById(winnerId) : null;
  const winnerColor = winnerName ? getTeamColor(winnerName) : '#666';

  const hasAwards = seasonData?.awards && Object.values(seasonData.awards).some(Boolean);
  const hasLeaders = seasonData?.leaders && Object.values(seasonData.leaders).some(Boolean);

  // Nothing to show at all
  if (!winnerId && !snapshotLoading && !hasAwards && !hasLeaders) return null;

  if (snapshotLoading && !seasonData) return <SnapshotSkeleton />;

  const awardEntries = hasAwards ? [
    { key: 'alMvp', label: 'AL MVP', data: seasonData.awards.alMvp },
    { key: 'nlMvp', label: 'NL MVP', data: seasonData.awards.nlMvp },
    { key: 'alCy', label: 'AL CYA', data: seasonData.awards.alCy },
    { key: 'nlCy', label: 'NL CYA', data: seasonData.awards.nlCy },
  ].filter(e => e.data) : [];

  const leaderEntries = hasLeaders ? [
    { key: 'hr', label: 'HR', data: seasonData.leaders.hr },
    { key: 'avg', label: 'AVG', data: seasonData.leaders.avg },
    { key: 'era', label: 'ERA', data: seasonData.leaders.era },
    { key: 'k', label: 'K', data: seasonData.leaders.k },
  ].filter(e => e.data) : [];

  return (
    <div
      className="mb-8 bg-bg-card rounded-xl border border-border overflow-hidden animate-fade-in"
      style={winnerId ? { borderLeftWidth: '4px', borderLeftColor: winnerColor } : undefined}
    >
      {/* World Series Champions */}
      {winnerId && winnerName && (
        <div className={`px-5 py-4 flex items-center gap-4 ${awardEntries.length > 0 || leaderEntries.length > 0 ? 'border-b border-border' : ''}`}>
          <button
            onClick={() => onSelectTeam?.({ id: winnerId })}
            className="flex items-center gap-4 cursor-pointer group"
          >
            <img
              src={getTeamLogoUrl(winnerId)}
              alt={winnerName}
              className="w-12 h-12 object-contain team-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="text-left">
              <h3 className="font-display text-xl tracking-wide text-text-primary group-hover:text-accent transition-colors">
                {winnerName}
              </h3>
              <p className="text-sm text-text-muted">
                {season} World Series Champions
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Awards Section */}
      {awardEntries.length > 0 && (
        <div className={`px-5 py-4 ${leaderEntries.length > 0 ? 'border-b border-border' : ''}`}>
          <h4 className="text-[11px] uppercase tracking-widest text-text-muted font-semibold mb-2.5">Awards</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {awardEntries.map(({ key, label, data }) => (
              <AwardChip key={key} label={label} data={data} onPlayerClick={onPlayerClick} />
            ))}
          </div>
        </div>
      )}

      {/* Season Leaders Section */}
      {leaderEntries.length > 0 && (
        <div className="px-5 py-4">
          <h4 className="text-[11px] uppercase tracking-widest text-text-muted font-semibold mb-2">Season Leaders</h4>
          <div className="flex flex-wrap gap-x-8 gap-y-0.5">
            {leaderEntries.map(({ key, label, data }) => (
              <LeaderChip key={key} label={label} data={data} onPlayerClick={onPlayerClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Standings = ({ standings, season, loading, onSelectTeam, onPlayerClick }) => {
  const [sortConfig, setSortConfig] = useState(null);
  const [condensed, setCondensed] = useState(false);
  const [seasonData, setSeasonData] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // Fetch awards + stat leaders when season changes
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const loadSeasonData = async () => {
      setSnapshotLoading(true);
      try {
        const [awards, hrLeader, avgLeader, eraLeader, kLeader] = await Promise.all([
          fetchAwards(season, signal),
          fetchLeaders('homeRuns', season, 'hitting', 1, signal),
          fetchLeaders('battingAverage', season, 'hitting', 1, signal),
          fetchLeaders('earnedRunAverage', season, 'pitching', 1, signal),
          fetchLeaders('strikeouts', season, 'pitching', 1, signal),
        ]);
        if (!signal.aborted) {
          setSeasonData({
            awards,
            leaders: { hr: hrLeader[0], avg: avgLeader[0], era: eraLeader[0], k: kLeader[0] },
          });
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Season data fetch failed:', e);
      } finally {
        if (!signal.aborted) setSnapshotLoading(false);
      }
    };

    loadSeasonData();
    return () => controller.abort();
  }, [season]);

  const handleSort = (key) => {
    // Skip sorting by team name in condensed if column not visible
    const col = COLUMNS.find(c => c.key === key);
    if (condensed && col && !col.condensed) return;

    setSortConfig(prev => {
      if (!prev || prev.key !== key) return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key, direction: 'asc' };
      return null; // third click clears sort
    });
  };

  const clearSort = () => setSortConfig(null);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="text-center mb-10">
          <h2 className="font-display text-5xl md:text-6xl text-text-primary tracking-wide mb-3">
            STANDINGS
          </h2>
          <p className="text-text-muted text-lg">Loading standings data...</p>
        </div>
        <StandingsSkeleton />
      </div>
    );
  }

  if (!standings || standings.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-8xl mb-8 opacity-50">📊</div>
        <h2 className="font-display text-4xl md:text-5xl text-text-primary mb-4 tracking-wide">
          NO STANDINGS DATA
        </h2>
        <p className="text-text-muted text-lg max-w-md mx-auto">
          Standings data is not available for the {season} season.
          Try selecting a different year.
        </p>
      </div>
    );
  }

  // Group standings by division
  const standingsByDivision = {};
  standings.forEach(record => {
    const divisionId = record.team?.division?.id;
    if (divisionId) {
      if (!standingsByDivision[divisionId]) {
        standingsByDivision[divisionId] = [];
      }
      standingsByDivision[divisionId].push(record);
    }
  });

  const alDivisions = DIVISIONS.filter(d => d.league === 'American League');
  const nlDivisions = DIVISIONS.filter(d => d.league === 'National League');
  const isSorted = sortConfig !== null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="font-display text-5xl md:text-6xl text-text-primary tracking-wide mb-3">
          {season} STANDINGS
        </h2>
        <p className="text-text-muted text-lg">
          Regular season standings by division
        </p>
      </div>

      {/* Controls row */}
      <div className="flex justify-center items-center gap-4 mb-8">
        {/* Condensed mode toggle */}
        <div className="flex bg-bg-tertiary rounded-lg p-1 border border-border theme-transition">
          <button
            onClick={() => setCondensed(false)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
              !condensed
                ? 'bg-accent text-text-inverse shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Full
          </button>
          <button
            onClick={() => setCondensed(true)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
              condensed
                ? 'bg-accent text-text-inverse shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Compact
          </button>
        </div>

        {/* Back to division view button */}
        {isSorted && (
          <button
            onClick={clearSort}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary hover:border-accent transition-all"
          >
            Back to Division View
          </button>
        )}
      </div>

      {/* Season Snapshot */}
      <SeasonSnapshot
        season={season}
        seasonData={seasonData}
        snapshotLoading={snapshotLoading}
        onPlayerClick={onPlayerClick}
        onSelectTeam={onSelectTeam}
      />

      {/* Sorted view: single flat table */}
      {isSorted ? (
        <SortedTable
          teams={standings}
          sortConfig={sortConfig}
          onSort={handleSort}
          season={season}
          onSelectTeam={onSelectTeam}
          condensed={condensed}
        />
      ) : (
        /* Division view: two-column layout */
        <div className="grid lg:grid-cols-2 gap-6">
          {/* American League */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="w-1 h-8 bg-accent rounded-full" />
              <h2 className="font-display text-2xl text-text-secondary tracking-wide">
                AMERICAN LEAGUE
              </h2>
            </div>
            {alDivisions.map((division, index) => (
              <DivisionTable
                key={division.id}
                division={division}
                teams={standingsByDivision[division.id]}
                animationDelay={index * 100}
                season={season}
                onSelectTeam={onSelectTeam}
                condensed={condensed}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            ))}
          </div>

          {/* National League */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="w-1 h-8 bg-accent rounded-full" />
              <h2 className="font-display text-2xl text-text-secondary tracking-wide">
                NATIONAL LEAGUE
              </h2>
            </div>
            {nlDivisions.map((division, index) => (
              <DivisionTable
                key={division.id}
                division={division}
                teams={standingsByDivision[division.id]}
                animationDelay={(index + 3) * 100}
                season={season}
                onSelectTeam={onSelectTeam}
                condensed={condensed}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Standings;
