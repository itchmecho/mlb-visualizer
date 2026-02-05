// StatCategory component - Group of related stats
// v1.2.0 | 2026-02-04

import React from 'react';
import StatBar from './StatBar';
import { calculatePercentile } from '../utils/percentile';

// Format stat value for display
const formatStatValue = (value, statKey) => {
  if (value === undefined || value === null) return '-';

  const decimalStats = [
    'avg', 'obp', 'slg', 'ops', 'era', 'whip', 'iso',
    'strikeoutsPer9Inn', 'walksPer9Inn', 'homeRunsPer9', 'strikeoutWalkRatio'
  ];

  if (decimalStats.includes(statKey)) {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';

    // Batting average style stats (show .XXX)
    if (['avg', 'obp', 'slg', 'iso'].includes(statKey)) {
      return num.toFixed(3).replace(/^0/, '');
    }
    // OPS can be over 1.000
    if (statKey === 'ops') {
      return num.toFixed(3);
    }
    return num.toFixed(2);
  }

  return value.toString();
};

const StatCategory = ({ title, stats, playerStats, leagueStats }) => {
  return (
    <div className="mb-5">
      {/* Category Header */}
      <h3 className="text-xs font-bold text-text-muted tracking-[0.2em] mb-3 pb-2 border-b border-border-light">
        {title}
      </h3>

      {/* Stat Rows */}
      <div className="space-y-1">
        {stats.map(stat => {
          const value = playerStats?.[stat.key];
          const leagueValues = leagueStats?.map(p => parseFloat(p[stat.key])).filter(v => !isNaN(v)) || [];
          const percentile = calculatePercentile(parseFloat(value), leagueValues, stat.higherBetter);

          return (
            <StatBar
              key={stat.key}
              label={stat.label}
              value={formatStatValue(value, stat.key)}
              percentile={percentile}
            />
          );
        })}
      </div>
    </div>
  );
};

export default StatCategory;
