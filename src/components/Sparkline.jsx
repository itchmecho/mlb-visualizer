// Sparkline component - Inline SVG line chart with draw-in animation
// v1.0.0 | 2026-02-06

import React, { useMemo, useRef, useEffect, useState } from 'react';

const CHART_WIDTH = 160;
const CHART_HEIGHT = 48;
const PADDING_X = 12;
const PADDING_Y = 8;
const DOT_RADIUS = 2.5;

// Format a value for display in the sparkline label
const formatSparklineValue = (value, key) => {
  if (value === undefined || value === null) return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return '-';

  if (['avg', 'obp', 'slg', 'iso'].includes(key)) {
    return num.toFixed(3).replace(/^0/, '');
  }
  if (['ops'].includes(key)) {
    return num.toFixed(3);
  }
  if (['era', 'whip'].includes(key)) {
    return num.toFixed(2);
  }
  return Math.round(num).toString();
};

const Sparkline = ({ data, label, statKey, color, teamColor }) => {
  const pathRef = useRef(null);
  const [animated, setAnimated] = useState(false);

  // Process data points
  const { points, pathD, latestValue, minVal, maxVal } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], pathD: '', latestValue: null, minVal: 0, maxVal: 0 };
    }

    const values = data.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
    if (values.length === 0) {
      return { points: [], pathD: '', latestValue: null, minVal: 0, maxVal: 0 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const drawWidth = CHART_WIDTH - PADDING_X * 2;
    const drawHeight = CHART_HEIGHT - PADDING_Y * 2;

    const pts = data.map((d, i) => {
      const val = parseFloat(d.value);
      if (isNaN(val)) return null;
      const x = PADDING_X + (i / (data.length - 1 || 1)) * drawWidth;
      const y = PADDING_Y + drawHeight - ((val - min) / range) * drawHeight;
      return { x, y, value: val, season: d.season };
    }).filter(Boolean);

    // Build SVG path
    let d = '';
    pts.forEach((pt, i) => {
      if (i === 0) {
        d += `M ${pt.x} ${pt.y}`;
      } else {
        d += ` L ${pt.x} ${pt.y}`;
      }
    });

    return {
      points: pts,
      pathD: d,
      latestValue: data[data.length - 1]?.value,
      minVal: min,
      maxVal: max,
    };
  }, [data]);

  // Trigger draw-in animation
  useEffect(() => {
    if (!pathRef.current || !pathD) return;
    const path = pathRef.current;
    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;

    // Small delay for stagger effect
    const timer = requestAnimationFrame(() => {
      path.style.transition = 'stroke-dashoffset 0.8s ease-out';
      path.style.strokeDashoffset = '0';
      setAnimated(true);
    });

    return () => cancelAnimationFrame(timer);
  }, [pathD]);

  if (!data || data.length < 2) return null;

  const lineColor = teamColor || color || 'var(--color-accent)';

  return (
    <div className="flex flex-col">
      {/* Label + Current Value */}
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-text-muted font-medium">{label}</span>
        <span className="text-sm font-bold text-text-primary tabular-nums">
          {formatSparklineValue(latestValue, statKey)}
        </span>
      </div>

      {/* SVG Chart */}
      <svg
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="overflow-visible"
      >
        {/* Line */}
        <path
          ref={pathRef}
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots at data points */}
        {animated && points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={DOT_RADIUS}
            fill={lineColor}
            className="animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}

        {/* End dot (larger, latest value) */}
        {animated && points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={DOT_RADIUS + 1}
            fill={lineColor}
            stroke="var(--color-bg-card)"
            strokeWidth={1.5}
            className="animate-fade-in"
          />
        )}
      </svg>
    </div>
  );
};

// Sparkline grid for career tab - shows 3 key sparklines
export const SparklineGrid = ({ careerStats, isPitcher, teamColor }) => {
  const sparklineData = useMemo(() => {
    if (!careerStats || careerStats.length === 0) return [];

    // Filter to MLB only
    const mlbSeasons = careerStats
      .filter(split => split.sport?.id === 1 || split.sport?.abbreviation === 'MLB')
      .sort((a, b) => parseInt(a.season) - parseInt(b.season));

    if (mlbSeasons.length < 2) return [];

    const statKeys = isPitcher
      ? [
          { key: 'era', label: 'ERA' },
          { key: 'whip', label: 'WHIP' },
          { key: 'strikeOuts', label: 'K' },
        ]
      : [
          { key: 'avg', label: 'AVG' },
          { key: 'ops', label: 'OPS' },
          { key: 'homeRuns', label: 'HR' },
        ];

    return statKeys.map(({ key, label }) => ({
      label,
      statKey: key,
      data: mlbSeasons.map(split => ({
        season: split.season,
        value: split.stat?.[key],
      })),
    }));
  }, [careerStats, isPitcher]);

  if (sparklineData.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b border-border-light">
      {sparklineData.map(spark => (
        <Sparkline
          key={spark.statKey}
          data={spark.data}
          label={spark.label}
          statKey={spark.statKey}
          teamColor={teamColor}
        />
      ))}
    </div>
  );
};

export default Sparkline;
