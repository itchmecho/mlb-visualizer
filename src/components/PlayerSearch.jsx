// PlayerSearch component - Search input with autocomplete (players + teams)
// v1.5.0 | 2026-02-14

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { searchPlayers } from '../utils/api';
import { getTeamData, getPlayerHeadshotUrl, getTeamLogoUrl, TEAM_DATA } from '../utils/teamData';

// Historical/defunct names to exclude from team search
const EXCLUDED_TEAMS = ['Indians', 'Florida', 'Expos', 'Devil Rays', 'Anaheim'];

const PlayerSearch = ({ onSelect, onTeamSelect, loading, placeholder = "Search for a player or team..." }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const abortControllerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Build searchable team list (once)
  const teamList = useMemo(() =>
    Object.entries(TEAM_DATA)
      .filter(([name]) => !EXCLUDED_TEAMS.some(ex => name.includes(ex)))
      .map(([name, data]) => ({ _type: 'team', teamName: name, ...data })),
    []
  );

  // Local team search — instant, no API call
  const searchTeams = (q) => {
    const lower = q.toLowerCase();
    return teamList.filter(t =>
      t.teamName.toLowerCase().includes(lower) ||
      t.abbr.toLowerCase() === lower
    ).slice(0, 5);
  };

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (query.length < 2) {
      setResults([]);
      setSearchedOnce(false);
      setFocusedIndex(-1);
      return;
    }

    // Show team matches instantly while API loads
    const teamMatches = onTeamSelect ? searchTeams(query) : [];
    if (teamMatches.length > 0) {
      setResults(teamMatches);
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const players = await searchPlayers(query, abortController.signal);
        if (!abortController.signal.aborted) {
          const teamMatches = onTeamSelect ? searchTeams(query) : [];
          const playerResults = players.map(p => ({ _type: 'player', ...p }));
          setResults([...teamMatches, ...playerResults]);
          setSearchedOnce(true);
          setFocusedIndex(-1);
        }
      } catch (err) {
        if (err.name !== 'AbortError' && !abortController.signal.aborted) {
          // Keep team results if API fails
          const teamMatches = onTeamSelect ? searchTeams(query) : [];
          setResults(teamMatches);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSelect = (item) => {
    if (item._type === 'team' && onTeamSelect) {
      onTeamSelect({ team: { id: item.id, name: item.teamName } });
    } else {
      onSelect(item);
    }
    setQuery('');
    setResults([]);
    setSearchedOnce(false);
    setFocusedIndex(-1);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearchedOnce(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!results.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[focusedIndex]);
    } else if (e.key === 'Escape') {
      setResults([]);
      setFocusedIndex(-1);
      inputRef.current?.blur();
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // Player avatar fallback component
  const PlayerAvatar = ({ playerId, playerName }) => {
    const [imgError, setImgError] = useState(false);

    if (imgError) {
      return (
        <div className="w-10 h-10 bg-bg-tertiary rounded-full flex items-center justify-center text-text-muted" aria-hidden="true">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      );
    }

    return (
      <div className="w-10 h-10 bg-bg-tertiary rounded-full overflow-hidden flex-shrink-0">
        <img
          src={getPlayerHeadshotUrl(playerId)}
          alt={`${playerName} headshot`}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  };

  const showDropdown = query.length >= 2 && !loading;
  const listboxId = 'player-search-listbox';

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-10 bg-bg-input border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all theme-transition"
            disabled={loading}
            role="combobox"
            aria-expanded={showDropdown && results.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={focusedIndex >= 0 ? `search-option-${focusedIndex}` : undefined}
            aria-label="Search for a player or team"
            autoComplete="off"
          />
          {query ? (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Clear search"
              tabIndex={-1}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* Loading spinner */}
        {(searching || loading) && (
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading">
            <span className="sr-only">Searching...</span>
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {showDropdown && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border rounded-xl overflow-hidden shadow-theme-xl z-50 max-h-80 overflow-y-auto theme-transition"
        >
          {results.length > 0 ? (
            results.map((item, index) => {
              if (item._type === 'team') {
                return (
                  <button
                    key={`team-${item.id}`}
                    id={`search-option-${index}`}
                    role="option"
                    aria-selected={focusedIndex === index}
                    onClick={() => handleSelect(item)}
                    className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 border-b border-border-light last:border-0 focus:outline-none ${
                      focusedIndex === index
                        ? 'bg-bg-elevated'
                        : 'hover:bg-bg-elevated'
                    }`}
                  >
                    <div className="w-10 h-10 bg-bg-tertiary rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center p-1.5">
                      <img
                        src={getTeamLogoUrl(item.id)}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-text-primary font-medium truncate">
                        {item.teamName}
                      </div>
                      <div className="text-sm text-text-muted flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.primary }}
                          aria-hidden="true"
                        />
                        <span>Team</span>
                      </div>
                    </div>
                  </button>
                );
              }

              // Player result
              const teamData = getTeamData(item.currentTeam?.name);
              return (
                <button
                  key={item.id}
                  id={`search-option-${index}`}
                  role="option"
                  aria-selected={focusedIndex === index}
                  onClick={() => handleSelect(item)}
                  className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 border-b border-border-light last:border-0 focus:outline-none ${
                    focusedIndex === index
                      ? 'bg-bg-elevated'
                      : 'hover:bg-bg-elevated'
                  }`}
                >
                  <PlayerAvatar playerId={item.id} playerName={item.fullName} />

                  <div className="flex-1 min-w-0">
                    <div className="text-text-primary font-medium truncate">
                      {item.fullName}
                    </div>
                    <div className="text-sm text-text-muted flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: teamData.primary }}
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {item.currentTeam?.name || 'Free Agent'}
                      </span>
                      <span className="text-text-muted" aria-hidden="true">•</span>
                      <span className="text-text-muted">
                        {item.primaryPosition?.abbreviation}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          ) : searchedOnce && !searching ? (
            <div className="px-4 py-6 text-center text-text-muted" role="status">
              No results found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default PlayerSearch;
