// Team data with IDs, colors, and abbreviations
// v1.0.0 | 2026-02-04

export const TEAM_DATA = {
  'Arizona Diamondbacks': { id: 109, abbr: 'ARI', primary: '#A71930', secondary: '#E3D4AD' },
  'Atlanta Braves': { id: 144, abbr: 'ATL', primary: '#CE1141', secondary: '#13274F' },
  'Baltimore Orioles': { id: 110, abbr: 'BAL', primary: '#DF4601', secondary: '#000000' },
  'Boston Red Sox': { id: 111, abbr: 'BOS', primary: '#BD3039', secondary: '#0C2340' },
  'Chicago Cubs': { id: 112, abbr: 'CHC', primary: '#0E3386', secondary: '#CC3433' },
  'Chicago White Sox': { id: 145, abbr: 'CWS', primary: '#27251F', secondary: '#C4CED4' },
  'Cincinnati Reds': { id: 113, abbr: 'CIN', primary: '#C6011F', secondary: '#000000' },
  'Cleveland Guardians': { id: 114, abbr: 'CLE', primary: '#00385D', secondary: '#E50022' },
  'Colorado Rockies': { id: 115, abbr: 'COL', primary: '#33006F', secondary: '#C4CED4' },
  'Detroit Tigers': { id: 116, abbr: 'DET', primary: '#0C2340', secondary: '#FA4616' },
  'Houston Astros': { id: 117, abbr: 'HOU', primary: '#002D62', secondary: '#EB6E1F' },
  'Kansas City Royals': { id: 118, abbr: 'KC', primary: '#004687', secondary: '#BD9B60' },
  'Los Angeles Angels': { id: 108, abbr: 'LAA', primary: '#BA0021', secondary: '#003263' },
  'Los Angeles Dodgers': { id: 119, abbr: 'LAD', primary: '#005A9C', secondary: '#EF3E42' },
  'Miami Marlins': { id: 146, abbr: 'MIA', primary: '#00A3E0', secondary: '#EF3340' },
  'Milwaukee Brewers': { id: 158, abbr: 'MIL', primary: '#12284B', secondary: '#B6922E' },
  'Minnesota Twins': { id: 142, abbr: 'MIN', primary: '#002B5C', secondary: '#D31145' },
  'New York Mets': { id: 121, abbr: 'NYM', primary: '#002D72', secondary: '#FF5910' },
  'New York Yankees': { id: 147, abbr: 'NYY', primary: '#003087', secondary: '#E4002C' },
  'Oakland Athletics': { id: 133, abbr: 'OAK', primary: '#003831', secondary: '#EFB21E' },
  'Philadelphia Phillies': { id: 143, abbr: 'PHI', primary: '#E81828', secondary: '#002D72' },
  'Pittsburgh Pirates': { id: 134, abbr: 'PIT', primary: '#27251F', secondary: '#FDB827' },
  'San Diego Padres': { id: 135, abbr: 'SD', primary: '#2F241D', secondary: '#FFC425' },
  'San Francisco Giants': { id: 137, abbr: 'SF', primary: '#FD5A1E', secondary: '#27251F' },
  'Seattle Mariners': { id: 136, abbr: 'SEA', primary: '#0C2C56', secondary: '#005C5C' },
  'St. Louis Cardinals': { id: 138, abbr: 'STL', primary: '#C41E3A', secondary: '#0C2340' },
  'Tampa Bay Rays': { id: 139, abbr: 'TB', primary: '#092C5C', secondary: '#8FBCE6' },
  'Texas Rangers': { id: 140, abbr: 'TEX', primary: '#003278', secondary: '#C0111F' },
  'Toronto Blue Jays': { id: 141, abbr: 'TOR', primary: '#134A8E', secondary: '#1D2D5C' },
  'Washington Nationals': { id: 120, abbr: 'WSH', primary: '#AB0003', secondary: '#14225A' },
};

export const getTeamData = (teamName) => {
  return TEAM_DATA[teamName] || { id: null, abbr: '???', primary: '#333', secondary: '#666' };
};

export const getTeamLogoUrl = (teamId) => {
  if (!teamId) return null;
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
};

export const getPlayerHeadshotUrl = (playerId) => {
  if (!playerId) return null;
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_180,q_100/v1/people/${playerId}/headshot/silo/current`;
};
