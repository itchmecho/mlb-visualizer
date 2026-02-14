// TeamRoster component - Player roster grouped by position
// v1.0.0 | 2026-02-05

import React from 'react';
import { getPlayerHeadshotUrl } from '../utils/teamData';

// Position group definitions
const POSITION_GROUPS = [
  {
    key: 'pitchers',
    label: 'PITCHERS',
    codes: ['P', 'SP', 'RP', 'CL', 'TWP'],
  },
  {
    key: 'catchers',
    label: 'CATCHERS',
    codes: ['C'],
  },
  {
    key: 'infielders',
    label: 'INFIELDERS',
    codes: ['1B', '2B', '3B', 'SS'],
  },
  {
    key: 'outfielders',
    label: 'OUTFIELDERS',
    codes: ['LF', 'CF', 'RF', 'OF'],
  },
  {
    key: 'dh',
    label: 'DESIGNATED HITTERS',
    codes: ['DH'],
  },
];

// Pitcher position codes for stat display logic
const PITCHER_CODES = new Set(['P', 'SP', 'RP', 'CL', 'TWP']);

/**
 * Get the season stats for a roster entry's person
 * The hydrate param nests stats inside person.stats
 */
const getPlayerStats = (entry) => {
  const stats = entry.person?.stats;
  if (!stats || stats.length === 0) return null;

  // Find season stats split
  for (const statGroup of stats) {
    if (statGroup.type?.displayName === 'season' || statGroup.type?.displayName === 'statsSingleSeason') {
      const split = statGroup.splits?.[0]?.stat;
      if (split) return split;
    }
  }

  // Fallback: just grab the first available split
  return stats[0]?.splits?.[0]?.stat || null;
};

/**
 * Format a stat value for display
 */
const formatStat = (value) => {
  if (value === undefined || value === null || value === '') return '—';
  return value;
};

const TeamRoster = ({ roster, loading, onPlayerClick, teamColor }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-muted text-sm">Loading roster...</p>
        </div>
      </div>
    );
  }

  if (!roster || roster.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted text-sm">No roster data available</p>
      </div>
    );
  }

  // Group players by position
  const grouped = {};
  for (const group of POSITION_GROUPS) {
    grouped[group.key] = [];
  }

  for (const entry of roster) {
    const posAbbr = entry.position?.abbreviation || entry.person?.primaryPosition?.abbreviation;
    let placed = false;

    for (const group of POSITION_GROUPS) {
      if (group.codes.includes(posAbbr)) {
        grouped[group.key].push(entry);
        placed = true;
        break;
      }
    }

    // Fallback: put unknowns in DH group
    if (!placed) {
      grouped.dh.push(entry);
    }
  }

  // Sort each group by jersey number
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      const numA = parseInt(a.jerseyNumber, 10) || 999;
      const numB = parseInt(b.jerseyNumber, 10) || 999;
      return numA - numB;
    });
  }

  return (
    <div className="space-y-4 stagger-children">
      {POSITION_GROUPS.map((group) => {
        const players = grouped[group.key];
        if (players.length === 0) return null;

        const isPitcherGroup = group.key === 'pitchers';

        return (
          <div key={group.key} className="animate-fade-in">
            {/* Group Header */}
            <h4 className="text-xs font-bold text-text-muted tracking-[0.2em] mb-2 flex items-center gap-2">
              {group.label}
              <span className="text-[10px] px-1.5 py-0.5 bg-bg-primary rounded text-text-muted font-bold">
                {players.length}
              </span>
            </h4>

            {/* Player Rows */}
            <div className="space-y-1">
              {players.map((entry) => {
                const person = entry.person || {};
                const playerId = person.id;
                const fullName = person.fullName || 'Unknown';
                const jerseyNumber = entry.jerseyNumber || '—';
                const posAbbr = entry.position?.abbreviation || person.primaryPosition?.abbreviation || '?';
                const headshotUrl = getPlayerHeadshotUrl(playerId);
                const stats = getPlayerStats(entry);
                const isEntryPitcher = PITCHER_CODES.has(posAbbr);

                return (
                  <button
                    key={playerId || fullName}
                    onClick={() => onPlayerClick?.(person)}
                    className="w-full flex items-center gap-3 px-3 py-2 bg-bg-tertiary hover:bg-bg-elevated rounded-lg transition-all theme-transition group cursor-pointer text-left"
                  >
                    {/* Headshot */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-primary flex-shrink-0 border border-border-light relative">
                      <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs font-bold">
                        {fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      {headshotUrl && (
                        <img
                          src={headshotUrl}
                          alt={fullName}
                          className="w-full h-full object-cover relative"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>

                    {/* Jersey Number */}
                    <span className="text-sm font-bold text-text-muted w-8 text-center tabular-nums flex-shrink-0">
                      #{jerseyNumber}
                    </span>

                    {/* Name */}
                    <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors flex-1 min-w-0 truncate">
                      {fullName}
                    </span>

                    {/* Position Badge */}
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0"
                      style={{
                        backgroundColor: `${teamColor || '#666'}20`,
                        color: teamColor || '#666',
                      }}
                    >
                      {posAbbr}
                    </span>

                    {/* Key Stats */}
                    <div className="flex items-center gap-3 text-xs text-text-secondary tabular-nums flex-shrink-0">
                      {isEntryPitcher ? (
                        <>
                          <div className="w-12 text-right">
                            <span className="text-text-muted">ERA </span>
                            <span className="font-medium text-text-primary">{formatStat(stats?.era)}</span>
                          </div>
                          <div className="w-12 text-right">
                            <span className="text-text-muted">W-L </span>
                            <span className="font-medium text-text-primary">
                              {stats ? `${stats.wins ?? 0}-${stats.losses ?? 0}` : '—'}
                            </span>
                          </div>
                          <div className="w-10 text-right">
                            <span className="text-text-muted">K </span>
                            <span className="font-medium text-text-primary">{formatStat(stats?.strikeOuts)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 text-right">
                            <span className="text-text-muted">AVG </span>
                            <span className="font-medium text-text-primary">{formatStat(stats?.avg)}</span>
                          </div>
                          <div className="w-10 text-right">
                            <span className="text-text-muted">HR </span>
                            <span className="font-medium text-text-primary">{formatStat(stats?.homeRuns)}</span>
                          </div>
                          <div className="w-10 text-right">
                            <span className="text-text-muted">RBI </span>
                            <span className="font-medium text-text-primary">{formatStat(stats?.rbi)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Chevron */}
                    <svg
                      className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TeamRoster;
