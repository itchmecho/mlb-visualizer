// CompareStatBar component - Head-to-head stat comparison
// v1.0.0 | 2026-02-04

import React from 'react';
import { getPercentileColor, calculatePercentile } from '../utils/percentile';

const formatStatValue = (value, statKey) => {
  if (value === undefined || value === null) return '-';

  const decimalStats = [
    'avg', 'obp', 'slg', 'ops', 'era', 'whip', 'iso',
    'strikeoutsPer9Inn', 'walksPer9Inn', 'homeRunsPer9', 'strikeoutWalkRatio'
  ];

  if (decimalStats.includes(statKey)) {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    if (['avg', 'obp', 'slg', 'iso'].includes(statKey)) {
      return num.toFixed(3).replace(/^0/, '');
    }
    if (statKey === 'ops') {
      return num.toFixed(3);
    }
    return num.toFixed(2);
  }

  return value.toString();
};

const CompareStatBar = ({ label, stat, player1Stats, player2Stats, leagueStats }) => {
  const value1 = player1Stats?.[stat.key];
  const value2 = player2Stats?.[stat.key];

  const leagueValues = leagueStats?.map(p => parseFloat(p[stat.key])).filter(v => !isNaN(v)) || [];

  const percentile1 = calculatePercentile(parseFloat(value1), leagueValues, stat.higherBetter);
  const percentile2 = calculatePercentile(parseFloat(value2), leagueValues, stat.higherBetter);

  const color1 = getPercentileColor(percentile1);
  const color2 = getPercentileColor(percentile2);

  // Determine winner
  const p1Wins = percentile1 !== null && percentile2 !== null && percentile1 > percentile2;
  const p2Wins = percentile1 !== null && percentile2 !== null && percentile2 > percentile1;
  const tie = percentile1 !== null && percentile2 !== null && percentile1 === percentile2;

  return (
    <div className="flex items-center gap-2 py-2">
      {/* Player 1 side */}
      <div className="flex-1 flex items-center gap-2">
        {/* Value */}
        <div className={`w-16 text-right font-bold tabular-nums ${p1Wins ? 'text-text-primary' : 'text-text-muted'}`}>
          {formatStatValue(value1, stat.key)}
        </div>

        {/* Bar (right to left) */}
        <div className="flex-1 h-6 bg-[var(--color-stat-bar-bg)] rounded-sm overflow-hidden flex justify-end">
          <div
            className="h-full rounded-sm stat-bar-animated flex items-center justify-start pl-2"
            style={{
              width: `${Math.max(percentile1 || 0, 5)}%`,
              backgroundColor: color1,
            }}
          >
            {percentile1 !== null && (
              <span className="text-xs font-bold text-white drop-shadow-sm">
                {percentile1}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center label */}
      <div className="w-14 text-center">
        <span className={`text-sm font-bold ${tie ? 'text-accent' : 'text-text-secondary'}`}>
          {label}
        </span>
      </div>

      {/* Player 2 side */}
      <div className="flex-1 flex items-center gap-2">
        {/* Bar (left to right) */}
        <div className="flex-1 h-6 bg-[var(--color-stat-bar-bg)] rounded-sm overflow-hidden flex justify-start">
          <div
            className="h-full rounded-sm stat-bar-animated flex items-center justify-end pr-2"
            style={{
              width: `${Math.max(percentile2 || 0, 5)}%`,
              backgroundColor: color2,
            }}
          >
            {percentile2 !== null && (
              <span className="text-xs font-bold text-white drop-shadow-sm">
                {percentile2}%
              </span>
            )}
          </div>
        </div>

        {/* Value */}
        <div className={`w-16 text-left font-bold tabular-nums ${p2Wins ? 'text-text-primary' : 'text-text-muted'}`}>
          {formatStatValue(value2, stat.key)}
        </div>
      </div>
    </div>
  );
};

export default CompareStatBar;
