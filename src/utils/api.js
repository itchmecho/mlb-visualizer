// MLB Stats API utilities
// v1.3.0 | 2026-02-05

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

// Qualification thresholds (MLB standards)
export const MIN_IP_QUALIFIED = 50;  // Minimum innings pitched for qualified pitchers
export const MIN_PA_QUALIFIED = 200; // Minimum plate appearances for qualified hitters

// Cache for league stats (key: "season-group", value: stats array)
const leagueStatsCache = new Map();

/**
 * Calculate derived hitting stats (extraBaseHits, totalBases, iso)
 * Single source of truth for these calculations
 * @param {Object} stat - Raw stat object
 * @returns {Object} Stat object with calculated fields added
 */
export const enhanceHittingStats = (stat) => {
  if (!stat) return stat;

  const enhanced = { ...stat };

  const doubles = parseInt(stat.doubles, 10) || 0;
  const triples = parseInt(stat.triples, 10) || 0;
  const homeRuns = parseInt(stat.homeRuns, 10) || 0;
  const hits = parseInt(stat.hits, 10) || 0;

  // Extra base hits
  enhanced.extraBaseHits = doubles + triples + homeRuns;

  // Total bases
  const singles = hits - enhanced.extraBaseHits;
  enhanced.totalBases = singles + (doubles * 2) + (triples * 3) + (homeRuns * 4);

  // ISO (Isolated Power)
  const slg = parseFloat(stat.slg) || 0;
  const avg = parseFloat(stat.avg) || 0;
  enhanced.iso = (slg - avg).toFixed(3);

  return enhanced;
};

/**
 * Search for players by name
 * @param {string} query - Search query
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Array>} Array of player objects
 */
export const searchPlayers = async (query, signal) => {
  if (!query || query.length < 2) return [];

  try {
    const response = await fetch(
      `${MLB_API_BASE}/people/search?names=${encodeURIComponent(query)}&sportIds=1&active=true&hydrate=currentTeam,team`,
      { signal }
    );
    const data = await response.json();
    return data.people?.slice(0, 10) || [];
  } catch (error) {
    if (error.name === 'AbortError') {
      return []; // Request was cancelled, not an error
    }
    console.error('Search error:', error);
    throw error; // Re-throw so caller can handle
  }
};

/**
 * Fetch player's season stats
 * @param {number} playerId - Player ID
 * @param {number} season - Season year
 * @param {string} group - 'hitting' or 'pitching'
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Object|null>} Player stats object or null
 */
export const fetchPlayerStats = async (playerId, season, group, signal) => {
  try {
    const response = await fetch(
      `${MLB_API_BASE}/people/${playerId}/stats?stats=season&season=${season}&group=${group}`,
      { signal }
    );
    const data = await response.json();
    const stat = data.stats?.[0]?.splits?.[0]?.stat || null;

    // Enhance hitting stats with calculated fields
    if (stat && group === 'hitting') {
      return enhanceHittingStats(stat);
    }

    return stat;
  } catch (error) {
    if (error.name === 'AbortError') {
      return null; // Request was cancelled
    }
    console.error('Player stats error:', error);
    throw error;
  }
};

/**
 * Fetch league-wide stats for percentile calculation
 * Results are cached by season+group to avoid redundant API calls
 * @param {number} season - Season year
 * @param {string} group - 'hitting' or 'pitching'
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Array>} Array of player stat objects
 */
export const fetchLeagueStats = async (season, group, signal) => {
  const cacheKey = `${season}-${group}`;

  // Return cached data if available
  if (leagueStatsCache.has(cacheKey)) {
    return leagueStatsCache.get(cacheKey);
  }

  try {
    const sortStat = group === 'pitching' ? 'inningsPitched' : 'plateAppearances';

    const response = await fetch(
      `${MLB_API_BASE}/stats?stats=season&season=${season}&group=${group}&gameType=R&sportIds=1&limit=500&sortStat=${sortStat}&order=desc`,
      { signal }
    );
    const data = await response.json();

    const allStats = data.stats?.[0]?.splits?.map(s => s.stat) || [];

    // Filter for qualified players
    const minThreshold = group === 'pitching' ? MIN_IP_QUALIFIED : MIN_PA_QUALIFIED;

    const qualifiedStats = allStats.filter(s => {
      if (group === 'pitching') {
        const ip = parseFloat(s?.inningsPitched) || 0;
        return ip >= minThreshold;
      } else {
        const pa = parseInt(s?.plateAppearances, 10) || 0;
        return pa >= minThreshold;
      }
    });

    // Enhance hitting stats with calculated fields
    const enhancedStats = group === 'hitting'
      ? qualifiedStats.map(enhanceHittingStats)
      : qualifiedStats;

    // Cache the results
    leagueStatsCache.set(cacheKey, enhancedStats);

    return enhancedStats;
  } catch (error) {
    if (error.name === 'AbortError') {
      return [];
    }
    console.error('League stats error:', error);
    throw error;
  }
};

