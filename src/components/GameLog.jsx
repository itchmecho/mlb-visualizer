// GameLog component - Game-by-game stats and split summaries
// v1.0.0 | 2026-02-06

import React, { useState, useMemo } from 'react';
import { getTeamLogoUrl, getTeamData, TEAM_DATA } from '../utils/teamData';

// Split period options
const SPLIT_PERIODS = [
  { key: 7, label: 'Last 7' },
  { key: 15, label: 'Last 15' },
  { key: 30, label: 'Last 30' },
];

// Hitter game log columns
const HITTER_LOG_COLUMNS = [
  { key: 'date', label: 'Date', align: 'left' },
  { key: 'opponent', label: 'OPP', align: 'left' },
  { key: 'atBats', label: 'AB' },
  { key: 'hits', label: 'H' },
  { key: 'runs', label: 'R' },
  { key: 'rbi', label: 'RBI' },
  { key: 'homeRuns', label: 'HR' },
  { key: 'baseOnBalls', label: 'BB' },
  { key: 'strikeOuts', label: 'K' },
  { key: 'stolenBases', label: 'SB' },
  { key: 'avg', label: 'AVG', decimal: true },
];

// Pitcher game log columns
const PITCHER_LOG_COLUMNS = [
  { key: 'date', label: 'Date', align: 'left' },
  { key: 'opponent', label: 'OPP', align: 'left' },
  { key: 'decision', label: 'DEC', align: 'center' },
  { key: 'inningsPitched', label: 'IP' },
  { key: 'hits', label: 'H' },
  { key: 'runs', label: 'R' },
  { key: 'earnedRuns', label: 'ER' },
  { key: 'strikeOuts', label: 'K' },
  { key: 'baseOnBalls', label: 'BB' },
  { key: 'homeRuns', label: 'HR' },
  { key: 'era', label: 'ERA', decimal: true },
];

// Hitter split summary stats
const HITTER_SPLIT_STATS = [
  { key: 'avg', label: 'AVG', decimal: true },
  { key: 'ops', label: 'OPS', decimal: true },
  { key: 'homeRuns', label: 'HR' },
  { key: 'rbi', label: 'RBI' },
  { key: 'hits', label: 'H' },
  { key: 'runs', label: 'R' },
];

// Pitcher split summary stats
const PITCHER_SPLIT_STATS = [
  { key: 'era', label: 'ERA', decimal: true },
  { key: 'whip', label: 'WHIP', decimal: true },
  { key: 'strikeOuts', label: 'K' },
  { key: 'inningsPitched', label: 'IP' },
  { key: 'wins', label: 'W' },
  { key: 'saves', label: 'SV' },
];

// Format a stat value
const formatValue = (value, col) => {
  if (value === undefined || value === null || value === '') return '-';
  if (col?.decimal) {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    if (['avg'].includes(col.key)) return num.toFixed(3).replace(/^0/, '');
    if (['ops'].includes(col.key)) return num.toFixed(3);
    return num.toFixed(2);
  }
  return value.toString();
};

// Find team abbreviation from team ID
const findTeamAbbr = (teamId) => {
  for (const [, data] of Object.entries(TEAM_DATA)) {
    if (data.id === teamId) return data.abbr;
  }
  return '???';
};

