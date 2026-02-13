// MLB Stats API utilities
// v2.4.0 | 2026-02-10

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

// Qualification thresholds (MLB standards)
export const MIN_IP_QUALIFIED = 50;  // Minimum innings pitched for qualified pitchers
export const MIN_PA_QUALIFIED = 200; // Minimum plate appearances for qualified hitters

// TTL cache — entries expire after a given duration (ms)
const TTL_LONG = 30 * 60 * 1000;  // 30 min — player stats, league data, career stats
const TTL_SHORT = 5 * 60 * 1000;  // 5 min — scores, schedules, live data

class TtlCache {
  constructor(ttl) {
    this._map = new Map();
    this._ttl = ttl;
  }
  has(key) {
    if (!this._map.has(key)) return false;
    const { ts } = this._map.get(key);
    if (Date.now() - ts > this._ttl) {
      this._map.delete(key);
      return false;
    }
    return true;
  }
  get(key) {
    if (!this.has(key)) return undefined;
    return this._map.get(key).value;
  }
  set(key, value) {
    this._map.set(key, { value, ts: Date.now() });
  }
  clear() {
    this._map.clear();
  }
}

// Cache for league stats (key: "season-group", value: stats array)
const leagueStatsCache = new TtlCache(TTL_LONG);

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

  // BABIP (Batting Average on Balls In Play)
  const atBats = parseInt(stat.atBats, 10) || 0;
  const strikeOuts = parseInt(stat.strikeOuts, 10) || 0;
  const sacFlies = parseInt(stat.sacFlies, 10) || 0;
  const babipDenom = atBats - strikeOuts - homeRuns + sacFlies;
  enhanced.babip = babipDenom > 0
    ? ((hits - homeRuns) / babipDenom).toFixed(3)
    : '.000';

  // Walk Rate (BB%)
  const pa = parseInt(stat.plateAppearances, 10) || 0;
  const bb = parseInt(stat.baseOnBalls, 10) || 0;
  enhanced.walkRate = pa > 0 ? ((bb / pa) * 100).toFixed(1) : '0.0';

  // Strikeout Rate (K%)
  enhanced.strikeoutRate = pa > 0 ? ((strikeOuts / pa) * 100).toFixed(1) : '0.0';

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
 * Fetch a player by ID (for URL-based navigation)
 * @param {number} playerId - Player ID
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Object|null>} Player object or null
 */
