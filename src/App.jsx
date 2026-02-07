// MLB Player Visualizer - Main App
// v3.5.2 | 2026-02-06

import React, { useState, useRef, useEffect } from 'react';
import PlayerSearch from './components/PlayerSearch';
import PlayerCard from './components/PlayerCard';
import CompareView from './components/CompareView';
import Standings from './components/Standings';
import TeamCard from './components/TeamCard';
import { fetchPlayerStats, fetchLeagueStats, isPitcherPosition, searchPlayers, fetchPlayerById, fetchStandings, fetchTeamStats, fetchAllTeamStats, fetchTeamRoster } from './utils/api';
import { PERCENTILE_COLORS } from './utils/percentile';
import { useHashRouter, buildHash } from './hooks/useHashRouter';

// Generate available seasons from 2001 to last completed season
const currentYear = new Date().getFullYear();
const latestSeason = 2025; // Update to currentYear after Opening Day 2026
const AVAILABLE_SEASONS = Array.from(
  { length: latestSeason - 2000 },
  (_, i) => latestSeason - i
);

// Theme toggle component
const ThemeToggle = ({ theme, onToggle }) => (
  <button
    onClick={onToggle}
    className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-elevated border border-border transition-all theme-transition"
    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
  >
    {theme === 'dark' ? (
      <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ) : (
      <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    )}
  </button>
);

// View toggle component (Players / Teams)
const ViewToggle = ({ view, onToggle }) => (
  <div className="flex bg-bg-tertiary rounded-lg p-1 border border-border theme-transition">
    <button
      onClick={() => onToggle('players')}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
        view === 'players'
          ? 'bg-accent text-text-inverse shadow-sm'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      Players
    </button>
    <button
      onClick={() => onToggle('teams')}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
        view === 'teams'
          ? 'bg-accent text-text-inverse shadow-sm'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      Teams
    </button>
  </div>
);

