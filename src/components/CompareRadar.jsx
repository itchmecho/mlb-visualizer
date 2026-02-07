// CompareRadar component - Overlaid radar charts for two players
// v1.0.0 | 2026-02-06

import React, { useMemo } from 'react';
import { getTeamData } from '../utils/teamData';

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 24;
const LABEL_RADIUS = RADIUS + 16;

// Same axis definitions as RadarChart but for comparison
const HITTER_AXES = [
  {
    label: 'Power',
    calc: (s) => {
      const hr = parseInt(s?.homeRuns, 10) || 0;
      const iso = parseFloat(s?.iso) || (parseFloat(s?.slg) - parseFloat(s?.avg)) || 0;
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
      return Math.min(((avg / 0.300) * 0.6 + ((1 - kRate) / 0.85) * 0.4) * 100, 100);
    },
  },
  {
    label: 'Speed',
    calc: (s) => {
      const sb = parseInt(s?.stolenBases, 10) || 0;
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
      return Math.min(((obp / 0.400) * 0.6 + (bbRate / 0.15) * 0.4) * 100, 100);
    },
  },
  {
    label: 'Production',
    calc: (s) => {
      const rbi = parseInt(s?.rbi, 10) || 0;
      const runs = parseInt(s?.runs, 10) || 0;
      return Math.min(((rbi / 120) * 0.5 + (runs / 100) * 0.5) * 100, 100);
    },
  },
];

const PITCHER_AXES = [
  {
    label: 'Strikeouts',
    calc: (s) => {
      const k9 = parseFloat(s?.strikeoutsPer9Inn) || 0;
      return Math.min((k9 / 12) * 100, 100);
    },
  },
  {
    label: 'Control',
    calc: (s) => {
      const bb9 = parseFloat(s?.walksPer9Inn) || 0;
      return Math.min(Math.max((1 - (bb9 - 1.5) / 3.5) * 100, 0), 100);
    },
  },
  {
    label: 'Durability',
    calc: (s) => {
      const ip = parseFloat(s?.inningsPitched) || 0;
      return Math.min((ip / 200) * 100, 100);
    },
  },
  {
    label: 'Ground Ball',
    calc: (s) => {
      const gb = parseFloat(s?.groundOutsToAirouts) || 0;
      return Math.min((gb / 2.0) * 100, 100);
    },
  },
  {
    label: 'Prevention',
    calc: (s) => {
      const era = parseFloat(s?.era) || 0;
      return Math.min(Math.max((1 - (era - 2.0) / 4.0) * 100, 0), 100);
    },
  },
];

const getPoint = (index, total, value) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const r = (value / 100) * RADIUS;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
};

const getLabelPoint = (index, total) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER + LABEL_RADIUS * Math.cos(angle),
    y: CENTER + LABEL_RADIUS * Math.sin(angle),
  };
};

const CompareRadar = ({ player1, player2, stats1, stats2, isPitcher }) => {
  const axes = isPitcher ? PITCHER_AXES : HITTER_AXES;
  const n = axes.length;

  const team1Data = getTeamData(player1?.currentTeam?.name);
  const team2Data = getTeamData(player2?.currentTeam?.name);
  const color1 = team1Data.primary;
  const color2 = team2Data.primary;

  const { polygon1, polygon2, gridPolygons } = useMemo(() => {
    if (!stats1 || !stats2) {
      return { polygon1: '', polygon2: '', gridPolygons: [] };
    }

    const vals1 = axes.map(axis => Math.max(axis.calc(stats1), 5));
    const vals2 = axes.map(axis => Math.max(axis.calc(stats2), 5));

    const pts1 = vals1.map((v, i) => getPoint(i, n, v));
    const pts2 = vals2.map((v, i) => getPoint(i, n, v));

    const grids = [20, 40, 60, 80, 100].map(level => {
      const gridPts = Array.from({ length: n }, (_, i) => getPoint(i, n, level));
      return gridPts.map(p => `${p.x},${p.y}`).join(' ');
    });

    return {
      polygon1: pts1.map(p => `${p.x},${p.y}`).join(' '),
      polygon2: pts2.map(p => `${p.x},${p.y}`).join(' '),
      gridPolygons: grids,
    };
  }, [stats1, stats2, axes, n]);

  if (!stats1 || !stats2) return null;

  return (
    <div className="flex flex-col items-center">
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

        {/* Player 1 polygon */}
        {polygon1 && (
          <polygon
            points={polygon1}
            fill={color1}
            fillOpacity={0.15}
            stroke={color1}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )}

        {/* Player 2 polygon */}
        {polygon2 && (
          <polygon
            points={polygon2}
            fill={color2}
            fillOpacity={0.15}
            stroke={color2}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeDasharray="4 2"
          />
        )}

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
              style={{ fontSize: '9px', fontFamily: 'DM Sans, system-ui, sans-serif' }}
            >
              {axis.label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-[2px] rounded-full" style={{ backgroundColor: color1 }} />
          <span className="text-xs text-text-muted">{player1?.lastName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-[2px] rounded-full" style={{ backgroundColor: color2, borderStyle: 'dashed' }} />
          <span className="text-xs text-text-muted">{player2?.lastName}</span>
        </div>
      </div>
    </div>
  );
};

export default CompareRadar;
