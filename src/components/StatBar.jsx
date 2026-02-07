// StatBar component - Individual stat row with colored bar
// v1.4.0 | 2026-02-06

import React from 'react';
import { getPercentileColor } from '../utils/percentile';
import { getStatDescription } from '../utils/statDescriptions';

const StatBar = ({ label, value, percentile, statKey }) => {
  const color = getPercentileColor(percentile);
  const barWidth = Math.max(percentile || 0, 5);
  const tooltip = getStatDescription(statKey);

  return (
    <div className="flex items-center gap-3 py-1.5">
      {/* Stat Label with tooltip */}
      <div className="w-14 text-sm font-bold text-text-secondary tracking-wide relative group">
        <span className="cursor-help border-b border-dotted border-text-muted/50">
          {label}
        </span>
        {tooltip && (
          <div className="absolute left-0 bottom-full mb-2 px-3 py-2 bg-bg-elevated border border-border rounded-lg shadow-lg text-xs text-text-primary font-normal tracking-normal whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
            {tooltip}
            <div className="absolute left-3 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-border" />
          </div>
        )}
      </div>

      {/* Stat Bar */}
      <div className="flex-1 h-7 bg-[var(--color-stat-bar-bg)] rounded relative">
        <div
          className="h-full rounded stat-bar-animated flex items-center justify-end pr-2"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
          }}
        >
          {barWidth >= 15 && (
            <span className="text-sm font-bold text-white drop-shadow-sm tabular-nums whitespace-nowrap">
              {value}
            </span>
          )}
        </div>
        {barWidth < 15 && (
          <span
            className="absolute top-1/2 -translate-y-1/2 text-sm font-bold text-text-primary drop-shadow-sm tabular-nums whitespace-nowrap"
            style={{ left: `${barWidth + 1}%` }}
          >
            {value}
          </span>
        )}
      </div>

      {/* Percentile Badge */}
      <div
        className="w-14 text-sm font-bold text-center py-1 px-2 rounded-full transition-colors"
        style={{
          backgroundColor: percentile !== null ? `${color}20` : 'transparent',
          color: percentile !== null ? color : 'var(--color-text-muted)',
          border: `1px solid ${percentile !== null ? `${color}40` : 'transparent'}`,
        }}
      >
        {percentile !== null ? `${percentile}%` : '-'}
      </div>
    </div>
  );
};

export default StatBar;
