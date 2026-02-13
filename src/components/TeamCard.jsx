// TeamCard component - Team detail card with stats
// v1.3.0 | 2026-02-12

import React, { useState, useEffect } from 'react';
import StatCategory from './StatCategory';
import TeamRoster from './TeamRoster';
import { getTeamData, getTeamLogoUrl, getTeamMlbUrl, TEAM_DATA } from '../utils/teamData';

// Team hitting stat categories
const TEAM_HITTING_STATS = {
  batting: [
    { key: 'avg', label: 'AVG', higherBetter: true },
    { key: 'obp', label: 'OBP', higherBetter: true },
    { key: 'slg', label: 'SLG', higherBetter: true },
    { key: 'ops', label: 'OPS', higherBetter: true },
  ],
  production: [
    { key: 'homeRuns', label: 'HR', higherBetter: true },
    { key: 'runs', label: 'R', higherBetter: true },
    { key: 'rbi', label: 'RBI', higherBetter: true },
    { key: 'hits', label: 'H', higherBetter: true },
  ],
  discipline: [
    { key: 'stolenBases', label: 'SB', higherBetter: true },
    { key: 'baseOnBalls', label: 'BB', higherBetter: true },
    { key: 'strikeOuts', label: 'K', higherBetter: false },
  ],
};

const TEAM_HITTING_CATEGORIES = [
  { key: 'batting', title: 'BATTING' },
  { key: 'production', title: 'PRODUCTION' },
  { key: 'discipline', title: 'DISCIPLINE & SPEED' },
];

// Team pitching stat categories
const TEAM_PITCHING_STATS = {
  runPrevention: [
    { key: 'era', label: 'ERA', higherBetter: false },
    { key: 'whip', label: 'WHIP', higherBetter: false },
  ],
  dominance: [
    { key: 'strikeOuts', label: 'K', higherBetter: true },
    { key: 'strikeoutsPer9Inn', label: 'K/9', higherBetter: true },
    { key: 'walksPer9Inn', label: 'BB/9', higherBetter: false },
  ],
  bullpen: [
    { key: 'saves', label: 'SV', higherBetter: true },
    { key: 'holds', label: 'HLD', higherBetter: true },
  ],
  hitPrevention: [
    { key: 'hitsPer9Inn', label: 'H/9', higherBetter: false },
    { key: 'homeRunsPer9', label: 'HR/9', higherBetter: false },
  ],
};

const TEAM_PITCHING_CATEGORIES = [
  { key: 'runPrevention', title: 'RUN PREVENTION' },
  { key: 'dominance', title: 'DOMINANCE' },
  { key: 'bullpen', title: 'BULLPEN' },
  { key: 'hitPrevention', title: 'HIT PREVENTION' },
];

// Find team name by ID from TEAM_DATA
const getTeamNameById = (teamId) => {
  for (const [name, data] of Object.entries(TEAM_DATA)) {
    if (data.id === teamId) return name;
  }
  return null;
};

