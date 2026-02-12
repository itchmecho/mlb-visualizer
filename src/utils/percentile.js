// Percentile calculation utilities
// v1.2.0 | 2026-02-11

/**
 * Calculate percentile of a value within an array
 * @param {number} value - The value to calculate percentile for
 * @param {number[]} allValues - Array of all values to compare against
 * @param {boolean} higherBetter - Whether higher values are better (default true)
 * @returns {number|null} Percentile (0-100) or null if invalid
 */
export const calculatePercentile = (value, allValues, higherBetter = true) => {
  if (!allValues || allValues.length === 0 || value === undefined || value === null) {
    return null;
  }

  const validValues = allValues.filter(v => v !== undefined && v !== null && !isNaN(v));
  if (validValues.length === 0) return null;

  const numValue = parseFloat(value);
  if (isNaN(numValue)) return null;

  const sorted = [...validValues].sort((a, b) => a - b);

  // Count values below and equal to our value
  let below = sorted.filter(v => v < numValue).length;
  const ties = sorted.filter(v => v === numValue).length;

  // Use midpoint of ties for percentile calculation
  below += ties / 2;

  let percentile = (below / sorted.length) * 100;

  // If lower is better, invert the percentile
  if (!higherBetter) {
    percentile = 100 - percentile;
  }

  return Math.round(percentile);
};

/**
 * Percentile color thresholds matching the legend in App.jsx
 * Elite (80-100%): #22c55e (green)
 * Above Avg (60-79%): #84cc16 (lime)
 * Average (40-59%): #eab308 (yellow)
 * Below Avg (20-39%): #f97316 (orange)
 * Poor (0-19%): #ef4444 (red)
 */
export const PERCENTILE_COLORS = {
  elite: '#22c55e',
  aboveAvg: '#84cc16',
  average: '#eab308',
  belowAvg: '#f97316',
  poor: '#ef4444',
  unknown: '#666666',
};

/**
 * Get color for percentile value
 * @param {number} percentile - The percentile value (0-100)
 * @returns {string} Hex color code
 */
export const getPercentileColor = (percentile) => {
  if (percentile === null) return PERCENTILE_COLORS.unknown;

  if (percentile >= 80) return PERCENTILE_COLORS.elite;
  if (percentile >= 60) return PERCENTILE_COLORS.aboveAvg;
  if (percentile >= 40) return PERCENTILE_COLORS.average;
  if (percentile >= 20) return PERCENTILE_COLORS.belowAvg;
  return PERCENTILE_COLORS.poor;
};

/**
 * Calculate median of an array of numeric values
 * @param {number[]} values - Array of values
 * @returns {number|null} Median value or null if empty
 */
export const calculateMedian = (values) => {
  const valid = values.filter(v => v !== undefined && v !== null && !isNaN(v));
  const sorted = [...valid].sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};
