// Team Standings Component
// v1.3.0 | 2026-02-05

import React from 'react';
import { getTeamLogoUrl, getTeamMlbUrl, TEAM_DATA } from '../utils/teamData';

// World Series winners by year (team ID)
const WORLD_SERIES_WINNERS = {
  2001: 109, // Arizona Diamondbacks
  2002: 108, // Anaheim Angels (now LA Angels)
  2003: 146, // Florida Marlins (now Miami)
  2004: 111, // Boston Red Sox
  2005: 145, // Chicago White Sox
  2006: 138, // St. Louis Cardinals
  2007: 111, // Boston Red Sox
  2008: 143, // Philadelphia Phillies
  2009: 147, // New York Yankees
  2010: 137, // San Francisco Giants
  2011: 138, // St. Louis Cardinals
  2012: 137, // San Francisco Giants
  2013: 111, // Boston Red Sox
  2014: 137, // San Francisco Giants
  2015: 118, // Kansas City Royals
  2016: 112, // Chicago Cubs
  2017: 117, // Houston Astros
  2018: 111, // Boston Red Sox
  2019: 120, // Washington Nationals
  2020: 119, // Los Angeles Dodgers
  2021: 144, // Atlanta Braves
  2022: 117, // Houston Astros
  2023: 140, // Texas Rangers
  2024: 119, // Los Angeles Dodgers
  2025: 141, // Toronto Blue Jays
};

// Division display order and names (IDs from MLB Stats API)
const DIVISIONS = [
  { id: 201, name: 'AL East', league: 'American League' },
  { id: 202, name: 'AL Central', league: 'American League' },
  { id: 200, name: 'AL West', league: 'American League' },
  { id: 204, name: 'NL East', league: 'National League' },
  { id: 205, name: 'NL Central', league: 'National League' },
  { id: 203, name: 'NL West', league: 'National League' },
];

// Get team primary color by name
const getTeamColor = (teamName) => {
  const team = TEAM_DATA[teamName];
  return team?.primary || '#666';
};

