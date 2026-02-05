// PlayerCard component - Main stat card
// v1.2.0 | 2026-02-04

import React, { forwardRef, useMemo, useState } from 'react';
import StatCategory from './StatCategory';
import { getTeamData, getTeamLogoUrl, getPlayerHeadshotUrl } from '../utils/teamData';
import { enhanceHittingStats } from '../utils/api';

// Stat configurations for pitchers
const PITCHER_STATS = {
  volume: [
    { key: 'inningsPitched', label: 'IP', higherBetter: true },
    { key: 'strikeOuts', label: 'K', higherBetter: true },
  ],
  runPrevention: [
    { key: 'era', label: 'ERA', higherBetter: false },
    { key: 'whip', label: 'WHIP', higherBetter: false },
  ],
  dominance: [
    { key: 'strikeoutsPer9Inn', label: 'K/9', higherBetter: true },
  ],
  starting: [
    { key: 'wins', label: 'W', higherBetter: true },
    { key: 'losses', label: 'L', higherBetter: false },
    { key: 'gamesStarted', label: 'GS', higherBetter: true },
  ],
  contact: [
    { key: 'homeRuns', label: 'HR', higherBetter: false },
    { key: 'baseOnBalls', label: 'BB', higherBetter: false },
    { key: 'hits', label: 'H', higherBetter: false },
  ],
};

// Stat configurations for hitters
const HITTER_STATS = {
  batting: [
    { key: 'avg', label: 'AVG', higherBetter: true },
    { key: 'obp', label: 'OBP', higherBetter: true },
    { key: 'slg', label: 'SLG', higherBetter: true },
    { key: 'ops', label: 'OPS', higherBetter: true },
  ],
  power: [
    { key: 'homeRuns', label: 'HR', higherBetter: true },
    { key: 'extraBaseHits', label: 'XBH', higherBetter: true },
    { key: 'totalBases', label: 'TB', higherBetter: true },
  ],
  production: [
    { key: 'rbi', label: 'RBI', higherBetter: true },
    { key: 'runs', label: 'R', higherBetter: true },
    { key: 'hits', label: 'H', higherBetter: true },
  ],
  discipline: [
    { key: 'baseOnBalls', label: 'BB', higherBetter: true },
    { key: 'strikeOuts', label: 'K', higherBetter: false },
  ],
  speed: [
    { key: 'stolenBases', label: 'SB', higherBetter: true },
  ],
};

const PITCHER_CATEGORIES = [
  { key: 'volume', title: 'VOLUME' },
  { key: 'runPrevention', title: 'RUN PREVENTION' },
  { key: 'dominance', title: 'DOMINANCE' },
  { key: 'starting', title: 'STARTING' },
  { key: 'contact', title: 'CONTACT' },
];

const HITTER_CATEGORIES = [
  { key: 'batting', title: 'BATTING' },
  { key: 'power', title: 'POWER' },
  { key: 'production', title: 'RUN PRODUCTION' },
  { key: 'discipline', title: 'DISCIPLINE' },
  { key: 'speed', title: 'SPEED' },
];

// Player photo component with fallback
const PlayerPhoto = ({ playerId, playerName }) => {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-muted">
        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
    );
  }

  return (
    <img
      src={getPlayerHeadshotUrl(playerId)}
      alt={playerName}
      className="w-full h-full object-cover object-top"
      onError={() => setImgError(true)}
    />
  );
};

const PlayerCard = forwardRef(({ player, playerStats, leagueStats, season, isPitcher }, ref) => {
  const teamData = getTeamData(player.currentTeam?.name);
  const teamLogoUrl = getTeamLogoUrl(teamData.id);

  const statConfig = isPitcher ? PITCHER_STATS : HITTER_STATS;
  const categories = isPitcher ? PITCHER_CATEGORIES : HITTER_CATEGORIES;
  const totalPlayers = leagueStats?.length || 0;

  // Memoize enhanced player stats
  const enhancedPlayerStats = useMemo(() => {
    if (!playerStats) return null;
    if (!isPitcher && !playerStats.extraBaseHits) {
      return enhanceHittingStats(playerStats);
    }
    return playerStats;
  }, [playerStats, isPitcher]);

  return (
    <div
      ref={ref}
      className="relative bg-bg-card rounded-2xl overflow-hidden shadow-theme-xl theme-transition"
      style={{ minWidth: '900px' }}
    >
      <div className="relative flex">
        {/* Left Panel - Player Info */}
        <div className="w-80 p-6 flex flex-col bg-bg-elevated border-r border-border-light">
          {/* Team Logo */}
          <div className="mb-4 w-14 h-14">
            {teamLogoUrl && (
              <img
                src={teamLogoUrl}
                alt={teamData.abbr}
                className="w-14 h-14 object-contain opacity-90"
              />
            )}
          </div>

          {/* Player Photo */}
          <div className="w-full aspect-[4/5] bg-bg-tertiary rounded-xl mb-4 overflow-hidden">
            <PlayerPhoto playerId={player.id} playerName={player.fullName} />
          </div>

          {/* Player Name */}
          <h1 className="font-display text-4xl text-text-primary leading-none tracking-wide">
            {player.firstName?.toUpperCase()}
            <br />
            {player.lastName?.toUpperCase()}
          </h1>

          {/* Team Name */}
          <p className="text-sm text-text-muted mt-2 font-medium tracking-wide">
            {player.currentTeam?.name?.toUpperCase() || 'FREE AGENT'}
          </p>

          {/* Season Badge */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-text-muted font-medium">SEASON</span>
            <div className="flex items-center gap-1.5 bg-bg-tertiary px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-accent rounded-full" />
              <span className="text-text-primary font-bold text-sm">{season}</span>
            </div>
          </div>

          {/* Position */}
          <div className="mt-4">
            <span className="text-xs text-text-muted font-medium">POS </span>
            <span className="text-accent font-bold text-sm">
              {isPitcher ? 'STARTING PITCHER' : player.primaryPosition?.name?.toUpperCase() || player.primaryPosition?.abbreviation}
            </span>
          </div>

          {/* Physical Stats */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: 'BATS', value: player.batSide?.code },
              { label: 'THROWS', value: player.pitchHand?.code },
              { label: 'AGE', value: player.currentAge },
              { label: 'HT', value: player.height },
              { label: 'WT', value: player.weight ? `${player.weight}` : null },
            ].map(({ label, value }) => (
              <div key={label} className="bg-bg-tertiary px-3 py-1.5 rounded-lg">
                <span className="text-xs text-text-muted">{label} </span>
                <span className="text-text-primary font-bold text-xs">{value || '?'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Stats */}
        <div className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-3 border-b border-border-light">
            <div>
              <h2 className="font-display text-xl text-text-primary tracking-wide">
                {isPitcher ? 'PITCHER' : 'HITTER'} PERCENTILE RANKINGS
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted font-medium">SEASON {season}</span>
              <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded font-bold">
                {totalPlayers} QP
              </span>
            </div>
          </div>

          {/* Stat Categories */}
          <div className="space-y-1 stagger-children">
            {categories.map(cat => (
              <StatCategory
                key={cat.key}
                title={cat.title}
                stats={statConfig[cat.key]}
                playerStats={enhancedPlayerStats}
                leagueStats={leagueStats}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

PlayerCard.displayName = 'PlayerCard';

export default PlayerCard;
