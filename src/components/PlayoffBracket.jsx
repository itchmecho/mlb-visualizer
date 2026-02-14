// Playoff Bracket visualization
// v1.1.0 | 2026-02-14

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchPostseason } from '../utils/api';
import { getTeamData, getTeamLogoUrl } from '../utils/teamData';

// Series round labels and display order
const ROUND_ORDER = [
  { key: 'F', label: 'Wild Card', shortLabel: 'WC' },
  { key: 'D', label: 'Division Series', shortLabel: 'DS' },
  { key: 'L', label: 'Championship Series', shortLabel: 'CS' },
  { key: 'W', label: 'World Series', shortLabel: 'WS' },
];

// Extract series from postseason /series endpoint
const extractSeries = (postseasonData) => {
  if (!postseasonData?.series) return [];

  return postseasonData.series.map(s => {
    const games = s.games || [];
    const round = s.series?.gameType || '';

    // Extract the two teams from finished games
    const teamMap = {};
    for (const g of games) {
      for (const side of ['away', 'home']) {
        const t = g.teams?.[side];
        if (t?.team?.id && !(t.team.id in teamMap)) {
          teamMap[t.team.id] = { team: t.team, wins: 0 };
        }
      }
    }

    // Count wins from games with final scores
    for (const g of games) {
      const away = g.teams?.away;
      const home = g.teams?.home;
      if (away?.isWinner && teamMap[away.team?.id]) teamMap[away.team.id].wins++;
      if (home?.isWinner && teamMap[home.team?.id]) teamMap[home.team.id].wins++;
    }

    const teams = Object.values(teamMap);
    const team1 = teams[0] || { team: {}, wins: 0 };
    const team2 = teams[1] || { team: {}, wins: 0 };

    // Series description from first game (e.g. "AL Division Series")
    const description = games[0]?.seriesDescription || '';

    return {
      id: s.series?.id || `${round}-${team1.team?.id}-${team2.team?.id}`,
      round,
      roundLabel: ROUND_ORDER.find(r => r.key === round)?.label || round,
      team1: { team: team1.team, wins: team1.wins },
      team2: { team: team2.team, wins: team2.wins },
      games,
      description,
    };
  });
};

