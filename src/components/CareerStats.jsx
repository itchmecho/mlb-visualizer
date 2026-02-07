// CareerStats component - Year-by-year career statistics with percentile coloring
// v1.1.0 | 2026-02-06

import React, { useMemo } from 'react';
import { getPercentileColor, calculatePercentile } from '../utils/percentile';
import { enhanceHittingStats } from '../utils/api';
import { SparklineGrid } from './Sparkline';
import RadarChart from './RadarChart';

// Hitter columns for the career table
const HITTER_COLUMNS = [
  { key: 'season', label: 'Year', align: 'left' },
  { key: 'team', label: 'Team', align: 'left' },
  { key: 'gamesPlayed', label: 'G' },
  { key: 'plateAppearances', label: 'PA' },
  { key: 'avg', label: 'AVG', higherBetter: true, decimal: true },
  { key: 'obp', label: 'OBP', higherBetter: true, decimal: true },
  { key: 'slg', label: 'SLG', higherBetter: true, decimal: true },
  { key: 'ops', label: 'OPS', higherBetter: true, decimal: true },
  { key: 'homeRuns', label: 'HR', higherBetter: true },
  { key: 'rbi', label: 'RBI', higherBetter: true },
  { key: 'runs', label: 'R', higherBetter: true },
  { key: 'hits', label: 'H', higherBetter: true },
  { key: 'stolenBases', label: 'SB', higherBetter: true },
  { key: 'baseOnBalls', label: 'BB', higherBetter: true },
  { key: 'strikeOuts', label: 'K', higherBetter: false },
];

// Pitcher columns for the career table
const PITCHER_COLUMNS = [
  { key: 'season', label: 'Year', align: 'left' },
  { key: 'team', label: 'Team', align: 'left' },
  { key: 'gamesPlayed', label: 'G' },
  { key: 'gamesStarted', label: 'GS' },
  { key: 'wins', label: 'W', higherBetter: true },
  { key: 'losses', label: 'L', higherBetter: false },
  { key: 'era', label: 'ERA', higherBetter: false, decimal: true },
  { key: 'whip', label: 'WHIP', higherBetter: false, decimal: true },
  { key: 'inningsPitched', label: 'IP', higherBetter: true },
  { key: 'strikeOuts', label: 'K', higherBetter: true },
  { key: 'strikeoutsPer9Inn', label: 'K/9', higherBetter: true, decimal: true },
  { key: 'baseOnBalls', label: 'BB', higherBetter: false },
  { key: 'homeRuns', label: 'HR', higherBetter: false },
  { key: 'saves', label: 'SV', higherBetter: true },
];

// Format a stat cell value
const formatCellValue = (value, col) => {
  if (value === undefined || value === null || value === '') return '-';

  if (col.decimal) {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    if (['avg', 'obp', 'slg'].includes(col.key)) {
      return num.toFixed(3).replace(/^0/, '');
    }
    if (col.key === 'ops') return num.toFixed(3);
    return num.toFixed(2);
  }

  return value.toString();
};

