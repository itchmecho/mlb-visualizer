// Team Standings Component
// v4.1.1 | 2026-02-09

import React, { useState } from 'react';
import { getTeamLogoUrl, TEAM_DATA } from '../utils/teamData';
import { StandingsSkeleton } from './Skeleton';

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
        backgroundColor: isLeader ? teamColor + '12' : undefined,
      }}
    >
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <span
            className={`
              font-display text-lg w-5 text-center shrink-0
              ${isLeader ? 'text-accent' : 'text-text-muted'}
            `}
          >
            {rank}
          </span>
          <div
            className="w-1 h-8 rounded-full shrink-0"
            style={{ backgroundColor: teamColor }}
          />
          {teamId && (
            <img
              src={getTeamLogoUrl(teamId)}
              alt={teamName}
              className="w-7 h-7 object-contain shrink-0 transition-transform duration-300 group-hover/row:scale-110 team-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <div className="flex flex-col relative group/name">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectTeam?.(team)}
                className={`font-medium hover:underline transition-colors text-left cursor-pointer ${isLeader ? 'text-accent hover:text-accent' : 'text-text-primary hover:text-accent'}`}
              >
                {teamName}
              </button>
              {isWorldSeriesWinner && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs font-bold rounded tracking-wide">
                  WS CHAMP
                </span>
              )}
            </div>
            {/* Home/Away/1-Run tooltip */}
            {!condensed && (homeRecord || awayRecord || oneRunRecord) && (
              <div className="absolute top-full left-0 mt-1 opacity-0 group-hover/name:opacity-100 transition-opacity duration-200 bg-bg-elevated border border-border rounded-lg shadow-lg z-50 pointer-events-none px-3 py-2 whitespace-nowrap">
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
      <td className="py-2.5 px-2 text-center">
        <span className="font-display text-lg text-text-primary">{wins}</span>
      </td>
      <td className="py-2.5 px-2 text-center">
        <span className="font-display text-lg text-text-secondary">{losses}</span>
      </td>
      {!condensed && (
        <td className="py-2.5 px-2 text-center">
          <span className="text-sm font-medium text-text-secondary">{pct}</span>
        </td>
      )}
      <td className="py-2.5 px-2 text-center">
        <span className={`text-sm ${gb === '-' ? 'text-accent font-bold' : 'text-text-muted'}`}>
          {gb}
        </span>
      </td>
      {!condensed && (
        <>
          <td className="py-2.5 px-1.5 text-center">
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
          <td className="py-2.5 px-2 text-center">
            <span className="text-sm text-text-secondary">{last10Record}</span>
          </td>
          <td className="py-2.5 px-1.5 text-center">
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
        </>
      )}
    </tr>
  );
};

const SortableHeader = ({ column, sortConfig, onSort, condensed }) => {
  if (!column.condensed && condensed) return null;

  const isActive = sortConfig?.key === column.key;
  const arrow = isActive
    ? sortConfig.direction === 'desc' ? ' \u25BC' : ' \u25B2'
    : '';

  return (
    <th
      className={`py-2.5 ${column.key === 'team' ? 'px-3' : 'px-2'} ${column.align === 'left' ? 'text-left' : 'text-center'} font-semibold cursor-pointer hover:text-accent transition-colors select-none`}
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
      <div className="overflow-x-auto">
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
      <div className="overflow-x-auto">
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

// Season Summary Banner — World Series champion
const SeasonBanner = ({ season }) => {
  const winnerId = WORLD_SERIES_WINNERS[season];
  if (!winnerId) return null;

  const teamName = getTeamNameById(winnerId);
  if (!teamName) return null;

  const teamColor = getTeamColor(teamName);

  return (
    <div
      className="mb-8 bg-bg-card rounded-xl border border-border overflow-hidden animate-fade-in"
      style={{ borderLeftWidth: '4px', borderLeftColor: teamColor }}
    >
      <div className="px-5 py-4 flex items-center gap-4">
        <img
          src={getTeamLogoUrl(winnerId)}
          alt={teamName}
          className="w-12 h-12 object-contain team-logo"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div>
          <h3 className="font-display text-xl tracking-wide text-text-primary">
            {teamName}
          </h3>
          <p className="text-sm text-text-muted">
            {season} World Series Champions
          </p>
        </div>
      </div>
    </div>
  );
};

const Standings = ({ standings, season, loading, onSelectTeam }) => {
  const [sortConfig, setSortConfig] = useState(null);
  const [condensed, setCondensed] = useState(false);

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
        <h2 className="font-display text-5xl text-text-primary mb-4 tracking-wide">
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

      {/* Season Summary Banner */}
      <SeasonBanner season={season} />

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
