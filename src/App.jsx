// MLB Player Visualizer - Main App
// v2.2.0 | 2026-02-04

import React, { useState, useRef, useEffect } from 'react';
import PlayerSearch from './components/PlayerSearch';
import PlayerCard from './components/PlayerCard';
import CompareView from './components/CompareView';
import Standings from './components/Standings';
import { fetchPlayerStats, fetchLeagueStats, isPitcherPosition, searchPlayers, fetchStandings } from './utils/api';
import { PERCENTILE_COLORS } from './utils/percentile';

// Generate available seasons from 2001 to last completed season
// 2026 season starts on Opening Day (late March), so exclude until then
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

// Mode toggle component
const ModeToggle = ({ mode, onToggle }) => (
  <div className="flex bg-bg-tertiary rounded-lg p-1 border border-border theme-transition">
    <button
      onClick={() => onToggle('single')}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
        mode === 'single'
          ? 'bg-accent text-text-inverse shadow-sm'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      Single
    </button>
    <button
      onClick={() => onToggle('compare')}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
        mode === 'compare'
          ? 'bg-accent text-text-inverse shadow-sm'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      Compare
    </button>
    <button
      onClick={() => onToggle('teams')}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
        mode === 'teams'
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

  // Mode state (single or compare)
  const [mode, setMode] = useState('single');

  // Single player state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [leagueStats, setLeagueStats] = useState(null);

  // Compare mode state
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [stats1, setStats1] = useState(null);
  const [stats2, setStats2] = useState(null);

  // Teams mode state
  const [standings, setStandings] = useState(null);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [season, setSeason] = useState(latestSeason);
  const [isPitcher, setIsPitcher] = useState(false);

  const cardRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const fetchPlayerData = async (player, seasonYear = season, slot = 'single') => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    if (slot === 'single') {
      setSelectedPlayer(player);
    } else if (slot === 'player1') {
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

      if (slot === 'single') {
        setPlayerStats(stats);
        setLeagueStats(league);
      } else if (slot === 'player1') {
        setStats1(stats);
        setLeagueStats(league);
      } else if (slot === 'player2') {
        setStats2(stats);
        if (!leagueStats) setLeagueStats(league);
      }

      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch player data');
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleSeasonChange = async (newSeason) => {
    setSeason(newSeason);
    setLeagueStats(null); // Clear cache to refetch for new season
    setStandings(null); // Clear standings for new season

    if (mode === 'single' && selectedPlayer) {
      await fetchPlayerData(selectedPlayer, newSeason, 'single');
    } else if (mode === 'compare') {
      if (player1) await fetchPlayerData(player1, newSeason, 'player1');
      if (player2) await fetchPlayerData(player2, newSeason, 'player2');
    } else if (mode === 'teams') {
      await loadStandings(newSeason);
    }
  };

  const handleExport = async () => {
    if (!cardRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: theme === 'dark' ? '#16161f' : '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const link = document.createElement('a');
      const playerName = mode === 'compare'
        ? `${player1?.lastName || 'Player1'}_vs_${player2?.lastName || 'Player2'}`
        : selectedPlayer?.fullName?.replace(/\s+/g, '_') || 'player';
      link.download = `${playerName}_${season}_stats.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export image');
    }
  };

  const handleQuickSelect = async (name) => {
    setLoading(true);
    try {
      const results = await searchPlayers(name);
      if (results.length > 0) {
        await fetchPlayerData(results[0], season, 'single');
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

  const handleModeChange = async (newMode) => {
    setMode(newMode);
    setError(null);
    // Clear state when switching modes
    if (newMode === 'single') {
      setPlayer1(null);
      setPlayer2(null);
      setStats1(null);
      setStats2(null);
    } else if (newMode === 'compare') {
      setSelectedPlayer(null);
      setPlayerStats(null);
    } else if (newMode === 'teams') {
      setSelectedPlayer(null);
      setPlayerStats(null);
      setPlayer1(null);
      setPlayer2(null);
      setStats1(null);
      setStats2(null);
      // Fetch standings if not already loaded for this season
      if (!standings) {
        await loadStandings(season);
      }
    }
  };

  const loadStandings = async (seasonYear) => {
    setTeamsLoading(true);
    setError(null);
    try {
      const data = await fetchStandings(seasonYear);
      setStandings(data);
    } catch (err) {
      console.error('Error loading standings:', err);
      setError('Failed to load standings');
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleGoHome = () => {
    setMode('single');
    setSelectedPlayer(null);
    setPlayerStats(null);
    setPlayer1(null);
    setPlayer2(null);
    setStats1(null);
    setStats2(null);
    setStandings(null);
    setLeagueStats(null);
    setError(null);
  };

  const showCard = mode === 'single' && selectedPlayer && playerStats && !loading;
  const showCompare = mode === 'compare' && (player1 || player2) && !loading;
  const showTeams = mode === 'teams';

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
            <div className="flex items-center gap-3">
              <ModeToggle mode={mode} onToggle={handleModeChange} />

              <select
                value={season}
                onChange={(e) => handleSeasonChange(parseInt(e.target.value, 10))}
                className="px-3 py-2 bg-bg-input border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent cursor-pointer theme-transition"
              >
                {AVAILABLE_SEASONS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Section - hidden in teams mode */}
        {mode !== 'teams' && (
        <div className="mb-8">
          {mode === 'single' ? (
            <div className="max-w-xl">
              <PlayerSearch onSelect={(p) => fetchPlayerData(p, season, 'single')} loading={loading} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Player 1</label>
                <PlayerSearch
                  onSelect={(p) => fetchPlayerData(p, season, 'player1')}
                  loading={loading}
                  placeholder="Search first player..."
                />
                {player1 && (
                  <div className="mt-2 text-sm text-text-secondary">
                    Selected: <span className="font-medium text-text-primary">{player1.fullName}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Player 2</label>
                <PlayerSearch
                  onSelect={(p) => fetchPlayerData(p, season, 'player2')}
                  loading={loading}
                  placeholder="Search second player..."
                />
                {player2 && (
                  <div className="mt-2 text-sm text-text-secondary">
                    Selected: <span className="font-medium text-text-primary">{player2.fullName}</span>
                  </div>
                )}
              </div>
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
        {showCard && (
          <div className="animate-fade-in">
            <div className="flex justify-end mb-4">
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
                player={selectedPlayer}
                playerStats={playerStats}
                leagueStats={leagueStats}
                season={season}
                isPitcher={isPitcher}
              />
            </div>
          </div>
        )}

        {/* Compare View */}
        {showCompare && (
          <div className="animate-fade-in">
            <div className="flex justify-end mb-4">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-text-inverse rounded-lg font-medium transition-colors"
                disabled={!player1 || !player2}
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
              />
            </div>
          </div>
        )}

        {/* Teams/Standings View */}
        {showTeams && (
          <Standings standings={standings} season={season} loading={teamsLoading} />
        )}

        {/* Empty State */}
        {!selectedPlayer && !player1 && !player2 && !loading && mode !== 'teams' && (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-7xl mb-6">⚾</div>
            <h2 className="font-display text-4xl text-text-primary mb-3 tracking-wide">
              {mode === 'single' ? 'SEARCH ANY PLAYER' : 'COMPARE TWO PLAYERS'}
            </h2>
            <p className="text-text-muted max-w-md mx-auto mb-8">
              {mode === 'single'
                ? 'See how they rank against the league with detailed percentile breakdowns'
                : 'Go head-to-head with side-by-side stat comparisons'}
            </p>
            {mode === 'single' && (
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
            )}
          </div>
        )}

        {/* Legend */}
        {(showCard || showCompare) && (
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
          <span>v2.2.0</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