const TeamRow = ({ team, rank, isLeader, season }) => {
  const teamName = team.team?.name || 'Unknown';
  const teamId = team.team?.id;
  const wins = team.wins || 0;
  const losses = team.losses || 0;
  const pct = team.winningPercentage || '.000';
  const gb = team.gamesBack === '-' ? '-' : team.gamesBack;
  const streak = team.streak?.streakCode || '-';
  const last10 = team.records?.splitRecords?.find(r => r.type === 'lastTen');
  const last10Record = last10 ? `${last10.wins}-${last10.losses}` : '-';
  const runDiff = team.runDifferential || 0;
  const teamColor = getTeamColor(teamName);
  const teamUrl = getTeamMlbUrl(teamName);
  const isWorldSeriesWinner = WORLD_SERIES_WINNERS[season] === teamId;

  return (
    <tr
      className={`
        group border-b border-border/30 transition-all duration-200
        hover:bg-bg-elevated/80
        ${isLeader ? 'bg-accent/5' : ''}
      `}
      style={{
        animationDelay: `${rank * 50}ms`,
      }}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span
            className={`
              font-display text-lg w-6 text-center
              ${isLeader ? 'text-accent' : 'text-text-muted'}
            `}
          >
            {rank}
          </span>
          <div
            className="w-1.5 h-10 rounded-full transition-all duration-300 group-hover:h-12"
            style={{ backgroundColor: teamColor }}
          />
          {teamId && (
            <img
              src={getTeamLogoUrl(teamId)}
              alt={teamName}
              className="w-9 h-9 object-contain transition-transform duration-300 group-hover:scale-110"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {teamUrl ? (
                <a
                  href={teamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-medium hover:underline transition-colors ${isLeader ? 'text-accent hover:text-accent' : 'text-text-primary hover:text-accent'}`}
                >
                  {teamName}
                </a>
              ) : (
                <span className={`font-medium text-text-primary ${isLeader ? 'text-accent' : ''}`}>
                  {teamName}
                </span>
              )}
              {isWorldSeriesWinner && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs font-bold rounded tracking-wide">
                  🏆 WS CHAMP
                </span>
              )}
            </div>
            {isLeader && !isWorldSeriesWinner && (
              <span className="text-xs text-accent font-medium tracking-wide">
                DIVISION LEADER
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <span className="font-display text-xl text-text-primary">{wins}</span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className="font-display text-xl text-text-secondary">{losses}</span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className="text-sm font-medium text-text-secondary">{pct}</span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className={`text-sm ${gb === '-' ? 'text-accent font-bold' : 'text-text-muted'}`}>
          {gb}
        </span>
      </td>
      <td className="py-3 px-3 text-center">
        <span
          className={`
            inline-block min-w-[3rem] px-2 py-0.5 rounded text-sm font-medium
            ${runDiff > 0
              ? 'bg-green-500/20 text-green-400'
              : runDiff < 0
                ? 'bg-red-500/20 text-red-400'
                : 'bg-bg-tertiary text-text-muted'
            }
          `}
        >
          {runDiff > 0 ? '+' : ''}{runDiff}
        </span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className="text-sm text-text-secondary">{last10Record}</span>
      </td>
      <td className="py-3 px-3 text-center">
        <span
          className={`
            inline-block min-w-[2.5rem] px-2 py-0.5 rounded text-sm font-bold
            ${streak.startsWith('W')
              ? 'bg-green-500/20 text-green-400'
              : streak.startsWith('L')
                ? 'bg-red-500/20 text-red-400'
                : 'text-text-muted'
            }
          `}
        >
          {streak}
        </span>
      </td>
    </tr>
  );
};

const DivisionTable = ({ division, teams, animationDelay, season }) => {
  if (!teams || teams.length === 0) return null;

  // Sort by division rank
  const sortedTeams = [...teams].sort((a, b) =>
    parseInt(a.divisionRank || 99) - parseInt(b.divisionRank || 99)
  );

  return (
    <div
      className="bg-bg-card rounded-xl border border-border overflow-hidden theme-transition animate-fade-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Division Header */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-bg-elevated/80 to-transparent">
        <h3 className="font-display text-2xl tracking-wide text-text-primary">
          {division.name}
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs uppercase tracking-wider border-b border-border bg-bg-tertiary/50">
              <th className="py-3 px-4 text-left font-semibold">Team</th>
              <th className="py-3 px-3 text-center font-semibold">W</th>
              <th className="py-3 px-3 text-center font-semibold">L</th>
              <th className="py-3 px-3 text-center font-semibold">PCT</th>
              <th className="py-3 px-3 text-center font-semibold">GB</th>
              <th className="py-3 px-3 text-center font-semibold">DIFF</th>
              <th className="py-3 px-3 text-center font-semibold">L10</th>
              <th className="py-3 px-3 text-center font-semibold">STRK</th>
            </tr>
          </thead>
          <tbody className="stagger-children">
            {sortedTeams.map((team, index) => (
              <TeamRow
                key={team.team?.id || index}
                team={team}
                rank={index + 1}
                isLeader={index === 0}
                season={season}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Standings = ({ standings, season, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-text-muted text-lg">Loading standings...</p>
        </div>
      </div>
    );
  }

  if (!standings || standings.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-8xl mb-8 opacity-50">📊</div>
        <h2 className="font-display text-5xl text-text-primary mb-4 tracking-wide">
          NO STANDINGS DATA
        </h2>
        <p className="text-text-muted text-lg max-w-md mx-auto">
          Standings data is not available for the {season} season.
          Try selecting a different year.
        </p>
      </div>
    );
  }

  // Group standings by division (division ID is in team.division.id)
  const standingsByDivision = {};
  standings.forEach(record => {
    const divisionId = record.team?.division?.id;
    if (divisionId) {
      if (!standingsByDivision[divisionId]) {
        standingsByDivision[divisionId] = [];
      }
      standingsByDivision[divisionId].push(record);
    }
  });

  const alDivisions = DIVISIONS.filter(d => d.league === 'American League');
  const nlDivisions = DIVISIONS.filter(d => d.league === 'National League');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="font-display text-5xl md:text-6xl text-text-primary tracking-wide mb-3">
          {season} STANDINGS
        </h2>
        <p className="text-text-muted text-lg">
          Regular season standings by division
        </p>
      </div>

      {/* Two-column layout for leagues */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* American League */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-1 h-8 bg-accent rounded-full" />
            <h2 className="font-display text-2xl text-text-secondary tracking-wide">
              AMERICAN LEAGUE
            </h2>
          </div>
          {alDivisions.map((division, index) => (
            <DivisionTable
              key={division.id}
              division={division}
              teams={standingsByDivision[division.id]}
              animationDelay={index * 100}
              season={season}
            />
          ))}
        </div>

        {/* National League */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-1 h-8 bg-accent rounded-full" />
            <h2 className="font-display text-2xl text-text-secondary tracking-wide">
              NATIONAL LEAGUE
            </h2>
          </div>
          {nlDivisions.map((division, index) => (
            <DivisionTable
              key={division.id}
              division={division}
              teams={standingsByDivision[division.id]}
              animationDelay={(index + 3) * 100}
              season={season}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Standings;
