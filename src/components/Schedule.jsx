// Schedule Page — Calendar & List views for MLB game schedule
// v1.0.0 | 2026-02-14

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchScheduleRange } from '../utils/api';
import { getTeamData, getTeamLogoUrl, TEAM_DATA } from '../utils/teamData';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Format YYYY-MM-DD from Date
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Get game time string from game date
const getGameTime = (gameDate) => {
  if (!gameDate) return 'TBD';
  const d = new Date(gameDate);
  const hours = d.getHours();
  const mins = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(mins).padStart(2, '0')} ${ampm}`;
};

// Determine W/L/- for a team in a game
const getResult = (game, teamId) => {
  const status = game.status?.abstractGameCode;
  if (status !== 'F') return null; // not final
  const away = game.teams?.away;
  const home = game.teams?.home;
  const isHome = home?.team?.id === teamId;
  const teamScore = isHome ? home?.score : away?.score;
  const oppScore = isHome ? away?.score : home?.score;
  if (teamScore == null || oppScore == null) return null;
  if (teamScore > oppScore) return 'W';
  if (teamScore < oppScore) return 'L';
  return null;
};

// Get opponent info for a team's game
const getOpponent = (game, teamId) => {
  const away = game.teams?.away;
  const home = game.teams?.home;
  const isHome = home?.team?.id === teamId;
  const opp = isHome ? away : home;
  const oppData = getTeamData(opp?.team?.name);
  return {
    isHome,
    team: opp?.team,
    data: oppData,
    score: { team: isHome ? home?.score : away?.score, opp: isHome ? away?.score : home?.score },
  };
};

// Get score display string
const getScoreText = (game, teamId = null) => {
  const status = game.status?.abstractGameCode;
  if (status !== 'F') return getGameTime(game.gameDate);
  const away = game.teams?.away;
  const home = game.teams?.home;
  if (teamId) {
    const isHome = home?.team?.id === teamId;
    const ts = isHome ? home?.score : away?.score;
    const os = isHome ? away?.score : home?.score;
    return `${ts}-${os}`;
  }
  return `${away?.score}-${home?.score}`;
};

// Check if a game is postponed
const isPostponed = (game) => {
  const state = game.status?.detailedState || '';
  return state.includes('Postponed') || state.includes('Suspended');
};

// ── Skeleton ──────────────────────────────────────────────────

const CalendarSkeleton = () => (
  <div>
    {/* Day headers */}
    <div className="grid grid-cols-7 gap-px mb-px">
      {DAYS_OF_WEEK.map(d => (
        <div key={d} className="text-center text-xs font-bold text-text-muted py-2">{d}</div>
      ))}
    </div>
    {/* 5 rows × 7 cells */}
    <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="bg-bg-card min-h-[56px] md:min-h-[80px] p-1 md:p-2">
          <div className="skeleton-shimmer bg-bg-tertiary rounded h-3 w-4 mb-2" />
          <div className="skeleton-shimmer bg-bg-tertiary rounded h-3 w-full" />
        </div>
      ))}
    </div>
  </div>
);

const ListSkeleton = () => (
  <div className="space-y-6">
    {[1, 2, 3].map(group => (
      <div key={group}>
        <div className="skeleton-shimmer bg-bg-tertiary rounded h-5 w-40 mb-3" />
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          {[1, 2, 3].map(row => (
            <div key={row} className="flex items-center gap-3 py-3 px-4 border-b border-border last:border-b-0">
              <div className="skeleton-shimmer bg-bg-tertiary rounded-full w-6 h-6 shrink-0" />
              <div className="skeleton-shimmer bg-bg-tertiary rounded h-4 w-20 shrink-0" />
              <div className="flex-1" />
              <div className="skeleton-shimmer bg-bg-tertiary rounded h-4 w-14" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ── Calendar Cell ─────────────────────────────────────────────

const CalendarCell = ({ date, games, teamFilter, isToday, isOutside, onDayClick, selectedDay }) => {
  if (!date) return <div className="bg-bg-primary" />;

  const dayNum = date.getDate();
  const dateStr = toIso(date);
  const dayGames = games || [];
  const hasGames = dayGames.length > 0;
  const isSelected = selectedDay === dateStr;

  // Team-specific view
  if (teamFilter) {
    const game = dayGames[0]; // primary game (doubleheaders handled below)
    const game2 = dayGames[1]; // second game if doubleheader

    const renderTeamGame = (g) => {
      const opp = getOpponent(g, teamFilter);
      const result = getResult(g, teamFilter);
      const ppd = isPostponed(g);

      return (
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[10px] md:text-xs text-text-secondary truncate">
            {opp.isHome ? 'vs' : '@'} {opp.data?.abbr || '???'}
          </span>
          {opp.data && (
            <img
              src={getTeamLogoUrl(opp.data.id)}
              alt=""
              className="w-3 h-3 md:w-4 md:h-4 shrink-0"
            />
          )}
          <span className="text-[10px] md:text-xs text-text-muted ml-auto shrink-0">
            {ppd ? 'PPD' : getScoreText(g, teamFilter)}
          </span>
          {result && (
            <span className={`text-[9px] md:text-[10px] font-bold shrink-0 ${result === 'W' ? 'text-green-400' : 'text-red-400'}`}>
              {result}
            </span>
          )}
        </div>
      );
    };

    // Left border accent for W/L
    const result = game ? getResult(game, teamFilter) : null;
    const borderColor = result === 'W' ? 'border-l-green-500' : result === 'L' ? 'border-l-red-500' : 'border-l-transparent';

    return (
      <div
        className={`bg-bg-card min-h-[56px] md:min-h-[80px] p-1 md:p-2 border-l-2 ${borderColor} ${
          isToday ? 'ring-1 ring-accent ring-inset' : ''
        } ${isOutside ? 'opacity-40' : ''}`}
      >
        <div className={`text-[10px] md:text-xs mb-1 ${isToday ? 'text-accent font-bold' : 'text-text-muted'}`}>
          {dayNum}
        </div>
        {game && renderTeamGame(game)}
        {game2 && <div className="mt-0.5">{renderTeamGame(game2)}</div>}
        {!hasGames && !isOutside && (
          <div className="text-[10px] text-text-muted/50">—</div>
        )}
      </div>
    );
  }

  // All-teams view — show game count, clickable
  return (
    <button
      onClick={() => hasGames && onDayClick(dateStr)}
      className={`bg-bg-card min-h-[56px] md:min-h-[80px] p-1 md:p-2 text-left w-full transition-colors ${
        hasGames ? 'hover:bg-bg-elevated cursor-pointer' : ''
      } ${isToday ? 'ring-1 ring-accent ring-inset' : ''} ${isOutside ? 'opacity-40' : ''} ${
        isSelected ? 'bg-bg-elevated' : ''
      }`}
      disabled={!hasGames}
    >
      <div className={`text-[10px] md:text-xs mb-1 ${isToday ? 'text-accent font-bold' : 'text-text-muted'}`}>
        {dayNum}
      </div>
      {hasGames && (
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-accent/15 text-accent text-[10px] md:text-xs font-bold rounded-full">
          {dayGames.length}
        </span>
      )}
    </button>
  );
};

// ── Expanded Day Card (all-teams calendar click) ──────────────

const ExpandedDayGames = ({ dateStr, games }) => {
  const displayDate = new Date(dateStr + 'T12:00:00');
  const formatted = displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden animate-fade-in mt-4">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-display text-lg tracking-wide text-text-primary">{formatted.toUpperCase()}</h3>
        <p className="text-xs text-text-muted">{games.length} game{games.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="divide-y divide-border">
        {games.map(game => {
          const away = game.teams?.away;
          const home = game.teams?.home;
          const awayData = getTeamData(away?.team?.name);
          const homeData = getTeamData(home?.team?.name);
          const isFinal = game.status?.abstractGameCode === 'F';
          const ppd = isPostponed(game);

          return (
            <div key={game.gamePk} className="flex items-center gap-3 py-3 px-4">
              {/* Away */}
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span className="text-sm text-text-primary truncate text-right">
                  <span className="hidden md:inline">{away?.team?.name || '???'}</span>
                  <span className="md:hidden">{awayData?.abbr || '???'}</span>
                </span>
                {awayData && (
                  <img src={getTeamLogoUrl(awayData.id)} alt="" className="w-5 h-5 shrink-0" />
                )}
              </div>

              {/* Score / Time */}
              <div className="w-20 text-center shrink-0">
                {ppd ? (
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded">PPD</span>
                ) : isFinal ? (
                  <span className="text-sm font-bold text-text-primary">
                    {away?.score} - {home?.score}
                  </span>
                ) : (
                  <span className="text-xs text-text-muted">{getGameTime(game.gameDate)}</span>
                )}
              </div>

              {/* Home */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {homeData && (
                  <img src={getTeamLogoUrl(homeData.id)} alt="" className="w-5 h-5 shrink-0" />
                )}
                <span className="text-sm text-text-primary truncate">
                  <span className="hidden md:inline">{home?.team?.name || '???'}</span>
                  <span className="md:hidden">{homeData?.abbr || '???'}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── List View ─────────────────────────────────────────────────

const ListView = ({ scheduleData, teamFilter }) => {
  if (scheduleData.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">📅</div>
        <p className="text-text-muted">No games this month.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {scheduleData.map(dateEntry => {
        const displayDate = new Date(dateEntry.date + 'T12:00:00');
        const formatted = displayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        return (
          <div key={dateEntry.date}>
            {/* Date header */}
            <h3 className="font-display text-lg tracking-wide text-text-primary mb-2">
              {formatted.toUpperCase()}
            </h3>

            <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
              <div className="divide-y divide-border">
                {dateEntry.games.map(game => {
                  const away = game.teams?.away;
                  const home = game.teams?.home;
                  const awayData = getTeamData(away?.team?.name);
                  const homeData = getTeamData(home?.team?.name);
                  const isFinal = game.status?.abstractGameCode === 'F';
                  const ppd = isPostponed(game);

                  // Team-specific row
                  if (teamFilter) {
                    const opp = getOpponent(game, teamFilter);
                    const result = getResult(game, teamFilter);

                    return (
                      <div key={game.gamePk} className="flex items-center gap-3 py-3 px-4">
                        {/* vs/@ */}
                        <span className="text-xs text-text-muted w-5 shrink-0 text-center font-medium">
                          {opp.isHome ? 'vs' : '@'}
                        </span>

                        {/* Opponent */}
                        {opp.data && (
                          <img src={getTeamLogoUrl(opp.data.id)} alt="" className="w-5 h-5 shrink-0" />
                        )}
                        <span className="text-sm text-text-primary truncate">
                          <span className="hidden md:inline">{opp.team?.name || '???'}</span>
                          <span className="md:hidden">{opp.data?.abbr || '???'}</span>
                        </span>

                        <div className="flex-1" />

                        {/* Score / Time */}
                        {ppd ? (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded">PPD</span>
                        ) : (
                          <span className="text-sm text-text-muted">
                            {getScoreText(game, teamFilter)}
                          </span>
                        )}

                        {/* W/L badge */}
                        {result && (
                          <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                            result === 'W'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {result}
                          </span>
                        )}
                      </div>
                    );
                  }

                  // All-teams row
                  return (
                    <div key={game.gamePk} className="flex items-center gap-3 py-3 px-4">
                      {/* Away */}
                      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                        <span className="text-sm text-text-primary truncate text-right">
                          <span className="hidden md:inline">{away?.team?.name || '???'}</span>
                          <span className="md:hidden">{awayData?.abbr || '???'}</span>
                        </span>
                        {awayData && (
                          <img src={getTeamLogoUrl(awayData.id)} alt="" className="w-5 h-5 shrink-0" />
                        )}
                      </div>

                      <span className="text-xs text-text-muted shrink-0">@</span>

                      {/* Home */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {homeData && (
                          <img src={getTeamLogoUrl(homeData.id)} alt="" className="w-5 h-5 shrink-0" />
                        )}
                        <span className="text-sm text-text-primary truncate">
                          <span className="hidden md:inline">{home?.team?.name || '???'}</span>
                          <span className="md:hidden">{homeData?.abbr || '???'}</span>
                        </span>
                      </div>

                      <div className="shrink-0 w-20 text-center">
                        {ppd ? (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded">PPD</span>
                        ) : isFinal ? (
                          <span className="text-sm font-bold text-text-primary">
                            {away?.score} - {home?.score}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">{getGameTime(game.gameDate)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────

const Schedule = ({ season, latestSeason }) => {
  const now = new Date();
  const isCurrentSeason = season === latestSeason;

  // Default month: current month for latest season, April for past seasons
  const defaultMonth = isCurrentSeason ? now.getMonth() : 3; // April
  const defaultYear = isCurrentSeason ? now.getFullYear() : season;

  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [teamFilter, setTeamFilter] = useState(null);
  const [viewMonth, setViewMonth] = useState(defaultMonth);
  const [viewYear, setViewYear] = useState(defaultYear);
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const abortRef = useRef(null);

  // Reset when season changes
  useEffect(() => {
    const isCurrent = season === latestSeason;
    setViewMonth(isCurrent ? now.getMonth() : 3);
    setViewYear(isCurrent ? now.getFullYear() : season);
    setSelectedDay(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  // Team options for dropdown
  const teamOptions = useMemo(() => {
    return Object.entries(TEAM_DATA)
      .filter(([name]) => !name.includes('Indians') && !name.includes('Florida') && !name.includes('Expos') && !name.includes('Devil Rays') && !name.includes('Anaheim'))
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Compute start/end dates for the month
  const { startDate, endDate } = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const lastOfMonth = new Date(viewYear, viewMonth + 1, 0);
    return {
      startDate: toIso(firstOfMonth),
      endDate: toIso(lastOfMonth),
    };
  }, [viewYear, viewMonth]);

  // Fetch schedule data
  useEffect(() => {
    const loadSchedule = async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setSelectedDay(null);

      try {
        const data = await fetchScheduleRange(startDate, endDate, teamFilter, controller.signal);
        if (!controller.signal.aborted) {
          setScheduleData(data);
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

    loadSchedule();
    return () => abortRef.current?.abort();
  }, [startDate, endDate, teamFilter]);

  // Build a map of date → games[] for calendar
  const gamesByDate = useMemo(() => {
    const map = {};
    for (const entry of scheduleData) {
      map[entry.date] = entry.games;
    }
    return map;
  }, [scheduleData]);

  // Build calendar grid (array of Date | null)
  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const lastOfMonth = new Date(viewYear, viewMonth + 1, 0);
    const startDay = firstOfMonth.getDay(); // 0=Sun
    const totalDays = lastOfMonth.getDate();

    const days = [];

    // Leading empty cells (previous month tail)
    for (let i = 0; i < startDay; i++) {
      const d = new Date(viewYear, viewMonth, -(startDay - 1 - i));
      days.push({ date: d, outside: true });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      days.push({ date: new Date(viewYear, viewMonth, d), outside: false });
    }

    // Trailing cells to fill last row
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(viewYear, viewMonth + 1, i), outside: true });
      }
    }

    return days;
  }, [viewYear, viewMonth]);

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      // Don't go before the season year (allow Jan of season year for spring training)
      if (viewYear > season) {
        setViewYear(viewYear - 1);
        setViewMonth(11);
      }
    } else {
      setViewMonth(viewMonth - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      // Don't go past Dec of season year (allow some overflow for playoffs)
      if (viewYear < season + 1) {
        setViewYear(viewYear + 1);
        setViewMonth(0);
      }
    } else {
      setViewMonth(viewMonth + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
    setSelectedDay(null);
  };

  const canGoPrev = viewYear > season || (viewYear === season && viewMonth > 0);
  const canGoNext = viewYear < season + 1 || (viewYear === season + 1 && viewMonth < 0);
  // Simplify: allow navigation within season year and one month into next
  const canGoNextSimple = !(viewYear === season && viewMonth === 11) || viewYear < season;

  const todayStr = toIso(now);

  const handleDayClick = (dateStr) => {
    setSelectedDay(prev => prev === dateStr ? null : dateStr);
  };

  // Expanded day games
  const expandedGames = selectedDay ? (gamesByDate[selectedDay] || []) : [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="font-display text-5xl md:text-6xl text-text-primary tracking-wide mb-3">
          SCHEDULE
        </h2>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center gap-3 mb-6">
        {/* Team filter */}
        <select
          value={teamFilter || ''}
          onChange={(e) => {
            setTeamFilter(e.target.value ? parseInt(e.target.value) : null);
            setSelectedDay(null);
          }}
          className="w-full md:w-auto px-3 py-2 bg-bg-input border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 theme-transition"
        >
          <option value="">All Teams</option>
          {teamOptions.map(team => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-elevated border border-border transition-all disabled:opacity-30 disabled:pointer-events-none theme-transition"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="font-display text-xl md:text-2xl tracking-wide text-text-primary min-w-[180px] text-center">
            {MONTHS[viewMonth].toUpperCase()} {viewYear}
          </span>

          <button
            onClick={nextMonth}
            disabled={!canGoNextSimple}
            className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-elevated border border-border transition-all disabled:opacity-30 disabled:pointer-events-none theme-transition"
            aria-label="Next month"
          >
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Today button (latest season only) */}
          {isCurrentSeason && (
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1 hidden md:block" />

        {/* View toggle */}
        <div className="flex bg-bg-tertiary rounded-lg p-1 border border-border theme-transition">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-md text-sm transition-all ${
              viewMode === 'calendar'
                ? 'bg-accent text-text-inverse shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            title="Calendar view"
          >
            {/* Calendar icon */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-sm transition-all ${
              viewMode === 'list'
                ? 'bg-accent text-text-inverse shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            title="List view"
          >
            {/* List icon */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (viewMode === 'calendar' ? <CalendarSkeleton /> : <ListSkeleton />)}

      {/* Calendar View */}
      {!loading && viewMode === 'calendar' && (
        <div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-px">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="text-center text-xs font-bold text-text-muted py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
            {calendarDays.map(({ date, outside }, i) => {
              const dateStr = toIso(date);
              const isToday = dateStr === todayStr;
              return (
                <CalendarCell
                  key={i}
                  date={date}
                  games={gamesByDate[dateStr]}
                  teamFilter={teamFilter}
                  isToday={isToday}
                  isOutside={outside}
                  onDayClick={handleDayClick}
                  selectedDay={selectedDay}
                />
              );
            })}
          </div>

          {/* Expanded day detail (all-teams mode) */}
          {selectedDay && !teamFilter && expandedGames.length > 0 && (
            <ExpandedDayGames dateStr={selectedDay} games={expandedGames} />
          )}

          {/* No games message */}
          {scheduleData.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-text-muted">No games scheduled for {MONTHS[viewMonth]} {viewYear}.</p>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && (
        <ListView scheduleData={scheduleData} teamFilter={teamFilter} />
      )}
    </div>
  );
};

export default Schedule;