/**
 * Clear the league stats cache (useful for testing or forced refresh)
 */
export const clearLeagueStatsCache = () => {
  leagueStatsCache.clear();
};

/**
 * Determine if a player is a pitcher based on their position
 * @param {Object} player - Player object with primaryPosition
 * @returns {boolean} True if pitcher
 */
export const isPitcherPosition = (player) => {
  const pitcherPositions = ['P', 'SP', 'RP', 'CL', 'TWP'];
  return pitcherPositions.includes(player?.primaryPosition?.abbreviation);
};

// Cache for standings (key: season, value: standings array)
const standingsCache = new Map();

/**
 * Fetch MLB standings for a season
 * @param {number} season - Season year
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Array>} Array of team standings
 */
export const fetchStandings = async (season, signal) => {
  const cacheKey = `${season}`;

  // Return cached data if available
  if (standingsCache.has(cacheKey)) {
    return standingsCache.get(cacheKey);
  }

  try {
    // leagueId: 103 = American League, 104 = National League
    const response = await fetch(
      `${MLB_API_BASE}/standings?leagueId=103,104&season=${season}&standingsTypes=regularSeason&hydrate=team,division`,
      { signal }
    );
    const data = await response.json();

    // Flatten the records from all divisions
    const allRecords = data.records?.flatMap(r => r.teamRecords) || [];

    // Cache the results
    standingsCache.set(cacheKey, allRecords);

    return allRecords;
  } catch (error) {
    if (error.name === 'AbortError') {
      return [];
    }
    console.error('Standings fetch error:', error);
    throw error;
  }
};

/**
 * Clear the standings cache
 */
export const clearStandingsCache = () => {
  standingsCache.clear();
};

// Cache for team stats (key: "teamId-season-group", value: stat object)
const teamStatsCache = new Map();

// Cache for all-team stats (key: "season-group", value: array of team stat objects)
const allTeamStatsCache = new Map();

/**
 * Fetch a single team's season stats (hitting or pitching)
 * @param {number} teamId - Team ID
 * @param {number} season - Season year
 * @param {string} group - 'hitting' or 'pitching'
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Object|null>} Team stat object or null
 */
export const fetchTeamStats = async (teamId, season, group, signal) => {
  const cacheKey = `${teamId}-${season}-${group}`;

  if (teamStatsCache.has(cacheKey)) {
    return teamStatsCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${MLB_API_BASE}/teams/${teamId}/stats?stats=season&season=${season}&group=${group}&gameType=R`,
      { signal }
    );
    const data = await response.json();
    const stat = data.stats?.[0]?.splits?.[0]?.stat || null;

    if (stat) {
      teamStatsCache.set(cacheKey, stat);
    }

    return stat;
  } catch (error) {
    if (error.name === 'AbortError') return null;
    console.error('Team stats error:', error);
    throw error;
  }
};

/**
 * Fetch all teams' season stats for percentile calculation
 * @param {number} season - Season year
 * @param {string} group - 'hitting' or 'pitching'
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Array>} Array of team stat objects
 */
export const fetchAllTeamStats = async (season, group, signal) => {
  const cacheKey = `${season}-${group}`;

  if (allTeamStatsCache.has(cacheKey)) {
    return allTeamStatsCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${MLB_API_BASE}/teams/stats?stats=season&season=${season}&group=${group}&gameType=R&sportIds=1`,
      { signal }
    );
    const data = await response.json();
    const allStats = data.stats?.[0]?.splits?.map(s => s.stat) || [];

    if (allStats.length > 0) {
      allTeamStatsCache.set(cacheKey, allStats);
    }

    return allStats;
  } catch (error) {
    if (error.name === 'AbortError') return [];
    console.error('All team stats error:', error);
    throw error;
  }
};
