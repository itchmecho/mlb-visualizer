// PlayerSearch component - Search input with autocomplete
// v1.2.0 | 2026-02-04

import React, { useState, useEffect, useRef } from 'react';
import { searchPlayers } from '../utils/api';
import { getTeamData, getPlayerHeadshotUrl } from '../utils/teamData';

const PlayerSearch = ({ onSelect, loading, placeholder = "Search for a player..." }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (query.length < 2) {
      setResults([]);
      setSearchedOnce(false);
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const players = await searchPlayers(query, abortController.signal);
        if (!abortController.signal.aborted) {
          setResults(players);
          setSearchedOnce(true);
        }
      } catch (err) {
        if (err.name !== 'AbortError' && !abortController.signal.aborted) {
          setResults([]);
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
  }, [query]);

  const handleSelect = (player) => {
    onSelect(player);
    setQuery('');
    setResults([]);
    setSearchedOnce(false);
  };

  // Player avatar fallback component
  const PlayerAvatar = ({ playerId }) => {
    const [imgError, setImgError] = useState(false);

    if (imgError) {
      return (
        <div className="w-10 h-10 bg-bg-tertiary rounded-full flex items-center justify-center text-text-muted">
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
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-bg-input border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all theme-transition"
            disabled={loading}
          />
          {/* Search icon */}
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Loading spinner */}
        {(searching || loading) && (
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Results dropdown */}
      {query.length >= 2 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border rounded-xl overflow-hidden shadow-theme-xl z-50 max-h-80 overflow-y-auto theme-transition">
          {results.length > 0 ? (
            results.map(player => {
              const teamData = getTeamData(player.currentTeam?.name);

              return (
                <button
                  key={player.id}
                  onClick={() => handleSelect(player)}
                  className="w-full px-4 py-3 text-left hover:bg-bg-elevated transition-colors flex items-center gap-3 border-b border-border-light last:border-0"
                >
                  <PlayerAvatar playerId={player.id} />

                  <div className="flex-1 min-w-0">
                    <div className="text-text-primary font-medium truncate">
                      {player.fullName}
                    </div>
                    <div className="text-sm text-text-muted flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: teamData.primary }}
                      />
                      <span className="truncate">
                        {player.currentTeam?.name || 'Free Agent'}
                      </span>
                      <span className="text-text-muted">•</span>
                      <span className="text-text-muted">
                        {player.primaryPosition?.abbreviation}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          ) : searchedOnce && !searching ? (
            <div className="px-4 py-6 text-center text-text-muted">
              No players found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default PlayerSearch;
