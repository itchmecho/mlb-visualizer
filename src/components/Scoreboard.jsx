// Schedule & Scoreboard page
// v1.0.0 | 2026-02-06

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchSchedule, fetchBoxScore, fetchTeamSchedule } from '../utils/api';
import { getTeamData, getTeamLogoUrl, TEAM_DATA } from '../utils/teamData';

// Format date for MLB API (YYYY-MM-DD)
const formatApiDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Format date for display
const formatDisplayDate = (dateStr) => {
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
};

// Game status badge component
const StatusBadge = ({ status }) => {
  const code = status?.statusCode || status?.abstractGameCode;
  const detailedState = status?.detailedState || '';

  if (code === 'F' || detailedState === 'Final') {
    return (
      <span className="px-2 py-0.5 bg-bg-tertiary text-text-muted text-xs font-bold rounded">
        FINAL
      </span>
    );
  }
  if (code === 'I' || detailedState.includes('In Progress')) {
    const inning = status?.currentInning || '';
    const half = status?.isTopInning ? 'Top' : 'Bot';
    return (
      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded animate-pulse">
        {inning ? `${half} ${inning}` : 'LIVE'}
      </span>
    );
  }
  if (code === 'S' || code === 'P' || detailedState === 'Scheduled' || detailedState === 'Pre-Game') {
    const gameDate = status?.gameDate || '';
    let timeStr = '';
    if (gameDate) {
      const d = new Date(gameDate);
      const hours = d.getHours();
      const mins = d.getMinutes();
      timeStr = `${hours > 12 ? hours - 12 : hours}:${String(mins).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
    }
    return (
      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">
        {timeStr || 'TBD'}
      </span>
    );
  }
  // Postponed, delayed, etc.
  return (
    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded">
      {detailedState?.toUpperCase() || 'TBD'}
    </span>
  );
};

// Individual game card
const GameCard = ({ game, expanded, onToggle }) => {
  const away = game.teams?.away;
  const home = game.teams?.home;
  const awayTeam = away?.team || {};
  const homeTeam = home?.team || {};
  const awayData = getTeamData(awayTeam.name);
  const homeData = getTeamData(homeTeam.name);
  const linescore = game.linescore;
  const isFinal = game.status?.abstractGameCode === 'F' || game.status?.detailedState === 'Final';

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden theme-transition">
      {/* Game Summary */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 hover:bg-bg-tertiary/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between mb-2">
          <StatusBadge status={{ ...game.status, gameDate: game.gameDate }} />
          {game.seriesDescription && (
            <span className="text-xs text-text-muted">{game.seriesDescription}</span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2.5">
            {awayData.id && (
              <img src={getTeamLogoUrl(awayData.id)} alt={awayData.abbr} className="w-7 h-7 object-contain team-logo" />
            )}
            <span className="text-sm font-medium text-text-primary">{awayData.abbr}</span>
            {away?.leagueRecord && (
              <span className="text-xs text-text-muted">{away.leagueRecord.wins}-{away.leagueRecord.losses}</span>
            )}
          </div>
          <span className={`font-display text-xl tabular-nums ${
            isFinal && (away?.score || 0) > (home?.score || 0) ? 'text-text-primary' : 'text-text-muted'
          }`}>
            {away?.score !== undefined ? away.score : '-'}
          </span>
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2.5">
            {homeData.id && (
              <img src={getTeamLogoUrl(homeData.id)} alt={homeData.abbr} className="w-7 h-7 object-contain team-logo" />
            )}
            <span className="text-sm font-medium text-text-primary">{homeData.abbr}</span>
            {home?.leagueRecord && (
              <span className="text-xs text-text-muted">{home.leagueRecord.wins}-{home.leagueRecord.losses}</span>
            )}
          </div>
          <span className={`font-display text-xl tabular-nums ${
            isFinal && (home?.score || 0) > (away?.score || 0) ? 'text-text-primary' : 'text-text-muted'
          }`}>
            {home?.score !== undefined ? home.score : '-'}
          </span>
        </div>
      </button>

      {/* Expanded Box Score */}
      {expanded && linescore && (
        <div className="px-4 pb-3 pt-1 border-t border-border-light">
          {/* Linescore */}
          {linescore.innings && linescore.innings.length > 0 && (
            <div className="overflow-x-auto mb-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-muted">
                    <th className="text-left py-1 pr-2 w-12" />
                    {linescore.innings.map((inn, i) => (
                      <th key={i} className="px-1.5 py-1 text-center w-6">{inn.num}</th>
                    ))}
                    <th className="px-1.5 py-1 text-center font-bold">R</th>
                    <th className="px-1.5 py-1 text-center font-bold">H</th>
                    <th className="px-1.5 py-1 text-center font-bold">E</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-text-secondary">
                    <td className="pr-2 py-1 font-medium">{awayData.abbr}</td>
                    {linescore.innings.map((inn, i) => (
                      <td key={i} className="px-1.5 py-1 text-center tabular-nums">{inn.away?.runs ?? '-'}</td>
                    ))}
                    <td className="px-1.5 py-1 text-center font-bold text-text-primary tabular-nums">{linescore.teams?.away?.runs ?? '-'}</td>
                    <td className="px-1.5 py-1 text-center tabular-nums">{linescore.teams?.away?.hits ?? '-'}</td>
                    <td className="px-1.5 py-1 text-center tabular-nums">{linescore.teams?.away?.errors ?? '-'}</td>
                  </tr>
                  <tr className="text-text-secondary">
                    <td className="pr-2 py-1 font-medium">{homeData.abbr}</td>
                    {linescore.innings.map((inn, i) => (
                      <td key={i} className="px-1.5 py-1 text-center tabular-nums">{inn.home?.runs ?? '-'}</td>
                    ))}
                    <td className="px-1.5 py-1 text-center font-bold text-text-primary tabular-nums">{linescore.teams?.home?.runs ?? '-'}</td>
                    <td className="px-1.5 py-1 text-center tabular-nums">{linescore.teams?.home?.hits ?? '-'}</td>
                    <td className="px-1.5 py-1 text-center tabular-nums">{linescore.teams?.home?.errors ?? '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Opening Day countdown (approximate - usually late March)
const OpeningDayCountdown = () => {
  const now = new Date();
  const year = now.getFullYear();
  // Opening Day is typically the last Thursday of March
  const openingDay = new Date(year, 2, 27); // March 27 as approximate
  if (openingDay < now) {
    openingDay.setFullYear(year + 1);
  }
  const diff = openingDay - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) return null;

  return (
    <div className="inline-flex flex-col items-center bg-bg-card border border-border rounded-xl p-6">
      <span className="text-xs text-text-muted font-medium tracking-wider mb-2">OPENING DAY</span>
      <span className="font-display text-5xl text-accent">{days}</span>
      <span className="text-sm text-text-secondary mt-1">days away</span>
    </div>
  );
};

// Date navigation component
const DateNav = ({ date, onDateChange }) => {
  const moveDay = (offset) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    onDateChange(d);
  };

  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      <button
        onClick={() => moveDay(-1)}
        className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-elevated border border-border transition-colors"
      >
        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="text-center">
        <span className="font-display text-xl text-text-primary tracking-wide">
          {formatDisplayDate(date)}
        </span>
      </div>
      <button
        onClick={() => moveDay(1)}
        className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-elevated border border-border transition-colors"
      >
        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <button
        onClick={() => onDateChange(new Date())}
        className="px-3 py-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
      >
        Today
      </button>
    </div>
  );
};

const Scoreboard = ({ season }) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGames, setExpandedGames] = useState({});
  const [teamFilter, setTeamFilter] = useState(null);
  const abortRef = useRef(null);

  // All teams for filter dropdown
  const teamOptions = useMemo(() => {
    return Object.entries(TEAM_DATA)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Fetch schedule for selected date
  useEffect(() => {
    const loadGames = async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setExpandedGames({});

      try {
        const dateStr = formatApiDate(selectedDate);
        const data = await fetchSchedule(dateStr, teamFilter, controller.signal);

        if (!controller.signal.aborted) {
          setGames(data);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load schedule:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadGames();
    return () => abortRef.current?.abort();
  }, [selectedDate, teamFilter]);

  const toggleGame = (gamePk) => {
    setExpandedGames(prev => ({ ...prev, [gamePk]: !prev[gamePk] }));
  };

  const isOffseason = !loading && games.length === 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="font-display text-5xl md:text-6xl text-text-primary tracking-wide mb-3">
          SCOREBOARD
        </h2>
      </div>

      {/* Date Navigation */}
      <DateNav date={selectedDate} onDateChange={setSelectedDate} />

      {/* Team Filter */}
      <div className="flex justify-center mb-6">
        <select
          value={teamFilter || ''}
          onChange={(e) => setTeamFilter(e.target.value ? parseInt(e.target.value) : null)}
          className="px-3 py-2 bg-bg-input border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 theme-transition"
        >
          <option value="">All Teams</option>
          {teamOptions.map(team => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-4">
              <div className="skeleton-shimmer bg-bg-tertiary h-5 w-16 rounded mb-3" />
              {[1, 2].map(j => (
                <div key={j} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="skeleton-shimmer bg-bg-tertiary w-7 h-7 rounded" />
                    <div className="skeleton-shimmer bg-bg-tertiary h-4 w-10 rounded" />
                  </div>
                  <div className="skeleton-shimmer bg-bg-tertiary h-5 w-6 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* No Games / Offseason */}
      {isOffseason && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">⚾</div>
          <h3 className="font-display text-3xl text-text-primary mb-2 tracking-wide">NO GAMES TODAY</h3>
          <p className="text-text-muted mb-6">
            No games scheduled for {formatDisplayDate(selectedDate)}.
          </p>
          <OpeningDayCountdown />
        </div>
      )}

      {/* Games Grid */}
      {!loading && games.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map(game => (
            <GameCard
              key={game.gamePk}
              game={game}
              expanded={expandedGames[game.gamePk]}
              onToggle={() => toggleGame(game.gamePk)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Scoreboard;