function App() {
  // Theme state
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  // Hash router — drives view, season, and IDs from the URL
  const router = useHashRouter(latestSeason);

  // View state derived from router
  const [view, setView] = useState(() => {
    return (router.route === 'teams' || router.route === 'team') ? 'teams' : 'players';
  });

  // Unified player state (player1 = primary, player2 = comparison)
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [stats1, setStats1] = useState(null);
  const [stats2, setStats2] = useState(null);
  const [leagueStats, setLeagueStats] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  // Teams state
  const [standings, setStandings] = useState(null);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Team detail state
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamHittingStats, setTeamHittingStats] = useState(null);
  const [teamPitchingStats, setTeamPitchingStats] = useState(null);
  const [allTeamHitting, setAllTeamHitting] = useState(null);
  const [allTeamPitching, setAllTeamPitching] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);

  // Team roster state
  const [teamRoster, setTeamRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [season, setSeason] = useState(router.season);
  const [isPitcher, setIsPitcher] = useState(false);

  const cardRef = useRef(null);
  const cardContainerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Smooth scroll to card when player data loads
  useEffect(() => {
    if ((stats1 || stats2) && cardContainerRef.current && !loading) {
      setTimeout(() => {
        cardContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [stats1, stats2, loading]);

  // Route restoration — handles initial page load and back/forward navigation
  useEffect(() => {
    // Skip if this change was triggered by user clicks (they already handled state)
    if (router.source === 'user') return;

    const restoreRoute = async () => {
      const routeSeason = router.season;
      setSeason(routeSeason);
      setError(null);

      switch (router.route) {
        case 'home':
          setView('players');
          setPlayer1(null); setPlayer2(null);
          setStats1(null); setStats2(null);
          setIsComparing(false);
          setSelectedTeam(null);
          setTeamHittingStats(null); setTeamPitchingStats(null);
          setTeamRoster(null);
          break;

        case 'player': {
          setView('players');
          setSelectedTeam(null);
          setPlayer2(null); setStats2(null);
          setIsComparing(false);
          setTeamHittingStats(null); setTeamPitchingStats(null);
          setTeamRoster(null);

          const { playerId } = router;
          if (player1?.id === playerId && season === routeSeason) break;

          setLoading(true);
          try {
            const playerObj = await fetchPlayerById(playerId);
            if (playerObj) {
              await fetchPlayerDataInternal(playerObj, routeSeason, 'player1');
            } else {
              setError(`Player #${playerId} not found`);
              setLoading(false);
            }
          } catch {
            setError('Failed to load player');
            setLoading(false);
          }
          break;
        }

        case 'compare': {
          setView('players');
          setSelectedTeam(null);
          setIsComparing(true);
          setTeamHittingStats(null); setTeamPitchingStats(null);
          setTeamRoster(null);

          const { player1Id, player2Id } = router;
          setLoading(true);
          try {
            if (player1?.id !== player1Id) {
              const p1 = await fetchPlayerById(player1Id);
              if (p1) await fetchPlayerDataInternal(p1, routeSeason, 'player1');
              else { setError(`Player #${player1Id} not found`); setLoading(false); break; }
            }
            if (player2?.id !== player2Id) {
              const p2 = await fetchPlayerById(player2Id);
              if (p2) await fetchPlayerDataInternal(p2, routeSeason, 'player2');
              else { setError(`Player #${player2Id} not found`); setLoading(false); break; }
            }
          } catch {
            setError('Failed to load players');
            setLoading(false);
          }
          break;
        }

        case 'teams':
          setView('teams');
          setSelectedTeam(null);
          setPlayer1(null); setPlayer2(null);
          setStats1(null); setStats2(null);
          setIsComparing(false);
          setTeamHittingStats(null); setTeamPitchingStats(null);
          setTeamRoster(null);
          await loadStandingsInternal(routeSeason);
          break;

        case 'team': {
          setView('teams');
          setPlayer1(null); setPlayer2(null);
          setStats1(null); setStats2(null);
          setIsComparing(false);

          const { teamId } = router;
          const data = await loadStandingsInternal(routeSeason);
          const teamRecord = data?.find(r => r.team?.id === teamId);
          if (teamRecord) {
            await loadTeamData(teamRecord, routeSeason);
          } else {
            setError(`Team #${teamId} not found`);
          }
          break;
        }
      }
    };

    restoreRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.route, router.playerId, router.player1Id, router.player2Id, router.teamId, router.season, router.source]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Internal player data fetch — does NOT update URL (used by route restoration)
  const fetchPlayerDataInternal = async (player, seasonYear = season, slot = 'player1') => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    if (slot === 'player1') {
      setPlayer1(player);
    } else if (slot === 'player2') {
      setPlayer2(player);
    }

    try {
      const positionIsPitcher = isPitcherPosition(player);
      let statGroup = positionIsPitcher ? 'pitching' : 'hitting';

      let stats = await fetchPlayerStats(player.id, seasonYear, statGroup, abortController.signal);

      if (!stats) {
        const altGroup = statGroup === 'pitching' ? 'hitting' : 'pitching';
        stats = await fetchPlayerStats(player.id, seasonYear, altGroup, abortController.signal);
        if (stats) statGroup = altGroup;
      }

      if (!stats) {
        throw new Error(`No ${seasonYear} stats found for this player`);
      }

      const showingPitcher = statGroup === 'pitching';
      setIsPitcher(showingPitcher);

      const league = await fetchLeagueStats(seasonYear, statGroup, abortController.signal);

      if (slot === 'player1') {
        setStats1(stats);
        setLeagueStats(league);
      } else if (slot === 'player2') {
        setStats2(stats);
        if (!leagueStats) setLeagueStats(league);
      }

      setError(null);
      return player; // Return player for URL update
    } catch (err) {
      if (err.name === 'AbortError') return null;
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch player data');
      return null;
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  // Player data fetch that also updates the URL (used by UI interactions)
  const fetchPlayerData = async (player, seasonYear = season, slot = 'player1') => {
    const result = await fetchPlayerDataInternal(player, seasonYear, slot);
    if (result) {
      if (slot === 'player2') {
        router.navigate(buildHash(`compare/${player1?.id || result.id}/${player.id}`, seasonYear, latestSeason));
      } else {
        router.navigate(buildHash(`player/${player.id}`, seasonYear, latestSeason));
      }
    }
  };

  const handleSeasonChange = async (newSeason) => {
    setSeason(newSeason);
    setLeagueStats(null);
    setStandings(null);

    // Update URL with new season (replace, not push — back shouldn't undo season changes)
    router.replace(buildHash(router.getCurrentPath(), newSeason, latestSeason));

    if (view === 'players') {
      if (player1) await fetchPlayerDataInternal(player1, newSeason, 'player1');
      if (player2) await fetchPlayerDataInternal(player2, newSeason, 'player2');
    } else if (view === 'teams') {
      await loadStandingsInternal(newSeason);
      if (selectedTeam) {
        const teamId = selectedTeam.team?.id;
        if (teamId) {
          setTeamLoading(true);
          setRosterLoading(true);
          try {
            const [hitting, pitching, allHitting, allPitching, roster] = await Promise.all([
              fetchTeamStats(teamId, newSeason, 'hitting'),
              fetchTeamStats(teamId, newSeason, 'pitching'),
              fetchAllTeamStats(newSeason, 'hitting'),
              fetchAllTeamStats(newSeason, 'pitching'),
              fetchTeamRoster(teamId, newSeason),
            ]);
            setTeamHittingStats(hitting);
            setTeamPitchingStats(pitching);
            setAllTeamHitting(allHitting);
            setAllTeamPitching(allPitching);
            setTeamRoster(roster);
          } catch (err) {
            console.error('Error reloading team stats:', err);
            setError('Failed to load team stats');
          } finally {
            setTeamLoading(false);
            setRosterLoading(false);
          }
        }
      }
    }
  };

  // Fetch Google Fonts CSS and inline all font files as data URIs
  const embedFonts = async () => {
    try {
      const cssUrl = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap';
      const resp = await fetch(cssUrl);
      let cssText = await resp.text();

      // Find all url() references and fetch them sequentially to avoid race conditions
      const urlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
      const matches = [...cssText.matchAll(urlRegex)];

      // Fetch all fonts in parallel, then replace sequentially
      const replacements = await Promise.all(
        matches.map(async (match) => {
          try {
            const fontResp = await fetch(match[1]);
            const blob = await fontResp.blob();
            const dataUri = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            return { url: match[1], dataUri };
          } catch {
            return null;
          }
        })
      );

      for (const r of replacements) {
        if (r) cssText = cssText.replaceAll(r.url, r.dataUri);
      }

      return cssText;
    } catch {
      return null;
    }
  };

  const handleExport = async () => {
    if (!cardRef.current) return;

    const el = cardRef.current;
    const originalSrcs = [];

    try {
      const { toPng } = await import('html-to-image');

      // Step 1: Fetch and embed Google Fonts as data URIs
      const fontCss = await embedFonts();

      // Step 2: Pre-convert external images to inline data URIs
      const images = el.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(async (img, i) => {
          originalSrcs[i] = img.src;
          if (!img.src || img.src.startsWith('data:')) return;
          try {
            const resp = await fetch(img.src, { mode: 'cors' });
            const blob = await resp.blob();
            img.src = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          } catch {
            // CORS blocked - leave original src
          }
        })
      );

      // Step 3: Disable animations during capture
      el.classList.add('export-capture');

      const bgColor = theme === 'dark' ? '#16161f' : '#ffffff';

      const options = {
        backgroundColor: bgColor,
        pixelRatio: 2,
        quality: 1,
        cacheBust: true,
        // Pass font CSS directly - bypasses the library's broken cross-origin font fetch
        ...(fontCss ? { fontEmbedCSS: fontCss } : {}),
        filter: (node) => {
          try {
            if (node?.classList?.contains('opacity-0')) return false;
          } catch { /* ignore */ }
          return true;
        },
      };

      // Double-render: first pass ensures fonts are loaded, second captures
      await toPng(el, options).catch(() => {});
      const dataUrl = await toPng(el, options);

      // Restore everything
      images.forEach((img, i) => {
        if (originalSrcs[i]) img.src = originalSrcs[i];
      });
      el.classList.remove('export-capture');

      const link = document.createElement('a');
      const playerName = player2
        ? `${player1?.lastName || 'Player1'}_vs_${player2?.lastName || 'Player2'}`
        : player1?.fullName?.replace(/\s+/g, '_') || 'player';
      link.download = `${playerName}_${season}_stats.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err?.message || err, err);
      el.querySelectorAll('img').forEach((img, i) => {
        if (originalSrcs[i]) img.src = originalSrcs[i];
      });
      el.classList.remove('export-capture');
      setError('Failed to export image. Check console for details.');
    }
  };

  const handleQuickSelect = async (name) => {
    setLoading(true);
    try {
      const results = await searchPlayers(name);
      if (results.length > 0) {
        await fetchPlayerData(results[0], season, 'player1'); // fetchPlayerData handles URL
      } else {
        setError(`No player found for "${name}"`);
        setLoading(false);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Failed to search for player');
        setLoading(false);
      }
    }
  };

  const handleViewChange = async (newView) => {
    setView(newView);
    setError(null);
    if (newView === 'teams') {
      setSelectedTeam(null);
      router.navigate(buildHash('teams', season, latestSeason));
      if (!standings) await loadStandingsInternal(season);
    } else {
      router.navigate(buildHash('', season, latestSeason));
    }
  };

  const loadStandingsInternal = async (seasonYear) => {
    setTeamsLoading(true);
    setError(null);
    try {
      const data = await fetchStandings(seasonYear);
      setStandings(data);
      return data;
    } catch (err) {
      console.error('Error loading standings:', err);
      setError('Failed to load standings');
      return null;
    } finally {
      setTeamsLoading(false);
    }
  };

  // Internal team data loader — does NOT update URL
  const loadTeamData = async (team, seasonYear = season) => {
    const teamId = team.team?.id;
    if (!teamId) return;

    setSelectedTeam(team);
    setTeamLoading(true);
    setRosterLoading(true);
    setTeamHittingStats(null);
    setTeamPitchingStats(null);
    setTeamRoster(null);
    setError(null);

    try {
      const [hitting, pitching, allHitting, allPitching, roster] = await Promise.all([
        fetchTeamStats(teamId, seasonYear, 'hitting'),
        fetchTeamStats(teamId, seasonYear, 'pitching'),
        fetchAllTeamStats(seasonYear, 'hitting'),
        fetchAllTeamStats(seasonYear, 'pitching'),
        fetchTeamRoster(teamId, seasonYear),
      ]);

      setTeamHittingStats(hitting);
      setTeamPitchingStats(pitching);
      setAllTeamHitting(allHitting);
      setAllTeamPitching(allPitching);
      setTeamRoster(roster);
    } catch (err) {
      console.error('Error loading team stats:', err);
      setError('Failed to load team stats');
    } finally {
      setTeamLoading(false);
      setRosterLoading(false);
    }
  };

  const handleSelectTeam = (team) => {
    const teamId = team.team?.id;
    if (!teamId) return;

    setView('teams');
    loadTeamData(team, season);
    router.navigate(buildHash(`team/${teamId}`, season, latestSeason));
  };

  const handleBackToStandings = () => {
    setSelectedTeam(null);
    setTeamHittingStats(null);
    setTeamPitchingStats(null);
    setTeamRoster(null);
    router.navigate(buildHash('teams', season, latestSeason));
  };

  const handleGoHome = () => {
    setView('players');
    setPlayer1(null); setPlayer2(null);
    setStats1(null); setStats2(null);
    setIsComparing(false);
    setSelectedTeam(null);
    setTeamHittingStats(null); setTeamPitchingStats(null);
    setAllTeamHitting(null); setAllTeamPitching(null);
    setTeamRoster(null);
    setLeagueStats(null);
    setStandings(null);
    setError(null);
    router.navigate(buildHash('', season, latestSeason));
  };

  const handleStartCompare = () => {
    setIsComparing(true);
  };

  const handleClearComparison = () => {
    setPlayer2(null);
    setStats2(null);
    setIsComparing(false);
    if (player1) {
      router.navigate(buildHash(`player/${player1.id}`, season, latestSeason));
    } else {
      router.navigate(buildHash('', season, latestSeason));
    }
  };

  const handleRosterPlayerClick = async (person) => {
    setView('players');
    setSelectedTeam(null);
    setTeamHittingStats(null); setTeamPitchingStats(null);
    setTeamRoster(null);
    setPlayer2(null); setStats2(null);
    setIsComparing(false);
    router.navigate(buildHash(`player/${person.id}`, season, latestSeason));
    await fetchPlayerDataInternal(person, season, 'player1');
  };

  const hasPlayer1 = player1 && stats1 && !loading;
  const hasPlayer2 = player2 && stats2;
  const showSingleCard = view === 'players' && hasPlayer1 && !hasPlayer2;
  const showCompare = view === 'players' && hasPlayer1 && hasPlayer2 && !loading;
  const showTeams = view === 'teams';

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary theme-transition">
      {/* Header */}
      <header className="border-b border-border theme-transition sticky top-0 bg-bg-primary/95 backdrop-blur-sm z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo - clickable to go home */}
            <button
              onClick={handleGoHome}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              title="Go to home"
            >
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-xl">⚾</span>
              </div>
              <div>
                <h1 className="font-display text-2xl tracking-wide text-text-primary">
                  MLB VISUALIZER
                </h1>
              </div>
            </button>

            {/* Controls */}
            <nav className="flex items-center gap-3" aria-label="Main navigation">
              <ViewToggle view={view} onToggle={handleViewChange} />

              <select
                value={season}
                onChange={(e) => handleSeasonChange(parseInt(e.target.value, 10))}
                className="px-3 py-2 bg-bg-input border border-border rounded-lg text-text-primary text-sm font-bold focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 cursor-pointer theme-transition"
                aria-label="Select season year"
              >
                {AVAILABLE_SEASONS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Section - players view only */}
        {view === 'players' && (
          <div className="mb-8 relative z-30">
            <div className="max-w-xl">
              <PlayerSearch
                onSelect={(p) => fetchPlayerData(p, season, 'player1')}
                loading={loading}
                placeholder="Search any player..."
              />
            </div>

            {/* Second search when comparing */}
            {isComparing && hasPlayer1 && (
              <div className="max-w-xl mt-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-text-muted">Compare with:</label>
                  <button
                    onClick={handleClearComparison}
                    className="text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <PlayerSearch
                  onSelect={(p) => fetchPlayerData(p, season, 'player2')}
                  loading={loading}
                  placeholder="Search second player..."
                />
                {player2 && (
                  <div className="mt-2 text-sm text-text-secondary">
                    Comparing with: <span className="font-medium text-text-primary">{player2.fullName}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-accent-soft border border-accent/30 rounded-xl p-4 mb-6 theme-transition animate-fade-in">
            <p className="text-accent">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20 animate-fade-in">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted">Loading player data...</p>
            </div>
          </div>
        )}

        {/* Single Player Card */}
        {showSingleCard && (
          <div className="animate-fade-in" ref={cardContainerRef}>
            <div className="flex justify-between items-center mb-4">
              {/* Compare button */}
              {!isComparing && (
                <button
                  onClick={handleStartCompare}
                  className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary hover:bg-bg-elevated border border-border rounded-lg text-text-secondary hover:text-text-primary font-medium transition-all theme-transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Compare with...
                </button>
              )}
              {isComparing && <div />}

              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-text-inverse rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PNG
              </button>
            </div>
            <div className="overflow-x-auto pb-4">
              <PlayerCard
                ref={cardRef}
                player={player1}
                playerStats={stats1}
                leagueStats={leagueStats}
                season={season}
                isPitcher={isPitcher}
                onCompare={handleStartCompare}
                onSelectTeam={handleSelectTeam}
                standings={standings}
              />
            </div>
          </div>
        )}

        {/* Compare View */}
        {showCompare && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={handleClearComparison}
                className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary hover:bg-bg-elevated border border-border rounded-lg text-text-secondary hover:text-text-primary font-medium transition-all theme-transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear comparison
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-text-inverse rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PNG
              </button>
            </div>
            <div ref={cardRef}>
              <CompareView
                player1={player1}
                player2={player2}
                stats1={stats1}
                stats2={stats2}
                leagueStats={leagueStats}
                isPitcher={isPitcher}
                season={season}
                onSelectTeam={handleSelectTeam}
                standings={standings}
              />
            </div>
          </div>
        )}

        {/* Team Detail View */}
        {showTeams && selectedTeam && (
          <div className="animate-fade-in">
            {teamLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-text-muted">Loading team stats...</p>
                </div>
              </div>
            )}
            <div className="overflow-x-auto pb-4">
              <TeamCard
                team={selectedTeam}
                season={season}
                hittingStats={teamHittingStats}
                pitchingStats={teamPitchingStats}
                allTeamHitting={allTeamHitting}
                allTeamPitching={allTeamPitching}
                onBack={handleBackToStandings}
                roster={teamRoster}
                rosterLoading={rosterLoading}
                onPlayerClick={handleRosterPlayerClick}
              />
            </div>
          </div>
        )}

        {/* Teams/Standings View */}
        {showTeams && !selectedTeam && (
          <Standings standings={standings} season={season} loading={teamsLoading} onSelectTeam={handleSelectTeam} />
        )}

        {/* Empty State */}
        {!player1 && !loading && view === 'players' && (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-7xl mb-6">⚾</div>
            <h2 className="font-display text-4xl text-text-primary mb-3 tracking-wide">
              SEARCH ANY PLAYER
            </h2>
            <p className="text-text-muted max-w-md mx-auto mb-8">
              See how they rank against the league with detailed percentile breakdowns
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <span className="text-text-muted">Try:</span>
              {['Shohei Ohtani', 'Aaron Judge', 'Mookie Betts', 'Gerrit Cole'].map(name => (
                <button
                  key={name}
                  onClick={() => handleQuickSelect(name)}
                  className="px-4 py-2 bg-bg-tertiary hover:bg-bg-elevated border border-border rounded-full text-text-secondary hover:text-text-primary transition-all theme-transition"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        {(showSingleCard || showCompare) && (
          <div className="mt-8 p-5 bg-bg-card rounded-xl border border-border theme-transition animate-fade-in">
            <h3 className="text-xs font-bold text-text-muted tracking-wide mb-4">PERCENTILE LEGEND</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              {[
                { color: PERCENTILE_COLORS.elite, label: 'Elite (80-100%)' },
                { color: PERCENTILE_COLORS.aboveAvg, label: 'Above Avg (60-79%)' },
                { color: PERCENTILE_COLORS.average, label: 'Average (40-59%)' },
                { color: PERCENTILE_COLORS.belowAvg, label: 'Below Avg (20-39%)' },
                { color: PERCENTILE_COLORS.poor, label: 'Poor (0-19%)' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                  <span className="text-text-secondary">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto theme-transition">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-text-muted">
          <span>Data from MLB Stats API • Not affiliated with MLB</span>
          <span>v3.5.2</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
