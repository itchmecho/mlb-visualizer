// Hash-based router for browser history support
// v2.0.0 | 2026-02-06

import { useState, useEffect, useCallback, useRef } from 'react';

// Route patterns — more specific first
const ROUTE_PATTERNS = [
  { pattern: /^\/compare\/(\d+)\/(\d+)$/, route: 'compare', extract: (m) => ({ player1Id: +m[1], player2Id: +m[2] }) },
  { pattern: /^\/player\/(\d+)$/, route: 'player', extract: (m) => ({ playerId: +m[1] }) },
  { pattern: /^\/team\/(\d+)$/, route: 'team', extract: (m) => ({ teamId: +m[1] }) },
  { pattern: /^\/teams\/?$/, route: 'teams', extract: () => ({}) },
  { pattern: /^\/leaders\/?$/, route: 'leaders', extract: () => ({}) },
  { pattern: /^\/scoreboard\/?$/, route: 'scoreboard', extract: () => ({}) },
  { pattern: /^\/bracket\/?$/, route: 'bracket', extract: () => ({}) },
  { pattern: /^\/?$/, route: 'home', extract: () => ({}) },
];

function parseHash(hash) {
  const raw = hash.replace(/^#\/?/, '/');
  const qsIndex = raw.indexOf('?');
  const path = qsIndex >= 0 ? raw.slice(0, qsIndex) : raw;
  const qs = qsIndex >= 0 ? raw.slice(qsIndex + 1) : '';
  const params = Object.fromEntries(new URLSearchParams(qs));
  return { path: path || '/', params };
}

function matchRoute(path) {
  for (const { pattern, route, extract } of ROUTE_PATTERNS) {
    const match = path.match(pattern);
    if (match) return { route, ...extract(match) };
  }
  return { route: 'home' };
}

export function buildHash(path, season, defaultSeason) {
  const seasonParam = season && season !== defaultSeason ? `?season=${season}` : '';
  return `#/${path}${seasonParam}`;
}

export function useHashRouter(defaultSeason) {
  const [routeState, setRouteState] = useState(() => {
    const { path, params } = parseHash(window.location.hash);
    const matched = matchRoute(path);
    const season = params.season ? +params.season : defaultSeason;
    return { ...matched, season };
  });

  // Track whether a hash change was triggered by us (navigate/replace)
  // vs the user pressing back/forward
  const programmaticRef = useRef(false);

  useEffect(() => {
    const handleHashChange = () => {
      if (programmaticRef.current) {
        programmaticRef.current = false;
        return;
      }
      // This is a back/forward navigation — update state from URL
      const { path, params } = parseHash(window.location.hash);
      const matched = matchRoute(path);
      const season = params.season ? +params.season : defaultSeason;
      setRouteState(prev => {
        const next = { ...matched, season, source: 'popstate' };
        // Avoid unnecessary re-renders if nothing changed
        if (prev.route === next.route && prev.season === next.season &&
            prev.playerId === next.playerId && prev.player1Id === next.player1Id &&
            prev.player2Id === next.player2Id && prev.teamId === next.teamId) {
          return prev;
        }
        return next;
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [defaultSeason]);

  // Push a new history entry (for view changes)
  const navigate = useCallback((hash) => {
    programmaticRef.current = true;
    window.location.hash = hash;
    const { path, params } = parseHash(hash);
    const matched = matchRoute(path);
    const season = params.season ? +params.season : defaultSeason;
    setRouteState({ ...matched, season, source: 'user' });
  }, [defaultSeason]);

  // Replace current entry (for season changes — no new history entry)
  const replace = useCallback((hash) => {
    programmaticRef.current = true;
    const url = new URL(window.location.href);
    url.hash = hash;
    window.history.replaceState(null, '', url.toString());
    const { path, params } = parseHash(hash);
    const matched = matchRoute(path);
    const season = params.season ? +params.season : defaultSeason;
    setRouteState({ ...matched, season, source: 'user' });
  }, [defaultSeason]);

  // Get the current path portion (without season) for rebuilding hashes
  const getCurrentPath = useCallback(() => {
    const { route } = routeState;
    switch (route) {
      case 'player': return `player/${routeState.playerId}`;
      case 'compare': return `compare/${routeState.player1Id}/${routeState.player2Id}`;
      case 'team': return `team/${routeState.teamId}`;
      case 'teams': return 'teams';
      case 'leaders': return 'leaders';
      case 'scoreboard': return 'scoreboard';
      case 'bracket': return 'bracket';
      default: return '';
    }
  }, [routeState]);

  return { ...routeState, navigate, replace, getCurrentPath };
}