const TeamCard = ({ team, season, latestSeason, hittingStats, pitchingStats, allTeamHitting, allTeamPitching, onBack, roster, rosterLoading, onPlayerClick, onRosterTypeChange }) => {
  const teamName = team.team?.name || 'Unknown';
  const teamId = team.team?.id;
  const teamData = getTeamData(teamName);

  // Roster type toggle — offseason defaults to current (40Man), in-season defaults to season (fullSeason)
  const isOffseason = season === latestSeason && new Date().getMonth() < 3;
  const isCurrentSeason = season === latestSeason;
  const [rosterType, setRosterType] = useState(isOffseason ? '40Man' : 'fullSeason');

  // Auto-fetch current roster on mount if offseason
  useEffect(() => {
    if (isOffseason && onRosterTypeChange) {
      onRosterTypeChange('40Man');
    }
  }, [teamId]);

  const handleRosterToggle = (type) => {
    if (type === rosterType) return;
    setRosterType(type);
    onRosterTypeChange?.(type);
  };
  const teamLogoUrl = getTeamLogoUrl(teamId);
  const teamMlbUrl = getTeamMlbUrl(teamName);

  const wins = team.wins || 0;
  const losses = team.losses || 0;
  const pct = team.winningPercentage || '.000';
  const runDiff = team.runDifferential || 0;
  const divisionName = team.team?.division?.name || '';

  // Lookup Wikipedia name (some teams need special handling)
  const wikiName = teamName.replace(/ /g, '_');

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 px-4 py-2 bg-bg-tertiary hover:bg-bg-elevated border border-border rounded-lg text-text-secondary hover:text-text-primary font-medium transition-all theme-transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Standings
      </button>

      <div
        className="relative bg-bg-card rounded-2xl overflow-hidden shadow-theme-xl theme-transition"
      >
        <div className="relative flex flex-col md:flex-row">
          {/* Left Panel - Team Info */}
          <div className="w-full md:w-80 p-6 flex flex-col bg-bg-elevated border-b md:border-b-0 md:border-r border-border-light">
            {/* Team color bar */}
            <div
              className="w-full h-2 rounded-full mb-6"
              style={{ background: `linear-gradient(to right, ${teamData.primary}, ${teamData.secondary})` }}
            />

            {/* Team Logo */}
            <div className="w-32 h-32 mx-auto mb-6">
              {teamLogoUrl && (
                <img
                  src={teamLogoUrl}
                  alt={teamName}
                  className="w-32 h-32 object-contain team-logo"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
            </div>

            {/* Team Name */}
            <h1 className="font-display text-4xl text-text-primary leading-none tracking-wide text-center">
              {teamName.toUpperCase()}
            </h1>

            {/* Division */}
            <p className="text-sm text-text-muted mt-2 font-medium tracking-wide text-center">
              {divisionName.toUpperCase()}
            </p>

            {/* Season Record */}
            <div className="mt-6 bg-bg-tertiary rounded-xl p-4">
              <h3 className="text-xs font-bold text-text-muted tracking-[0.2em] mb-3">SEASON RECORD</h3>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="font-display text-3xl text-text-primary">{wins}</div>
                  <div className="text-xs text-text-muted">WINS</div>
                </div>
                <div className="text-text-muted text-2xl font-light">-</div>
                <div className="text-center">
                  <div className="font-display text-3xl text-text-secondary">{losses}</div>
                  <div className="text-xs text-text-muted">LOSSES</div>
                </div>
                <div className="h-10 w-px bg-border-light" />
                <div className="text-center">
                  <div className="font-display text-2xl text-text-primary">{pct}</div>
                  <div className="text-xs text-text-muted">PCT</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border-light flex justify-center">
                <span
                  className={`
                    inline-block px-3 py-1 rounded-full text-sm font-bold
                    ${runDiff > 0
                      ? 'bg-green-500/20 text-green-400'
                      : runDiff < 0
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-bg-tertiary text-text-muted'
                    }
                  `}
                >
                  {runDiff > 0 ? '+' : ''}{runDiff} RUN DIFF
                </span>
              </div>
            </div>

            {/* Season Badge */}
            <div className="flex items-center gap-2 mt-6 justify-center">
              <span className="text-xs text-text-muted font-medium">SEASON</span>
              <div className="flex items-center gap-1.5 bg-bg-tertiary px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-accent rounded-full" />
                <span className="text-text-primary font-bold text-sm">{season}</span>
              </div>
            </div>

            {/* External Links */}
            <div className="mt-6 pt-4 border-t border-border-light">
              <span className="text-xs text-text-muted font-medium block mb-2">LINKS</span>
              <div className="flex flex-col gap-2">
                {teamMlbUrl && (
                  <a
                    href={teamMlbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary hover:bg-bg-primary rounded-lg text-text-secondary hover:text-text-primary transition-colors text-xs font-medium"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    MLB.com
                  </a>
                )}
                <a
                  href={`https://en.wikipedia.org/wiki/${wikiName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary hover:bg-bg-primary rounded-lg text-text-secondary hover:text-text-primary transition-colors text-xs font-medium"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801.111-.947-.07-.084-.305-.178-.705-.178h-.263c-.134 0-.2-.082-.2-.21v-.455l.052-.045h3.932l.054.045v.455c0 .119-.074.18-.22.18-.937.012-1.157.209-1.652 1.074 0 0-.869 1.68-1.876 3.727l.554 1.092 2.774-5.483c.289-.586.177-.793-.097-.895-.135-.054-.326-.086-.571-.086h-.093c-.148 0-.22-.07-.22-.195v-.46l.052-.045h3.933l.053.045v.455c0 .119-.074.18-.219.18-.937.012-1.157.209-1.652 1.074l-3.645 7.106c-.605 1.165-1.196 2.326-1.775 3.482-.493.988-.94.871-1.313.021-.688-1.561-1.381-3.124-2.073-4.687-.549 1.078-1.09 2.151-1.636 3.228-.493.989-.94.872-1.313.021-.456-1.042-4.08-8.323-4.08-8.323-.727-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037z"/>
                  </svg>
                  Wikipedia
                </a>
                <a
                  href={`https://www.baseball-reference.com/teams/${teamData.abbr}/${season}.shtml`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary hover:bg-bg-primary rounded-lg text-text-secondary hover:text-text-primary transition-colors text-xs font-medium"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  Baseball Reference
                </a>
              </div>
            </div>
          </div>

          {/* Right Panel - Stats */}
          <div className="flex-1 p-6 overflow-auto">
            {/* Hitting Stats */}
            {hittingStats && (
              <div className="mb-8">
                <div className="flex items-start justify-between mb-6 pb-3 border-b border-border-light">
                  <h2 className="font-display text-xl text-text-primary tracking-wide">
                    TEAM HITTING RANKINGS
                  </h2>
                  <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded font-bold">
                    {allTeamHitting?.length || 0} TEAMS
                  </span>
                </div>
                <div className="space-y-1 stagger-children">
                  {TEAM_HITTING_CATEGORIES.map(cat => (
                    <StatCategory
                      key={cat.key}
                      title={cat.title}
                      stats={TEAM_HITTING_STATS[cat.key]}
                      playerStats={hittingStats}
                      leagueStats={allTeamHitting}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pitching Stats */}
            {pitchingStats && (
              <div>
                <div className="flex items-start justify-between mb-6 pb-3 border-b border-border-light">
                  <h2 className="font-display text-xl text-text-primary tracking-wide">
                    TEAM PITCHING RANKINGS
                  </h2>
                  <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded font-bold">
                    {allTeamPitching?.length || 0} TEAMS
                  </span>
                </div>
                <div className="space-y-1 stagger-children">
                  {TEAM_PITCHING_CATEGORIES.map(cat => (
                    <StatCategory
                      key={cat.key}
                      title={cat.title}
                      stats={TEAM_PITCHING_STATS[cat.key]}
                      playerStats={pitchingStats}
                      leagueStats={allTeamPitching}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Roster */}
            {(roster || rosterLoading) && (
              <div className="mt-8">
                <div className="flex items-start justify-between mb-6 pb-3 border-b border-border-light">
                  <div className="flex items-center gap-4">
                    <h2 className="font-display text-xl text-text-primary tracking-wide">
                      ROSTER
                    </h2>
                    {isCurrentSeason && (
                      <div className="flex bg-bg-tertiary rounded-lg p-0.5 border border-border theme-transition">
                        <button
                          onClick={() => handleRosterToggle('fullSeason')}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            rosterType === 'fullSeason'
                              ? 'bg-accent text-text-inverse shadow-sm'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          Season
                        </button>
                        <button
                          onClick={() => handleRosterToggle('40Man')}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            rosterType === '40Man'
                              ? 'bg-accent text-text-inverse shadow-sm'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          Current
                        </button>
                      </div>
                    )}
                  </div>
                  {roster && (
                    <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded font-bold">
                      {roster.length} PLAYERS
                    </span>
                  )}
                </div>
                <TeamRoster
                  roster={roster}
                  loading={rosterLoading}
                  onPlayerClick={onPlayerClick}
                  teamColor={teamData.primary}
                />
              </div>
            )}

            {/* Loading state if no stats yet */}
            {!hittingStats && !pitchingStats && !roster && !rosterLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-text-muted">Loading team stats...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCard;
