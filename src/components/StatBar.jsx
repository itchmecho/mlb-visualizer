// StatBar component - Individual stat row with colored bar
// v1.2.0 | 2026-02-04

import React from 'react';
import { getPercentileColor } from '../utils/percentile';

const StatBar = ({ label, value, percentile }) => {
  const color = getPercentileColor(percentile);
  const barWidth = Math.max(percentile || 0, 5);

  return (
    <div className="flex items-center gap-3 py-1.5">
      {/* Stat Label */}
      <div className="w-14 text-sm font-bold text-text-secondary tracking-wide">
        {label}
      </div>

      {/* Stat Bar */}
      <div className="flex-1 h-7 bg-[var(--color-stat-bar-bg)] rounded overflow-hidden relative">
        <div
          className="h-full rounded stat-bar-animated flex items-center"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
          }}
        >
          {/* Value inside bar */}
          <span
            className="absolute text-sm font-bold text-white drop-shadow-sm tabular-nums"
            style={{
              left: `${Math.min(barWidth, 90)}%`,
              transform: 'translateX(-50%)',
              paddingLeft: barWidth < 15 ? '1rem' : 0,
            }}
          >
            {value}
          </span>
        </div>
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
