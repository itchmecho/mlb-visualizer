// CompareView component - Head-to-head player comparison
// v2.0.0 | 2026-02-06

import React from 'react';
import CompareStatBar from './CompareStatBar';
import CompareRadar from './CompareRadar';
import { getTeamData, getTeamLogoUrl, getPlayerHeadshotUrl } from '../utils/teamData';
import { PERCENTILE_COLORS } from '../utils/percentile';

// Stat configurations
const PITCHER_STATS = [
  { key: 'inningsPitched', label: 'IP', higherBetter: true },
  { key: 'strikeOuts', label: 'K', higherBetter: true },
  { key: 'era', label: 'ERA', higherBetter: false },
  { key: 'whip', label: 'WHIP', higherBetter: false },
  { key: 'strikeoutsPer9Inn', label: 'K/9', higherBetter: true },
  { key: 'wins', label: 'W', higherBetter: true },
  { key: 'baseOnBalls', label: 'BB', higherBetter: false },
];

const HITTER_STATS = [
  { key: 'avg', label: 'AVG', higherBetter: true },
  { key: 'obp', label: 'OBP', higherBetter: true },
  { key: 'slg', label: 'SLG', higherBetter: true },
  { key: 'homeRuns', label: 'HR', higherBetter: true },
  { key: 'rbi', label: 'RBI', higherBetter: true },
  { key: 'runs', label: 'R', higherBetter: true },
  { key: 'stolenBases', label: 'SB', higherBetter: true },
  { key: 'strikeOuts', label: 'K', higherBetter: false },
];

// Player header component
const PlayerHeader = ({ player, stats, side, onSelectTeam, standings }) => {
  const teamData = getTeamData(player?.currentTeam?.name);
  const teamLogoUrl = getTeamLogoUrl(teamData.id);
  const teamRecord = standings?.find(r => r.team?.id === player?.currentTeam?.id) || null;

  const [imgError, setImgError] = React.useState(false);

  if (!player) {
    return (
      <div className={`flex-1 p-6 flex flex-col items-center justify-center ${side === 'left' ? 'border-r border-border-light' : ''}`}>
        <div className="w-24 h-24 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <p className="text-text-muted text-sm">Select a player</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 p-6 ${side === 'left' ? 'border-r border-border-light' : ''}`}>
      <div className={`flex flex-col items-center text-center`}>
        {/* Team logo */}
        {teamLogoUrl && (
          <img src={teamLogoUrl} alt="" className="w-10 h-10 object-contain mb-3 team-logo" />
        )}

        {/* Player photo */}
        <div className="w-28 h-28 rounded-full overflow-hidden bg-bg-tertiary mb-4 ring-4 ring-bg-elevated">
          {!imgError ? (
            <img
              src={getPlayerHeadshotUrl(player.id)}
              alt={player.fullName}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted">
              <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Player name */}
        <h2 className="font-display text-3xl text-text-primary tracking-wide">
          {player.firstName?.toUpperCase()} {player.lastName?.toUpperCase()}
        </h2>

        {/* Team and position */}
        <p className="text-text-muted text-sm mt-1">
          {onSelectTeam && teamRecord ? (
            <button
              onClick={() => onSelectTeam(teamRecord)}
              className="hover:text-accent hover:underline transition-colors cursor-pointer"
            >
              {player.currentTeam?.name || 'Free Agent'}
            </button>
          ) : (
            player.currentTeam?.name || 'Free Agent'
          )} • {player.primaryPosition?.abbreviation}
        </p>

        {/* Quick stats */}
        {stats && (
          <div className="flex gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary">
                {stats.gamesPlayed || stats.gamesPitched || '-'}
              </div>
              <div className="text-xs text-text-muted uppercase">Games</div>
            </div>
            {stats.avg !== undefined ? (
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {parseFloat(stats.avg).toFixed(3).replace(/^0/, '')}
                </div>
                <div className="text-xs text-text-muted uppercase">AVG</div>
              </div>
            ) : stats.era !== undefined ? (
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {parseFloat(stats.era).toFixed(2)}
                </div>
                <div className="text-xs text-text-muted uppercase">ERA</div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

const CompareView = ({ player1, player2, stats1, stats2, leagueStats, isPitcher, season, onSelectTeam, standings }) => {
  const statsConfig = isPitcher ? PITCHER_STATS : HITTER_STATS;

  return (
    <div className="bg-bg-card rounded-2xl shadow-theme-xl overflow-hidden theme-transition animate-fade-in">
      {/* Header */}
      <div className="bg-bg-elevated px-6 py-4 border-b border-border-light">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-text-primary tracking-wide">
            HEAD TO HEAD
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">{season} Season</span>
            <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-bold rounded">
              {isPitcher ? 'PITCHERS' : 'HITTERS'}
            </span>
          </div>
        </div>
      </div>

      {/* Player headers */}
      <div className="flex border-b border-border-light">
        <PlayerHeader player={player1} stats={stats1} side="left" onSelectTeam={onSelectTeam} standings={standings} />
        <PlayerHeader player={player2} stats={stats2} side="right" onSelectTeam={onSelectTeam} standings={standings} />
      </div>

      {/* VS Divider */}
      <div className="relative py-2 bg-bg-elevated border-b border-border-light">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-text-inverse font-display text-xl px-4 py-1 rounded-full">
          VS
        </div>
      </div>

      {/* Radar Overlay */}
      <div className="flex justify-center py-4 border-b border-border-light">
        <CompareRadar
          player1={player1}
          player2={player2}
          stats1={stats1}
          stats2={stats2}
          isPitcher={isPitcher}
        />
      </div>

      {/* Stats comparison */}
      <div className="p-6">
        <div className="stagger-children">
          {statsConfig.map(stat => (
            <CompareStatBar
              key={stat.key}
              label={stat.label}
              stat={stat}
              player1Stats={stats1}
              player2Stats={stats2}
              leagueStats={leagueStats}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-bg-tertiary border-t border-border-light flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
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
        <span className="text-[11px] text-text-muted">
          vs {leagueStats?.length || 0} qualified {isPitcher ? 'pitchers' : 'hitters'}
        </span>
      </div>
    </div>
  );
};

export default CompareView;
