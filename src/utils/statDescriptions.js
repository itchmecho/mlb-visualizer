// Stat descriptions for tooltips
// v2.0.0 | 2026-02-06

export const STAT_DESCRIPTIONS = {
  // Hitting stats
  avg: 'Batting Average: Hits divided by At Bats',
  obp: 'On-Base Percentage: How often a batter reaches base',
  slg: 'Slugging Percentage: Total bases divided by at bats',
  ops: 'On-base Plus Slugging: OBP + SLG combined',
  babip: 'BABIP: Batting average on balls in play (excludes HR and K)',
  homeRuns: 'Home Runs: Balls hit out of the park',
  rbi: 'Runs Batted In: Runs scored due to this batter',
  runs: 'Runs Scored: Times the player crossed home plate',
  hits: 'Hits: Times the batter safely reached base on a batted ball',
  baseOnBalls: 'Walks (BB): Times awarded first base on 4 balls',
  strikeOuts: 'Strikeouts: Times the batter struck out',
  stolenBases: 'Stolen Bases: Bases advanced by stealing',
  extraBaseHits: 'Extra Base Hits: Doubles + Triples + Home Runs',
  totalBases: 'Total Bases: Sum of all bases from hits',
  iso: 'Isolated Power: SLG minus AVG, measures raw power',
  walkRate: 'Walk Rate: Walks as a percentage of plate appearances',
  strikeoutRate: 'Strikeout Rate: Strikeouts as a percentage of plate appearances',

  // Pitching stats
  era: 'Earned Run Average: Earned runs per 9 innings pitched',
  whip: 'Walks + Hits per Inning Pitched',
  inningsPitched: 'Innings Pitched: Total innings thrown',
  strikeoutsPer9Inn: 'Strikeouts per 9 Innings: K rate over 9 innings',
  strikeoutWalkRatio: 'K/BB Ratio: Strikeouts divided by walks',
  walksPer9Inn: 'Walks per 9 Innings: Base on balls rate',
  homeRunsPer9: 'Home Runs per 9 Innings: HR rate allowed',
  hitsPer9Inn: 'Hits per 9 Innings: Hits allowed rate',
  wins: 'Wins: Games won as the pitcher of record',
  losses: 'Losses: Games lost as the pitcher of record',
  gamesStarted: 'Games Started: Games where this pitcher started',
};

export const getStatDescription = (statKey) => {
  return STAT_DESCRIPTIONS[statKey] || null;
};
