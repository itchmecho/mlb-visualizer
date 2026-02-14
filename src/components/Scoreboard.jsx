// Schedule & Scoreboard page
// v1.3.0 | 2026-02-14

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

// Ticking countdown digits
const CountdownTicker = ({ time, size = 'lg' }) => {
  const isLarge = size === 'lg';
  const numClass = isLarge
    ? 'font-display text-4xl md:text-5xl text-accent tabular-nums leading-none'
    : 'font-display text-2xl text-accent tabular-nums leading-none';
  const labelClass = isLarge
    ? 'text-[10px] text-text-muted tracking-widest mt-1'
    : 'text-[9px] text-text-muted tracking-widest mt-0.5';
  const gap = isLarge ? 'gap-3 md:gap-4' : 'gap-2';

  return (
    <div className={`flex items-start justify-center ${gap}`}>
      {time.days > 0 && (
        <div className="flex flex-col items-center">
          <span className={numClass}>{String(time.days).padStart(2, '0')}</span>
          <span className={labelClass}>DAYS</span>
        </div>
      )}
      <div className="flex flex-col items-center">
        <span className={numClass}>{String(time.hours).padStart(2, '0')}</span>
        <span className={labelClass}>HRS</span>
      </div>
      <div className="flex flex-col items-center">
        <span className={numClass}>{String(time.minutes).padStart(2, '0')}</span>
        <span className={labelClass}>MIN</span>
      </div>
      <div className="flex flex-col items-center">
        <span className={numClass}>{String(time.seconds).padStart(2, '0')}</span>
        <span className={labelClass}>SEC</span>
      </div>
    </div>
  );
};

// Unified off-day display — adapts to offseason, spring training, and in-season
const OffDayDisplay = ({ afterDate }) => {
  const [nextGame, setNextGame] = useState(null);
  const [gameTime, setGameTime] = useState(null);
  const [odTime, setOdTime] = useState(null);
  const [loading, setLoading] = useState(true);

  // Opening Day target
  const openingDay = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const od = new Date(year, 2, 27); // ~March 27
    if (od < now) od.setFullYear(year + 1);
    return od;
  }, []);

  // Fetch next game (look ahead up to 30 days for deep offseason)
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setNextGame(null);

    const findNext = async () => {
      try {
        const start = new Date(afterDate);
        start.setDate(start.getDate() + 1);
        const end = new Date(start);
        end.setDate(end.getDate() + 30);

        const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=${formatApiDate(start)}&endDate=${formatApiDate(end)}&hydrate=team`;
        const resp = await fetch(url, { signal: controller.signal });
        const data = await resp.json();
        const games = data.dates?.flatMap(d => d.games) || [];
        const upcoming = games
          .filter(g => g.gameDate && new Date(g.gameDate) > new Date())
          .sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate));

        if (upcoming.length > 0) setNextGame(upcoming[0]);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Next game lookup error:', err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    findNext();
    return () => controller.abort();
  }, [afterDate]);

  // Tick both countdowns every second
  useEffect(() => {
    const tick = () => {
      const now = new Date();

      // Next game countdown
      if (nextGame?.gameDate) {
        const diff = new Date(nextGame.gameDate) - now;
        if (diff > 0) {
          setGameTime({
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((diff / (1000 * 60)) % 60),
            seconds: Math.floor((diff / 1000) % 60),
          });
        } else {
          setGameTime(null);
        }
      }

      // Opening Day countdown
      const odDiff = openingDay - now;
      if (odDiff > 0) {
        setOdTime({
          days: Math.floor(odDiff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((odDiff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((odDiff / (1000 * 60)) % 60),
          seconds: Math.floor((odDiff / 1000) % 60),
        });
      } else {
        setOdTime(null);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextGame, openingDay]);

  if (loading) return null;

  const isSpringTraining = nextGame?.gameType === 'S';
  const hasNextGame = nextGame && gameTime;
  const hasOpeningDay = odTime && odTime.days > 0;
  // Only show Opening Day when it's relevant (spring training or deep offseason)
  const showOpeningDay = hasOpeningDay && (isSpringTraining || !hasNextGame);

  const awayData = hasNextGame ? getTeamData(nextGame.teams?.away?.team?.name) : null;
  const homeData = hasNextGame ? getTeamData(nextGame.teams?.home?.team?.name) : null;

  // Deep offseason — no upcoming games, just Opening Day
  if (!hasNextGame && hasOpeningDay) {
    return (
      <div className="inline-flex flex-col items-center bg-bg-card border border-border rounded-2xl px-8 py-7">
        <span className="text-xs font-semibold text-text-muted tracking-[0.2em] mb-5">OPENING DAY</span>
        <CountdownTicker time={odTime} size="lg" />
      </div>
    );
  }

  if (!hasNextGame) return null;

  // Spring training or in-season
  return (
    <div className="inline-flex flex-col items-center bg-bg-card border border-border rounded-2xl px-8 py-7">
      {/* Period label */}
      <span className="text-xs font-semibold text-text-muted tracking-[0.2em] mb-4">
        {isSpringTraining ? 'SPRING TRAINING' : 'NEXT GAME'}
      </span>

      {/* Matchup */}
      <div className="flex items-center gap-3 mb-5">
        {awayData.id && <img src={getTeamLogoUrl(awayData.id)} alt={awayData.abbr} className="w-8 h-8 object-contain" />}
        <span className="font-display text-xl text-text-primary">{awayData.abbr}</span>
        <span className="text-text-muted text-sm">@</span>
        <span className="font-display text-xl text-text-primary">{homeData.abbr}</span>
        {homeData.id && <img src={getTeamLogoUrl(homeData.id)} alt={homeData.abbr} className="w-8 h-8 object-contain" />}
      </div>

      {/* Primary countdown */}
      <CountdownTicker time={gameTime} size="lg" />

      {/* Secondary: Opening Day (during spring training) */}
      {showOpeningDay && (
        <div className="mt-5 pt-4 border-t border-border/50 w-full text-center">
          <span className="text-[10px] font-semibold text-text-muted tracking-[0.15em]">
            OPENING DAY IN {odTime.days} DAY{odTime.days !== 1 ? 'S' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

// Date navigation component
const DateNav = ({ date, onDateChange }) => {
  const isToday = formatApiDate(date) === formatApiDate(new Date());

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
        disabled={isToday}
        className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-elevated border border-border transition-colors disabled:opacity-30 disabled:pointer-events-none"
      >
        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <button
        onClick={() => onDateChange(new Date())}
        disabled={isToday}
        className="px-3 py-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors disabled:opacity-30 disabled:pointer-events-none"
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
          <OffDayDisplay afterDate={selectedDate} />
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
