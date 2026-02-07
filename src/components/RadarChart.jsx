// RadarChart component - Pentagon/hexagon player profile visualization
// v1.0.0 | 2026-02-06

import React, { useMemo } from 'react';

const SIZE = 120;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 16;
const LABEL_RADIUS = RADIUS + 12;

// Hitter radar categories with composite stat calculations
const HITTER_AXES = [
  {
    label: 'Power',
    calc: (s) => {
      const hr = parseInt(s?.homeRuns, 10) || 0;
      const iso = parseFloat(s?.iso) || (parseFloat(s?.slg) - parseFloat(s?.avg)) || 0;
      // Normalize: 40 HR / .300 ISO = 100%
      return Math.min(((hr / 40) * 0.5 + (iso / 0.300) * 0.5) * 100, 100);
    },
  },
  {
    label: 'Contact',
    calc: (s) => {
      const avg = parseFloat(s?.avg) || 0;
      const so = parseInt(s?.strikeOuts, 10) || 0;
      const pa = parseInt(s?.plateAppearances, 10) || 1;
      const kRate = so / pa;
      // Normalize: .300 AVG + low K rate = 100%
      return Math.min(((avg / 0.300) * 0.6 + ((1 - kRate) / 0.85) * 0.4) * 100, 100);
    },
  },
  {
    label: 'Speed',
    calc: (s) => {
      const sb = parseInt(s?.stolenBases, 10) || 0;
      // Normalize: 40 SB = 100%
      return Math.min((sb / 40) * 100, 100);
    },
  },
  {
    label: 'Discipline',
    calc: (s) => {
      const bb = parseInt(s?.baseOnBalls, 10) || 0;
      const pa = parseInt(s?.plateAppearances, 10) || 1;
      const obp = parseFloat(s?.obp) || 0;
      const bbRate = bb / pa;
      // Normalize: .400 OBP + high walk rate = 100%
      return Math.min(((obp / 0.400) * 0.6 + (bbRate / 0.15) * 0.4) * 100, 100);
    },
  },
  {
    label: 'Production',
    calc: (s) => {
      const rbi = parseInt(s?.rbi, 10) || 0;
      const runs = parseInt(s?.runs, 10) || 0;
      // Normalize: 120 RBI + 100 R = 100%
      return Math.min(((rbi / 120) * 0.5 + (runs / 100) * 0.5) * 100, 100);
    },
  },
];

// Pitcher radar categories
const PITCHER_AXES = [
  {
    label: 'Strikeouts',
    calc: (s) => {
      const k9 = parseFloat(s?.strikeoutsPer9Inn) || 0;
      // Normalize: 12 K/9 = 100%
      return Math.min((k9 / 12) * 100, 100);
    },
  },
  {
    label: 'Control',
    calc: (s) => {
      const bb9 = parseFloat(s?.walksPer9Inn) || 0;
      // Lower is better, normalize: 1.5 BB/9 = 100%, 5+ = 0%
      return Math.min(Math.max((1 - (bb9 - 1.5) / 3.5) * 100, 0), 100);
    },
  },
  {
    label: 'Durability',
    calc: (s) => {
      const ip = parseFloat(s?.inningsPitched) || 0;
      // Normalize: 200 IP = 100%
      return Math.min((ip / 200) * 100, 100);
    },
  },
  {
    label: 'Ground Ball',
    calc: (s) => {
      const gb = parseFloat(s?.groundOutsToAirouts) || 0;
      // Normalize: 2.0 GO/AO = 100%
      return Math.min((gb / 2.0) * 100, 100);
    },
  },
  {
    label: 'Prevention',
    calc: (s) => {
      const era = parseFloat(s?.era) || 0;
      // Lower is better, normalize: ERA 2.0 = 100%, 6.0+ = 0%
      return Math.min(Math.max((1 - (era - 2.0) / 4.0) * 100, 0), 100);
    },
  },
];

// Get point on radar at angle and distance
const getPoint = (index, total, value) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const r = (value / 100) * RADIUS;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
};

// Get label position (slightly outside the radar)
const getLabelPoint = (index, total) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER + LABEL_RADIUS * Math.cos(angle),
    y: CENTER + LABEL_RADIUS * Math.sin(angle),
  };
};

const RadarChart = ({ playerStats, isPitcher, teamColor }) => {
  const axes = isPitcher ? PITCHER_AXES : HITTER_AXES;
  const n = axes.length;

  const { values, polygon, gridPolygons } = useMemo(() => {
    if (!playerStats) {
      return { values: [], polygon: '', gridPolygons: [] };
    }

    // Calculate values for each axis
    const vals = axes.map(axis => Math.max(axis.calc(playerStats), 5));

    // Build data polygon
    const pts = vals.map((v, i) => getPoint(i, n, v));
    const poly = pts.map(p => `${p.x},${p.y}`).join(' ');

    // Build concentric grid polygons (20%, 40%, 60%, 80%, 100%)
    const grids = [20, 40, 60, 80, 100].map(level => {
      const gridPts = Array.from({ length: n }, (_, i) => getPoint(i, n, level));
      return gridPts.map(p => `${p.x},${p.y}`).join(' ');
    });

    return { values: vals, polygon: poly, gridPolygons: grids };
  }, [playerStats, axes, n]);

  if (!playerStats) return null;

  const fillColor = teamColor || 'var(--color-accent)';

  return (
    <div className="flex-shrink-0">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="overflow-visible"
      >
        {/* Grid lines */}
        {gridPolygons.map((poly, i) => (
          <polygon
            key={i}
            points={poly}
            fill="none"
            stroke="var(--color-border-light)"
            strokeWidth={0.5}
          />
        ))}

        {/* Axis lines */}
        {Array.from({ length: n }, (_, i) => {
          const pt = getPoint(i, n, 100);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={pt.x}
              y2={pt.y}
              stroke="var(--color-border-light)"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Data polygon */}
        {polygon && (
          <polygon
            points={polygon}
            fill={fillColor}
            fillOpacity={0.15}
            stroke={fillColor}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {values.map((v, i) => {
          const pt = getPoint(i, n, v);
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={2}
              fill={fillColor}
            />
          );
        })}

        {/* Labels */}
        {axes.map((axis, i) => {
          const pt = getLabelPoint(i, n);
          return (
            <text
              key={i}
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-text-muted"
              style={{ fontSize: '7px', fontFamily: 'DM Sans, system-ui, sans-serif' }}
            >
              {axis.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default RadarChart;
