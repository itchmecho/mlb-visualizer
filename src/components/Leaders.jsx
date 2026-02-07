// League Leaders Dashboard
// v1.0.0 | 2026-02-06

import React, { useState, useEffect, useRef } from 'react';
import { fetchLeaders } from '../utils/api';
import { getTeamData, getTeamLogoUrl, getPlayerHeadshotUrl } from '../utils/teamData';

// Stat categories for hitting leaders
const HITTING_CATEGORIES = [
  { key: 'battingAverage', label: 'AVG', format: 'decimal3' },
  { key: 'homeRuns', label: 'HR', format: 'integer' },
  { key: 'runsBattedIn', label: 'RBI', format: 'integer' },
  { key: 'onBasePlusSlugging', label: 'OPS', format: 'decimal3' },
  { key: 'stolenBases', label: 'SB', format: 'integer' },
  { key: 'hits', label: 'H', format: 'integer' },
];

// Stat categories for pitching leaders
const PITCHING_CATEGORIES = [
  { key: 'earnedRunAverage', label: 'ERA', format: 'decimal2' },
  { key: 'strikeouts', label: 'K', format: 'integer' },
  { key: 'wins', label: 'W', format: 'integer' },
  { key: 'walksAndHitsPerInningPitched', label: 'WHIP', format: 'decimal2' },
  { key: 'saves', label: 'SV', format: 'integer' },
  { key: 'inningsPitched', label: 'IP', format: 'decimal1' },
];

const formatValue = (value, format) => {
  if (value === undefined || value === null) return '-';
  if (format === 'decimal3') {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return num < 1 ? num.toFixed(3).replace(/^0/, '') : num.toFixed(3);
  }
  if (format === 'decimal2') return parseFloat(value).toFixed(2);
  if (format === 'decimal1') return parseFloat(value).toFixed(1);
  return value.toString();
};

// Individual leader card
const LeaderCard = ({ category, leaders, expanded, onToggle, onPlayerClick }) => {
  const topLeaders = expanded ? leaders : leaders.slice(0, 5);

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden theme-transition">
      {/* Card Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-bg-elevated/50 hover:bg-bg-elevated transition-colors cursor-pointer"
      >
        <h3 className="font-display text-lg tracking-wide text-text-primary">{category.label}</h3>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Leaders List */}
      <div className="divide-y divide-border-light/50">
        {topLeaders.map((leader, idx) => {
          const person = leader.person || {};
          const team = leader.team || person.currentTeam || {};
          const teamData = getTeamData(team.name);
          const rank = leader.rank || idx + 1;

          return (
            <div
              key={person.id || idx}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-tertiary/50 transition-colors cursor-pointer group"
              onClick={() => onPlayerClick?.(person)}
            >
              {/* Rank */}
              <span className={`font-display text-xl w-7 text-center ${
                rank <= 3 ? 'text-accent' : 'text-text-muted'
              }`}>
                {rank}
              </span>

              {/* Player Photo */}
              <div className="w-8 h-8 rounded-full bg-bg-tertiary overflow-hidden flex-shrink-0">
                {person.id && (
                  <img
                    src={getPlayerHeadshotUrl(person.id)}
                    alt={person.fullName}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </div>

              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                  {person.fullName || 'Unknown'}
                </div>
                <div className="flex items-center gap-1.5">
                  {teamData.id && (
                    <img
                      src={getTeamLogoUrl(teamData.id)}
                      alt={teamData.abbr}
                      className="w-3.5 h-3.5 object-contain"
                    />
                  )}
                  <span className="text-xs text-text-muted">{teamData.abbr}</span>
                </div>
              </div>

              {/* Stat Value */}
              <span className="text-sm font-bold text-text-primary tabular-nums">
                {formatValue(leader.value, category.format)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Expand/Collapse Footer */}
      {leaders.length > 5 && (
        <button
          onClick={onToggle}
          className="w-full px-4 py-2 text-xs text-text-muted hover:text-accent transition-colors text-center bg-bg-tertiary/30"
        >
          {expanded ? 'Show less' : `Show top ${leaders.length}`}
        </button>
      )}
    </div>
  );
};

const Leaders = ({ season, onPlayerClick }) => {
  const [activeGroup, setActiveGroup] = useState('hitting');
  const [leadersData, setLeadersData] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState({});
  const abortRef = useRef(null);

  const categories = activeGroup === 'hitting' ? HITTING_CATEGORIES : PITCHING_CATEGORIES;

  // Fetch all leader categories
  useEffect(() => {
    const fetchAllLeaders = async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setLeadersData({});
      setExpandedCards({});

      try {
        const results = await Promise.all(
          categories.map(cat =>
            fetchLeaders(cat.key, season, activeGroup, 20, controller.signal)
              .then(data => ({ key: cat.key, data }))
          )
        );

        if (!controller.signal.aborted) {
          const dataMap = {};
          results.forEach(r => { dataMap[r.key] = r.data; });
          setLeadersData(dataMap);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load leaders:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchAllLeaders();
    return () => abortRef.current?.abort();
  }, [season, activeGroup]);

  const toggleExpand = (key) => {
    setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="font-display text-5xl md:text-6xl text-text-primary tracking-wide mb-3">
          {season} LEADERS
        </h2>
        <p className="text-text-muted text-lg">Top performers across the league</p>
      </div>

      {/* Hitting / Pitching Toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-bg-tertiary rounded-lg p-1 border border-border theme-transition">
          <button
            onClick={() => setActiveGroup('hitting')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
              activeGroup === 'hitting'
                ? 'bg-accent text-text-inverse shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Hitting
          </button>
          <button
            onClick={() => setActiveGroup('pitching')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
              activeGroup === 'pitching'
                ? 'bg-accent text-text-inverse shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Pitching
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.key} className="bg-bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-bg-elevated/50">
                <div className="skeleton-shimmer bg-bg-tertiary h-5 w-16 rounded" />
              </div>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-border-light/50">
                  <div className="skeleton-shimmer bg-bg-tertiary w-7 h-6 rounded" />
                  <div className="skeleton-shimmer bg-bg-tertiary w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <div className="skeleton-shimmer bg-bg-tertiary h-4 w-28 rounded mb-1" />
                    <div className="skeleton-shimmer bg-bg-tertiary h-3 w-12 rounded" />
                  </div>
                  <div className="skeleton-shimmer bg-bg-tertiary h-4 w-12 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Leader Cards Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <LeaderCard
              key={cat.key}
              category={cat}
              leaders={leadersData[cat.key] || []}
              expanded={expandedCards[cat.key]}
              onToggle={() => toggleExpand(cat.key)}
              onPlayerClick={onPlayerClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Leaders;
