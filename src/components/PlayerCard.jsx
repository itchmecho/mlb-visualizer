// PlayerCard component - Main stat card with tabbed interface
// v2.2.0 | 2026-02-09

import React, { forwardRef, useMemo, useState } from 'react';
import StatCategory from './StatCategory';
import CareerStats from './CareerStats';
import GameLog from './GameLog';
import { getTeamData, getTeamLogoUrl, getPlayerHeadshotUrl } from '../utils/teamData';
import { enhanceHittingStats } from '../utils/api';
import { PERCENTILE_COLORS } from '../utils/percentile';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'career', label: 'Career' },
  { key: 'gamelog', label: 'Game Log' },
];

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
    { key: 'strikeoutWalkRatio', label: 'K/BB', higherBetter: true },
  ],
  starting: [
    { key: 'wins', label: 'W', higherBetter: true },
    { key: 'losses', label: 'L', higherBetter: false },
    { key: 'gamesStarted', label: 'GS', higherBetter: true },
  ],
  contact: [
    { key: 'homeRunsPer9', label: 'HR/9', higherBetter: false },
    { key: 'walksPer9Inn', label: 'BB/9', higherBetter: false },
    { key: 'hitsPer9Inn', label: 'H/9', higherBetter: false },
  ],
};

// Stat configurations for hitters
const HITTER_STATS = {
  batting: [
    { key: 'avg', label: 'AVG', higherBetter: true },
    { key: 'obp', label: 'OBP', higherBetter: true },
    { key: 'slg', label: 'SLG', higherBetter: true },
    { key: 'ops', label: 'OPS', higherBetter: true },
    { key: 'babip', label: 'BABIP', higherBetter: true },
  ],
  power: [
    { key: 'homeRuns', label: 'HR', higherBetter: true },
    { key: 'extraBaseHits', label: 'XBH', higherBetter: true },
    { key: 'totalBases', label: 'TB', higherBetter: true },
    { key: 'iso', label: 'ISO', higherBetter: true },
  ],
  production: [
    { key: 'rbi', label: 'RBI', higherBetter: true },
    { key: 'runs', label: 'R', higherBetter: true },
    { key: 'hits', label: 'H', higherBetter: true },
  ],
  discipline: [
    { key: 'baseOnBalls', label: 'BB', higherBetter: true },
    { key: 'strikeOuts', label: 'K', higherBetter: false },
    { key: 'walkRate', label: 'BB%', higherBetter: true },
    { key: 'strikeoutRate', label: 'K%', higherBetter: false },
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

const PlayerCard = forwardRef(({ player, playerStats, leagueStats, season, isPitcher, onSelectTeam, standings, careerStats, gameLogData, splitData, onCareerSeasonChange }, ref) => {
  const [activeTab, setActiveTab] = useState('overview');

  const teamName = player.currentTeam?.name;
  const teamData = getTeamData(teamName);
  const teamLogoUrl = getTeamLogoUrl(teamData.id);
  const teamColor = teamData.primary;

  // Find the team's standings record for navigation
  const teamRecord = standings?.find(r => r.team?.id === player.currentTeam?.id) || null;

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
    >
      <div className="relative flex flex-col md:flex-row">
        {/* Left Panel - Player Info */}
        <div className="w-full md:w-80 p-4 md:p-6 flex flex-col bg-bg-elevated border-b md:border-b-0 md:border-r border-border-light">
          {/* Top section: horizontal on mobile, vertical on desktop */}
          <div className="flex items-start gap-4 md:block">
            {/* Photo + Logo group */}
            <div className="shrink-0">
              {/* Team Logo */}
              <div className="mb-2 md:mb-4 w-10 h-10 md:w-14 md:h-14">
                {teamLogoUrl && (
                  <img
                    src={teamLogoUrl}
                    alt={teamData.abbr}
                    className="w-10 h-10 md:w-14 md:h-14 object-contain team-logo"
                  />
                )}
              </div>

              {/* Player Photo */}
              <div className="w-28 aspect-[4/5] md:w-full bg-bg-tertiary rounded-xl md:mb-4 overflow-hidden">
                <PlayerPhoto playerId={player.id} playerName={player.fullName} />
              </div>
            </div>

            {/* Info group - beside photo on mobile, below on desktop */}
            <div className="flex-1 min-w-0">
              {/* Player Name */}
              <h1 className="font-display text-2xl md:text-4xl text-text-primary leading-none tracking-wide">
                {player.firstName?.toUpperCase()}
                <br />
                {player.lastName?.toUpperCase()}
              </h1>

              {/* Team Name */}
              {onSelectTeam && teamRecord ? (
                <button
                  onClick={() => onSelectTeam(teamRecord)}
                  className="text-sm text-text-muted mt-2 font-medium tracking-wide hover:text-accent hover:underline transition-colors inline-block cursor-pointer"
                >
                  {teamName?.toUpperCase() || 'FREE AGENT'}
                </button>
              ) : (
                <p className="text-sm text-text-muted mt-2 font-medium tracking-wide">
                  {teamName?.toUpperCase() || 'FREE AGENT'}
                </p>
              )}

              {/* Season Badge */}
              <div className="flex items-center gap-2 mt-3 md:mt-4">
                <span className="text-xs text-text-muted font-medium">SEASON</span>
                <div className="flex items-center gap-1.5 bg-bg-tertiary px-3 py-1 rounded-full">
                  <span className="w-2 h-2 bg-accent rounded-full" />
                  <span className="text-text-primary font-bold text-sm">{season}</span>
                </div>
              </div>

              {/* Position */}
              <div className="mt-3 md:mt-4">
                <span className="text-xs text-text-muted font-medium">POS </span>
                <span className="text-accent font-bold text-sm">
                  {isPitcher ? 'STARTING PITCHER' : player.primaryPosition?.name?.toUpperCase() || player.primaryPosition?.abbreviation}
                </span>
              </div>
            </div>
          </div>

          {/* Physical Stats - full width below */}
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

          {/* External Links */}
          <div className="mt-4 pt-4 border-t border-border-light">
            <span className="text-xs text-text-muted font-medium block mb-2">LEARN MORE</span>
            <div className="flex gap-2">
              <a
                href={`https://en.wikipedia.org/wiki/${player.fullName?.replace(/ /g, '_')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-bg-primary rounded-lg text-text-secondary hover:text-text-primary transition-colors text-xs font-medium"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801.111-.947-.07-.084-.305-.178-.705-.178h-.263c-.134 0-.2-.082-.2-.21v-.455l.052-.045h3.932l.054.045v.455c0 .119-.074.18-.22.18-.937.012-1.157.209-1.652 1.074 0 0-.869 1.68-1.876 3.727l.554 1.092 2.774-5.483c.289-.586.177-.793-.097-.895-.135-.054-.326-.086-.571-.086h-.093c-.148 0-.22-.07-.22-.195v-.46l.052-.045h3.933l.053.045v.455c0 .119-.074.18-.219.18-.937.012-1.157.209-1.652 1.074l-3.645 7.106c-.605 1.165-1.196 2.326-1.775 3.482-.493.988-.94.871-1.313.021-.688-1.561-1.381-3.124-2.073-4.687-.549 1.078-1.09 2.151-1.636 3.228-.493.989-.94.872-1.313.021-.456-1.042-4.08-8.323-4.08-8.323-.727-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037z"/>
                </svg>
                Wikipedia
              </a>
              <a
                href={`https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(player.fullName || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-bg-primary rounded-lg text-text-secondary hover:text-text-primary transition-colors text-xs font-medium"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Baseball Reference
              </a>
            </div>
          </div>
        </div>

        {/* Right Panel - Tabbed Content */}
        <div className="flex-1 flex flex-col">
          {/* Tab Bar */}
          <div className="flex border-b border-border-light px-6 pt-4">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-3 text-sm font-medium tracking-wide transition-colors ${
                  activeTab === tab.key
                    ? 'text-text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                    style={{ backgroundColor: teamColor }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="animate-fade-in">
                {/* Header */}
                <div className="flex items-start justify-between mb-6 pb-3 border-b border-border-light">
                  <div>
                    <h2 className="font-display text-xl text-text-primary tracking-wide">
                      {isPitcher ? 'PITCHER' : 'HITTER'} PERCENTILE RANKINGS
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted font-medium">SEASON {season}</span>
                    <span className="relative group text-xs px-2 py-1 bg-accent/10 text-accent rounded font-bold cursor-help">
                      {totalPlayers} QP
                      <span className="absolute bottom-full right-0 mb-2 w-48 px-3 py-2 bg-bg-elevated border border-border rounded-lg text-xs text-text-secondary font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
                        Qualified Players — percentiles are ranked against {totalPlayers} {isPitcher ? 'pitchers' : 'hitters'} with enough {isPitcher ? 'innings' : 'plate appearances'} to qualify
                      </span>
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

                {/* Inline Percentile Legend */}
                <div className="mt-4 pt-3 border-t border-border-light flex items-center gap-4 flex-wrap">
                  {[
                    { color: PERCENTILE_COLORS.elite, label: 'Elite' },
                    { color: PERCENTILE_COLORS.aboveAvg, label: 'Above Avg' },
                    { color: PERCENTILE_COLORS.average, label: 'Average' },
                    { color: PERCENTILE_COLORS.belowAvg, label: 'Below Avg' },
                    { color: PERCENTILE_COLORS.poor, label: 'Poor' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[11px] text-text-muted">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Career Tab */}
            {activeTab === 'career' && (
              <div className="animate-fade-in">
                <CareerStats
                  player={player}
                  careerStats={careerStats}
                  isPitcher={isPitcher}
                  teamColor={teamColor}
                />
              </div>
            )}

            {/* Game Log Tab */}
            {activeTab === 'gamelog' && (
              <div className="animate-fade-in">
                <GameLog
                  player={player}
                  gameLogData={gameLogData}
                  splitData={splitData}
                  isPitcher={isPitcher}
                  season={season}
                  teamColor={teamColor}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

PlayerCard.displayName = 'PlayerCard';

export default PlayerCard;
