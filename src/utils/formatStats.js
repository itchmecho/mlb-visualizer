// Stat value formatting utilities
// v1.0.0 | 2026-02-11

const DECIMAL_STATS = new Set([
  'avg', 'obp', 'slg', 'ops', 'era', 'whip', 'iso', 'babip',
  'strikeoutsPer9Inn', 'walksPer9Inn', 'homeRunsPer9', 'hitsPer9Inn',
  'strikeoutWalkRatio', 'walkRate', 'strikeoutRate',
]);

const BATTING_AVG_STYLE = new Set(['avg', 'obp', 'slg', 'iso', 'babip']);
const PERCENTAGE_STYLE = new Set(['walkRate', 'strikeoutRate']);

/**
 * Format a stat value for display
 * @param {*} value - Raw stat value
 * @param {string} statKey - Stat key (e.g. 'avg', 'homeRuns')
 * @returns {string} Formatted display string
 */
export const formatStatValue = (value, statKey) => {
  if (value === undefined || value === null) return '-';

  if (DECIMAL_STATS.has(statKey)) {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';

    if (BATTING_AVG_STYLE.has(statKey)) return num.toFixed(3).replace(/^0/, '');
    if (statKey === 'ops') return num.toFixed(3);
    if (PERCENTAGE_STYLE.has(statKey)) return `${num.toFixed(1)}%`;
    return num.toFixed(2);
  }

  return value.toString();
};
