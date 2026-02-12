// StatCategory component - Group of related stats
// v1.4.0 | 2026-02-11

import React from 'react';
import StatBar from './StatBar';
import { calculatePercentile, calculateMedian } from '../utils/percentile';
import { formatStatValue } from '../utils/formatStats';

const StatCategory = ({ title, stats, playerStats, leagueStats }) => {
  return (
    <div className="mb-5">
      {/* Category Header */}
      <h3 className="text-xs font-semibold text-text-secondary tracking-[0.15em] pl-3 py-1 border-l-2 border-accent/60 mb-3">
        {title}
      </h3>

      {/* Stat Rows */}
      <div className="space-y-1">
        {stats.map(stat => {
          const value = playerStats?.[stat.key];
          const leagueValues = leagueStats?.map(p => parseFloat(p[stat.key])).filter(v => !isNaN(v)) || [];
          const percentile = calculatePercentile(parseFloat(value), leagueValues, stat.higherBetter);
          const median = calculateMedian(leagueValues);
          const leagueMedian = median !== null ? formatStatValue(median, stat.key) : null;

          return (
            <StatBar
              key={stat.key}
              label={stat.label}
              statKey={stat.key}
              value={formatStatValue(value, stat.key)}
              percentile={percentile}
              leagueMedian={leagueMedian}
            />
          );
        })}
      </div>
    </div>
  );
};

export default StatCategory;