const GameLog = ({ player, gameLogData, splitData, isPitcher, season, teamColor }) => {
  const [activeSplit, setActiveSplit] = useState(7);
  const columns = isPitcher ? PITCHER_LOG_COLUMNS : HITTER_LOG_COLUMNS;
  const splitStats = isPitcher ? PITCHER_SPLIT_STATS : HITTER_SPLIT_STATS;

  // Process game log entries
  const games = useMemo(() => {
    if (!gameLogData || gameLogData.length === 0) return [];

    return gameLogData.map(split => {
      const stat = split.stat || {};
      const game = split.game || {};
      const opp = split.opponent || {};
      const isHome = split.isHome;

      // Parse date
      const dateStr = split.date || game.gameDate;
      let displayDate = '-';
      if (dateStr) {
        const d = new Date(dateStr);
        displayDate = `${d.getMonth() + 1}/${d.getDate()}`;
      }

      // Decision for pitchers
      let decision = '-';
      if (isPitcher) {
        if (stat.wins > 0 || stat.wins === '1') decision = 'W';
        else if (stat.losses > 0 || stat.losses === '1') decision = 'L';
        else if (stat.saves > 0 || stat.saves === '1') decision = 'SV';
        else if (stat.holds > 0 || stat.holds === '1') decision = 'H';
      }

      return {
        date: displayDate,
        opponentId: opp.id,
        opponentAbbr: findTeamAbbr(opp.id),
        isHome,
        decision,
        stat,
      };
    }).reverse(); // Most recent first
  }, [gameLogData, isPitcher]);

  // Get active split data
  const activeSplitData = useMemo(() => {
    if (!splitData) return null;
    return splitData[activeSplit] || null;
  }, [splitData, activeSplit]);

  if (!gameLogData) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-muted text-sm">Loading game log...</p>
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-text-muted mb-2">No game log data available for the {season} season.</p>
          <p className="text-text-muted text-sm">
            {season >= new Date().getFullYear()
              ? 'The season may not have started yet. Try selecting a previous season.'
              : 'This player may not have played in this season.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Split Summaries */}
      {splitData && (
        <div className="mb-6">
          {/* Split Period Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-text-muted tracking-wider">RECENT SPLITS</span>
            <div className="flex bg-bg-tertiary rounded-lg p-0.5">
              {SPLIT_PERIODS.map(period => (
                <button
                  key={period.key}
                  onClick={() => setActiveSplit(period.key)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeSplit === period.key
                      ? 'text-white shadow-sm'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                  style={activeSplit === period.key ? { backgroundColor: teamColor } : {}}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          {/* Split Stats Grid */}
          {activeSplitData && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {splitStats.map(stat => {
                const value = activeSplitData[stat.key];
                return (
                  <div key={stat.key} className="bg-bg-tertiary/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-text-muted font-medium mb-1">{stat.label}</div>
                    <div className="text-lg font-bold text-text-primary tabular-nums">
                      {formatValue(value, stat)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Game Log Header */}
      <div className="flex items-start justify-between mb-3 pb-2 border-b border-border-light">
        <h3 className="text-xs font-bold text-text-muted tracking-[0.2em]">GAME LOG</h3>
        <span className="text-xs text-text-muted">{games.length} GAMES</span>
      </div>

      {/* Game Log Table */}
      <div className="overflow-y-auto max-h-[400px] -mx-2">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-bg-card z-10">
            <tr className="border-b border-border-light">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-2 py-2 text-xs font-bold text-text-muted tracking-wider whitespace-nowrap ${
                    col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.map((game, idx) => (
              <tr
                key={idx}
                className={`border-b border-border-light/50 hover:bg-bg-tertiary/50 transition-colors ${
                  idx % 2 === 1 ? 'bg-bg-tertiary/20' : ''
                }`}
              >
                {columns.map(col => {
                  if (col.key === 'date') {
                    return (
                      <td key={col.key} className="px-2 py-1.5 text-left text-text-secondary tabular-nums text-xs">
                        {game.date}
                      </td>
                    );
                  }
                  if (col.key === 'opponent') {
                    return (
                      <td key={col.key} className="px-2 py-1.5 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-text-muted text-xs">{game.isHome ? 'vs' : '@'}</span>
                          {game.opponentId && (
                            <img
                              src={getTeamLogoUrl(game.opponentId)}
                              alt={game.opponentAbbr}
                              className="w-4 h-4 object-contain"
                            />
                          )}
                          <span className="text-text-secondary font-medium text-xs">{game.opponentAbbr}</span>
                        </div>
                      </td>
                    );
                  }
                  if (col.key === 'decision') {
                    const decColor = game.decision === 'W' ? '#22c55e'
                      : game.decision === 'L' ? '#ef4444'
                      : game.decision === 'SV' ? '#3b82f6'
                      : 'var(--color-text-muted)';
                    return (
                      <td key={col.key} className="px-2 py-1.5 text-center font-bold text-xs" style={{ color: decColor }}>
                        {game.decision}
                      </td>
                    );
                  }

                  const value = game.stat?.[col.key];
                  return (
                    <td
                      key={col.key}
                      className="px-2 py-1.5 text-right tabular-nums text-text-secondary text-xs"
                    >
                      {formatValue(value, col)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GameLog;