const CareerStats = ({ player, careerStats, isPitcher, teamColor }) => {
  const columns = isPitcher ? PITCHER_COLUMNS : HITTER_COLUMNS;

  // Process career data: extract seasons and compute per-column percentiles
  const { seasons, totals, columnPercentiles } = useMemo(() => {
    if (!careerStats || careerStats.length === 0) {
      return { seasons: [], totals: null, columnPercentiles: {} };
    }

    // Filter to MLB stats only (sportId 1) and sort by season
    const mlbSeasons = careerStats
      .filter(split => split.sport?.id === 1 || split.sport?.abbreviation === 'MLB')
      .sort((a, b) => parseInt(a.season) - parseInt(b.season));

    // Build season rows
    const seasonRows = mlbSeasons.map(split => ({
      season: split.season,
      team: split.team?.abbreviation || '???',
      stat: isPitcher ? split.stat : enhanceHittingStats(split.stat),
    }));

    // Calculate career totals (find the careerTotals row if present, or sum manually)
    // The API's yearByYear includes individual season splits, we sum key counting stats
    let careerTotals = null;
    if (seasonRows.length > 1) {
      const totalStat = {};
      const countingKeys = isPitcher
        ? ['gamesPlayed', 'gamesStarted', 'wins', 'losses', 'strikeOuts', 'baseOnBalls', 'homeRuns', 'saves', 'hits']
        : ['gamesPlayed', 'plateAppearances', 'homeRuns', 'rbi', 'runs', 'hits', 'stolenBases', 'baseOnBalls', 'strikeOuts', 'doubles', 'triples'];

      countingKeys.forEach(key => {
        totalStat[key] = seasonRows.reduce((sum, row) => sum + (parseInt(row.stat?.[key], 10) || 0), 0);
      });

      // Calculate rate stats for career totals
      if (isPitcher) {
        const totalIP = seasonRows.reduce((sum, row) => {
          const ip = parseFloat(row.stat?.inningsPitched) || 0;
          const whole = Math.floor(ip);
          const fraction = (ip - whole) * 10;
          return sum + whole + fraction / 3;
        }, 0);
        totalStat.inningsPitched = totalIP.toFixed(1);
        const totalER = seasonRows.reduce((sum, row) => sum + (parseInt(row.stat?.earnedRuns, 10) || 0), 0);
        totalStat.era = totalIP > 0 ? ((totalER / totalIP) * 9).toFixed(2) : '-';
        totalStat.whip = totalIP > 0 ? ((totalStat.baseOnBalls + (totalStat.hits || 0)) / totalIP).toFixed(2) : '-';
        totalStat.strikeoutsPer9Inn = totalIP > 0 ? ((totalStat.strikeOuts / totalIP) * 9).toFixed(2) : '-';
      } else {
        const totalAB = seasonRows.reduce((sum, row) => sum + (parseInt(row.stat?.atBats, 10) || 0), 0);
        totalStat.avg = totalAB > 0 ? (totalStat.hits / totalAB).toFixed(3) : '-';
        totalStat.obp = totalStat.plateAppearances > 0
          ? ((totalStat.hits + totalStat.baseOnBalls) / totalStat.plateAppearances).toFixed(3)
          : '-';
        const enhancedTotal = enhanceHittingStats(totalStat);
        totalStat.slg = totalAB > 0 ? (enhancedTotal.totalBases / totalAB).toFixed(3) : '-';
        totalStat.ops = totalStat.obp !== '-' && totalStat.slg !== '-'
          ? (parseFloat(totalStat.obp) + parseFloat(totalStat.slg)).toFixed(3)
          : '-';
      }

      careerTotals = totalStat;
    }

    // Build percentile lookup: for each stat column, gather all season values
    const percentileMaps = {};
    columns.forEach(col => {
      if (col.higherBetter !== undefined) {
        const allValues = seasonRows
          .map(row => parseFloat(row.stat?.[col.key]))
          .filter(v => !isNaN(v));
        percentileMaps[col.key] = allValues;
      }
    });

    return { seasons: seasonRows, totals: careerTotals, columnPercentiles: percentileMaps };
  }, [careerStats, isPitcher, columns]);

  if (!careerStats) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-muted text-sm">Loading career stats...</p>
        </div>
      </div>
    );
  }

  if (seasons.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text-muted">No career stats available for this player.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sparklines */}
      <SparklineGrid careerStats={careerStats} isPitcher={isPitcher} teamColor={teamColor} />

      {/* Section Header + Radar */}
      <div className="flex items-start justify-between mb-4 pb-3 border-b border-border-light">
        <div>
          <h2 className="font-display text-xl text-text-primary tracking-wide">
            YEAR-BY-YEAR STATS
          </h2>
          <span className="text-xs text-text-muted font-medium">
            {seasons.length} MLB {seasons.length === 1 ? 'SEASON' : 'SEASONS'}
          </span>
        </div>
        {/* Radar Chart - small, inline */}
        {seasons.length > 0 && (
          <RadarChart
            playerStats={seasons[seasons.length - 1]?.stat}
            isPitcher={isPitcher}
            teamColor={teamColor}
          />
        )}
      </div>

      {/* Career Table */}
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-2 py-2 text-xs font-bold text-text-muted tracking-wider whitespace-nowrap ${
                    col.align === 'left' ? 'text-left' : 'text-right'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seasons.map((row, idx) => (
              <tr
                key={`${row.season}-${row.team}-${idx}`}
                className="border-b border-border-light/50 hover:bg-bg-tertiary/50 transition-colors"
              >
                {columns.map(col => {
                  // Season and team are special columns
                  if (col.key === 'season') {
                    return (
                      <td key={col.key} className="px-2 py-1.5 text-left font-bold text-text-primary tabular-nums">
                        {row.season}
                      </td>
                    );
                  }
                  if (col.key === 'team') {
                    return (
                      <td key={col.key} className="px-2 py-1.5 text-left text-text-secondary font-medium">
                        {row.team}
                      </td>
                    );
                  }

                  const rawValue = row.stat?.[col.key];
                  const displayValue = formatCellValue(rawValue, col);

                  // Calculate percentile for color coding (only for stat columns)
                  let cellColor = null;
                  if (col.higherBetter !== undefined && columnPercentiles[col.key]?.length > 2) {
                    const numVal = parseFloat(rawValue);
                    if (!isNaN(numVal)) {
                      const pctl = calculatePercentile(numVal, columnPercentiles[col.key], col.higherBetter);
                      if (pctl !== null) {
                        cellColor = getPercentileColor(pctl);
                      }
                    }
                  }

                  return (
                    <td
                      key={col.key}
                      className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap font-medium"
                      style={cellColor ? { color: cellColor } : { color: 'var(--color-text-secondary)' }}
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Career Totals Row */}
            {totals && (
              <tr className="border-t-2 border-border bg-bg-tertiary/30 font-bold">
                {columns.map(col => {
                  if (col.key === 'season') {
                    return (
                      <td key={col.key} className="px-2 py-2 text-left text-text-primary font-bold">
                        Career
                      </td>
                    );
                  }
                  if (col.key === 'team') {
                    return <td key={col.key} className="px-2 py-2" />;
                  }

                  const rawValue = totals[col.key];
                  const displayValue = formatCellValue(rawValue, col);

                  return (
                    <td
                      key={col.key}
                      className="px-2 py-2 text-right tabular-nums whitespace-nowrap text-text-primary"
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CareerStats;