// Matchup card component
const MatchupCard = ({ matchup, expanded, onToggle }) => {
  const { team1, team2, description } = matchup;
  const t1Data = getTeamData(team1.team?.name);
  const t2Data = getTeamData(team2.team?.name);
  const t1Winner = team1.wins > team2.wins;
  const t2Winner = team2.wins > team1.wins;

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden theme-transition">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 hover:bg-bg-tertiary/30 transition-colors cursor-pointer"
      >
        {description && (
          <div className="text-xs text-text-muted mb-2 text-left">{description}</div>
        )}

        {/* Team 1 */}
        <div className={`flex items-center justify-between py-1.5 ${t1Winner ? '' : 'opacity-60'}`}>
          <div className="flex items-center gap-2.5">
            {t1Data.id && (
              <img src={getTeamLogoUrl(t1Data.id)} alt={t1Data.abbr} className="w-6 h-6 object-contain team-logo" />
            )}
            <span className={`text-sm font-medium ${t1Winner ? 'text-text-primary' : 'text-text-secondary'}`}>
              {t1Data.abbr || '???'}
            </span>
          </div>
          <span className={`font-display text-lg tabular-nums ${t1Winner ? 'text-accent' : 'text-text-muted'}`}>
            {team1.wins}
          </span>
        </div>

        {/* Team 2 */}
        <div className={`flex items-center justify-between py-1.5 ${t2Winner ? '' : 'opacity-60'}`}>
          <div className="flex items-center gap-2.5">
            {t2Data.id && (
              <img src={getTeamLogoUrl(t2Data.id)} alt={t2Data.abbr} className="w-6 h-6 object-contain team-logo" />
            )}
            <span className={`text-sm font-medium ${t2Winner ? 'text-text-primary' : 'text-text-secondary'}`}>
              {t2Data.abbr || '???'}
            </span>
          </div>
          <span className={`font-display text-lg tabular-nums ${t2Winner ? 'text-accent' : 'text-text-muted'}`}>
            {team2.wins}
          </span>
        </div>
      </button>

      {/* Expanded: Game Results */}
      {expanded && matchup.games.length > 0 && (
        <div className="px-4 pb-3 pt-1 border-t border-border-light">
          <div className="space-y-1.5">
            {matchup.games
              .sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate))
              .map((game, idx) => {
                const away = game.teams?.away;
                const home = game.teams?.home;
                const awayData = getTeamData(away?.team?.name);
                const homeData = getTeamData(home?.team?.name);
                const gameDate = game.gameDate ? new Date(game.gameDate) : null;

                return (
                  <div key={game.gamePk || idx} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="text-text-muted w-10">G{idx + 1}</span>
                    <span className="w-12 text-text-muted">
                      {gameDate ? `${gameDate.getMonth() + 1}/${gameDate.getDate()}` : '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium">{awayData.abbr}</span>
                      <span className="tabular-nums">{away?.score ?? '-'}</span>
                    </span>
                    <span className="text-text-muted">@</span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium">{homeData.abbr}</span>
                      <span className="tabular-nums">{home?.score ?? '-'}</span>
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

const PlayoffBracket = ({ season }) => {
  const [postseasonData, setPostseasonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState({});
  const abortRef = useRef(null);

  useEffect(() => {
    const loadPostseason = async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const data = await fetchPostseason(season, controller.signal);
        if (!controller.signal.aborted) {
          setPostseasonData(data);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load postseason:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadPostseason();
    return () => abortRef.current?.abort();
  }, [season]);

  const series = useMemo(() => {
    if (!postseasonData) return [];
    return extractSeries(postseasonData);
  }, [postseasonData]);

  // Group series by round
  const seriesByRound = useMemo(() => {
    const grouped = {};
    ROUND_ORDER.forEach(r => { grouped[r.key] = []; });
    series.forEach(s => {
      if (grouped[s.round]) {
        grouped[s.round].push(s);
      }
    });
    return grouped;
  }, [series]);

  const toggleSeries = (id) => {
    setExpandedSeries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="font-display text-5xl md:text-6xl text-text-primary tracking-wide mb-3">
          {season} PLAYOFFS
        </h2>
        <p className="text-text-muted text-lg">Postseason bracket and results</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-6">
          {ROUND_ORDER.map(round => (
            <div key={round.key}>
              <div className="skeleton-shimmer bg-bg-tertiary h-5 w-32 rounded mb-3" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2].map(i => (
                  <div key={i} className="bg-bg-card border border-border rounded-xl p-4">
                    {[1, 2].map(j => (
                      <div key={j} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <div className="skeleton-shimmer bg-bg-tertiary w-6 h-6 rounded" />
                          <div className="skeleton-shimmer bg-bg-tertiary h-4 w-10 rounded" />
                        </div>
                        <div className="skeleton-shimmer bg-bg-tertiary h-5 w-4 rounded" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Data */}
      {!loading && series.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="font-display text-3xl text-text-primary mb-2 tracking-wide">NO POSTSEASON DATA</h3>
          <p className="text-text-muted">
            Postseason data is not available for the {season} season.
          </p>
        </div>
      )}

      {/* Bracket by Round */}
      {!loading && series.length > 0 && (
        <div className="space-y-8">
          {ROUND_ORDER.map(round => {
            const roundSeries = seriesByRound[round.key];
            if (!roundSeries || roundSeries.length === 0) return null;

            return (
              <div key={round.key}>
                {/* Round Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 bg-accent rounded-full" />
                  <h3 className="font-display text-2xl text-text-primary tracking-wide">{round.label}</h3>
                </div>

                {/* Matchup Cards */}
                <div className={`grid gap-3 ${
                  round.key === 'W' ? 'grid-cols-1 max-w-md mx-auto'
                    : round.key === 'L' ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                }`}>
                  {roundSeries.map(matchup => (
                    <MatchupCard
                      key={matchup.id}
                      matchup={matchup}
                      expanded={expandedSeries[matchup.id]}
                      onToggle={() => toggleSeries(matchup.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlayoffBracket;