export const fetchPlayerById = async (playerId, signal) => {
  try {
    const response = await fetch(
      `${MLB_API_BASE}/people/${playerId}?hydrate=currentTeam,team`,
      { signal }
    );
    const data = await response.json();
    return data.people?.[0] || null;
  } catch (error) {
    if (error.name === 'AbortError') return null;
    console.error('Player lookup error:', error);
    throw error;
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
const standingsCache = new TtlCache(TTL_LONG);

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
const teamStatsCache = new TtlCache(TTL_LONG);

// Cache for all-team stats (key: "season-group", value: array of team stat objects)
const allTeamStatsCache = new TtlCache(TTL_LONG);

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

// Cache for league leaders (key: "season-stat-group", value: leaders array)
const leadersCache = new TtlCache(TTL_LONG);

// Cache for schedule (key: "date-teamId", value: schedule data)
const scheduleCache = new TtlCache(TTL_SHORT);

// Cache for game boxscores (key: "gamePk", value: boxscore data)
const boxscoreCache = new TtlCache(TTL_SHORT);

// Cache for postseason schedule (key: "season", value: postseason data)
const postseasonCache = new TtlCache(TTL_SHORT);

/**
 * Fetch league leaders for a specific stat
 * @param {string} leaderCategories - Stat category (e.g., 'homeRuns', 'earnedRunAverage')
 * @param {number} season - Season year
 * @param {string} statGroup - 'hitting' or 'pitching'
 * @param {number} limit - Number of leaders to return
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Array>} Array of leader objects
 */
export const fetchLeaders = async (leaderCategories, season, statGroup, limit = 5, signal) => {
  const cacheKey = `${season}-${leaderCategories}-${statGroup}-${limit}`;

  if (leadersCache.has(cacheKey)) {
    return leadersCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${MLB_API_BASE}/stats/leaders?leaderCategories=${leaderCategories}&season=${season}&statGroup=${statGroup}&limit=${limit}&sportId=1&hydrate=person,team`,
      { signal }
    );
    const data = await response.json();
    const leaders = data.leagueLeaders?.[0]?.leaders || [];

    if (leaders.length > 0) {
      leadersCache.set(cacheKey, leaders);
    }

    return leaders;
  } catch (error) {
    if (error.name === 'AbortError') return [];
    console.error('Leaders error:', error);
    throw error;
  }
};

// Cache for awards (key: "season", value: awards object)
const awardsCache = new TtlCache(TTL_LONG);

/**
 * Fetch season awards (MVP + Cy Young for both leagues)
 * @param {number} season - Season year
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Object|null>} { alMvp, nlMvp, alCy, nlCy } with { id, name, teamId } each, or null
 */
export const fetchAwards = async (season, signal) => {
  const cacheKey = `${season}`;

  if (awardsCache.has(cacheKey)) {
    return awardsCache.get(cacheKey);
  }

  const awardIds = [
    { key: 'alMvp', id: 'ALMVP' },
    { key: 'nlMvp', id: 'NLMVP' },
    { key: 'alCy', id: 'ALCY' },
    { key: 'nlCy', id: 'NLCY' },
  ];

  try {
    const results = await Promise.all(
      awardIds.map(async ({ id }) => {
        const response = await fetch(
          `${MLB_API_BASE}/awards/${id}/recipients?season=${season}`,
          { signal }
        );
        const data = await response.json();
        const winner = data.awards?.[0];
        if (!winner?.player) return null;
        return {
          id: winner.player.id,
          name: winner.player.nameFirstLast || winner.player.fullName,
          teamId: winner.team?.id || null,
        };
      })
    );

    if (signal?.aborted) return null;

    const awards = {};
    awardIds.forEach(({ key }, i) => {
      awards[key] = results[i];
    });

    awardsCache.set(cacheKey, awards);
    return awards;
  } catch (error) {
    if (error.name === 'AbortError') return null;
    console.error('Awards fetch error:', error);
    throw error;
  }
};

/**
 * Fetch MLB schedule for a date range
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {number} teamId - Optional team ID filter
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Array>} Array of game objects
 */
export const fetchSchedule = async (date, teamId = null, signal) => {
  const cacheKey = `${date}-${teamId || 'all'}`;

  if (scheduleCache.has(cacheKey)) {
    return scheduleCache.get(cacheKey);
  }

  try {
    let url = `${MLB_API_BASE}/schedule?sportId=1&date=${date}&hydrate=team,linescore`;
    if (teamId) {
      url = `${MLB_API_BASE}/schedule?sportId=1&teamId=${teamId}&startDate=${date}&endDate=${date}&hydrate=team,linescore`;
    }

    const response = await fetch(url, { signal });
    const data = await response.json();
    const games = data.dates?.flatMap(d => d.games) || [];

    if (games.length > 0) {
      scheduleCache.set(cacheKey, games);
    }

    return games;
  } catch (error) {
    if (error.name === 'AbortError') return [];
    console.error('Schedule error:', error);
    throw error;
  }
};

/**
 * Fetch team schedule for a date range
 * @param {number} teamId - Team ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Array>} Array of game objects
 */
export const fetchTeamSchedule = async (teamId, startDate, endDate, signal) => {
  const cacheKey = `team-${teamId}-${startDate}-${endDate}`;

  if (scheduleCache.has(cacheKey)) {
    return scheduleCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${MLB_API_BASE}/schedule?sportId=1&teamId=${teamId}&startDate=${startDate}&endDate=${endDate}&hydrate=team,linescore`,
      { signal }
    );
    const data = await response.json();
    const games = data.dates?.flatMap(d => d.games) || [];

    if (games.length > 0) {
      scheduleCache.set(cacheKey, games);
    }

    return games;
  } catch (error) {
    if (error.name === 'AbortError') return [];
    console.error('Team schedule error:', error);
    throw error;
  }
};

/**
 * Fetch box score for a specific game
 * @param {number} gamePk - Game primary key
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Object|null>} Box score data
 */
export const fetchBoxScore = async (gamePk, signal) => {
  if (boxscoreCache.has(gamePk)) {
    return boxscoreCache.get(gamePk);
  }

  try {
    const response = await fetch(
      `${MLB_API_BASE}/game/${gamePk}/boxscore`,
      { signal }
    );
    const data = await response.json();

    if (data) {
      boxscoreCache.set(gamePk, data);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') return null;
    console.error('Boxscore error:', error);
    throw error;
  }
};

/**
 * Fetch postseason schedule/bracket
 * @param {number} season - Season year
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Object|null>} Postseason data with series info
 */
export const fetchPostseason = async (season, signal) => {
  if (postseasonCache.has(season)) {
    return postseasonCache.get(season);
  }

  try {
    const response = await fetch(
      `${MLB_API_BASE}/schedule/postseason?season=${season}&hydrate=team,linescore`,
      { signal }
    );
    const data = await response.json();

    if (data) {
      postseasonCache.set(season, data);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') return null;
    console.error('Postseason error:', error);
    throw error;
  }
};

// Cache for career stats (key: "playerId-group", value: yearByYear splits)
const careerStatsCache = new TtlCache(TTL_LONG);

// Cache for game log (key: "playerId-season-group", value: gameLog splits)
const gameLogCache = new TtlCache(TTL_SHORT);

// Cache for split stats (key: "playerId-season-group-days", value: stat object)
const splitStatsCache = new TtlCache(TTL_SHORT);

/**
 * Fetch player's year-by-year career stats
 * @param {number} playerId - Player ID
 * @param {string} group - 'hitting' or 'pitching'
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Array>} Array of yearByYear split objects
 */
export const fetchCareerStats = async (playerId, group, signal) => {
  const cacheKey = `${playerId}-${group}`;

  if (careerStatsCache.has(cacheKey)) {
    return careerStatsCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${MLB_API_BASE}/people/${playerId}/stats?stats=yearByYear&group=${group}&gameType=R&hydrate=team`,
      { signal }
    );
    const data = await response.json();
    const splits = data.stats?.[0]?.splits || [];

    if (splits.length > 0) {
      careerStatsCache.set(cacheKey, splits);
    }

    return splits;
  } catch (error) {
    if (error.name === 'AbortError') return [];
    console.error('Career stats error:', error);
    throw error;
  }
};

/**
 * Fetch player's game log for a season
 * @param {number} playerId - Player ID
 * @param {number} season - Season year
 * @param {string} group - 'hitting' or 'pitching'
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Array>} Array of game log split objects
 */
export const fetchGameLog = async (playerId, season, group, signal) => {
  const cacheKey = `${playerId}-${season}-${group}`;

  if (gameLogCache.has(cacheKey)) {
    return gameLogCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${MLB_API_BASE}/people/${playerId}/stats?stats=gameLog&season=${season}&group=${group}&gameType=R`,
      { signal }
    );
    const data = await response.json();
    const splits = data.stats?.[0]?.splits || [];

    if (splits.length > 0) {
      gameLogCache.set(cacheKey, splits);
    }

    return splits;
  } catch (error) {
    if (error.name === 'AbortError') return [];
    console.error('Game log error:', error);
    throw error;
  }
};

// --- Player Awards ---

const MAJOR_AWARD_IDS = new Set([
  'ALMVP', 'NLMVP', 'ALCY', 'NLCY', 'ALROY', 'NLROY',
  'ALSS', 'NLSS', 'ALGG', 'NLGG', 'ALAS', 'NLAS',
  'MLBAFIRST', 'MLBSECOND', 'ALHAA', 'NLHAA', 'HRDERBYWIN', 'MLBRC',
]);

export const AWARD_DISPLAY = {
  ALMVP: { short: 'MVP' }, NLMVP: { short: 'MVP' },
  ALCY: { short: 'Cy Young' }, NLCY: { short: 'Cy Young' },
  ALROY: { short: 'ROY' }, NLROY: { short: 'ROY' },
  ALSS: { short: 'Silver Slugger' }, NLSS: { short: 'Silver Slugger' },
  ALGG: { short: 'Gold Glove' }, NLGG: { short: 'Gold Glove' },
  ALAS: { short: 'All-Star' }, NLAS: { short: 'All-Star' },
  MLBAFIRST: { short: 'All-MLB 1st' },
  MLBSECOND: { short: 'All-MLB 2nd' },
  ALHAA: { short: 'Hank Aaron' }, NLHAA: { short: 'Hank Aaron' },
  HRDERBYWIN: { short: 'HR Derby' },
  MLBRC: { short: 'Clemente' },
};

const playerAwardsCache = new TtlCache(TTL_LONG);

/**
 * Fetch player's major awards (MVP, Cy Young, All-Star, etc.)
 * @param {number} playerId - Player ID
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Array>} Array of { id, name, season } objects (filtered to major awards)
 */
export const fetchPlayerAwards = async (playerId, signal) => {
  if (playerAwardsCache.has(playerId)) {
    return playerAwardsCache.get(playerId);
  }

  try {
    const response = await fetch(
      `${MLB_API_BASE}/people/${playerId}/awards`,
      { signal }
    );
    const data = await response.json();
    const awards = (data.awards || []).filter(a => MAJOR_AWARD_IDS.has(a.id));

    playerAwardsCache.set(playerId, awards);
    return awards;
  } catch (error) {
    if (error.name === 'AbortError') return [];
    console.error('Player awards error:', error);
    return [];
  }
};

/**
 * Fetch player's split stats (last X games)
 * @param {number} playerId - Player ID
 * @param {number} season - Season year
 * @param {string} group - 'hitting' or 'pitching'
 * @param {number} days - Number of days (7, 15, 30)
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Object|null>} Stat object for the period
 */
export const fetchSplitStats = async (playerId, season, group, days, signal) => {
  const cacheKey = `${playerId}-${season}-${group}-${days}`;

  if (splitStatsCache.has(cacheKey)) {
    return splitStatsCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${MLB_API_BASE}/people/${playerId}/stats?stats=lastXGames&season=${season}&group=${group}&gameType=R&limit=${days}`,
      { signal }
    );
    const data = await response.json();
    const stat = data.stats?.[0]?.splits?.[0]?.stat || null;

    if (stat) {
      splitStatsCache.set(cacheKey, stat);
    }

    return stat;
  } catch (error) {
    if (error.name === 'AbortError') return null;
    console.error('Split stats error:', error);
    throw error;
  }
};

// Cache for team rosters (key: "teamId-season", value: roster array)
const teamRosterCache = new TtlCache(TTL_LONG);

/**
 * Fetch a team's roster with player stats hydrated
 * @param {number} teamId - Team ID
 * @param {number} season - Season year
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Array>} Array of roster entries with player data
 */
export const fetchTeamRoster = async (teamId, season, signal, rosterType = 'fullSeason') => {
  const cacheKey = `${teamId}-${season}-${rosterType}`;

  if (teamRosterCache.has(cacheKey)) {
    return teamRosterCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${MLB_API_BASE}/teams/${teamId}/roster?season=${season}&rosterType=${rosterType}&hydrate=person(stats(type=season,season=${season},gameType=R))`,
      { signal }
    );
    const data = await response.json();
    const roster = data.roster || [];

    if (roster.length > 0) {
      teamRosterCache.set(cacheKey, roster);
    }

    return roster;
  } catch (error) {
    if (error.name === 'AbortError') return [];
    console.error('Team roster error:', error);
    throw error;
  }
};

/**
 * Fetch top player names from league leaders (HR, AVG, ERA)
 * Returns a deduplicated array of ~20-25 player names for suggestion buttons.
 * Piggybacks on existing fetchLeaders + leadersCache.
 * @param {number} season - Season year
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<string[]>} Array of unique player full names
 */
export const fetchTopPlayerNames = async (season, signal) => {
  try {
    const [hrLeaders, avgLeaders, eraLeaders] = await Promise.all([
      fetchLeaders('homeRuns', season, 'hitting', 10, signal),
      fetchLeaders('battingAverage', season, 'hitting', 10, signal),
      fetchLeaders('earnedRunAverage', season, 'pitching', 10, signal),
    ]);

    const names = new Set();
    for (const list of [hrLeaders, avgLeaders, eraLeaders]) {
      for (const leader of list) {
        const name = leader.person?.fullName;
        if (name) names.add(name);
      }
    }

    return [...names];
  } catch (error) {
    if (error.name === 'AbortError') return [];
    console.error('Top player names error:', error);
    return [];
  }
};
