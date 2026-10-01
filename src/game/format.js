/**
 * Shared formatting helpers for Gridly (play time, dates, scores, stats).
 * Pure JS functions: deterministic, safe against invalid inputs.
 */

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Formats a duration in milliseconds like "3h 12m" or "45m".
 *
 * @param {number} [ms=0] - Milliseconds played
 * @returns {string} e.g. "3h 12m", "45m", "0m"
 */
export function formatPlayTime(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) {
    return '0m';
  }

  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Formats an ISO string, YYYY-MM-DD date, or Date object as "MMM D, YYYY" (e.g. "Oct 1, 2026").
 *
 * @param {string | number | Date | null | undefined} dateInput
 * @returns {string} Formatted date string, or empty string if invalid
 */
export function formatDate(dateInput) {
  if (!dateInput) return '';

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
    }
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const month = MONTH_NAMES[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

/**
 * Formats an unlock date timestamp with friendly prefix: "Unlocked Oct 1, 2026".
 *
 * @param {string | number | Date | null | undefined} dateInput
 * @returns {string} e.g. "Unlocked Oct 1, 2026", or empty string if invalid
 */
export function formatUnlockDate(dateInput) {
  const formatted = formatDate(dateInput);
  return formatted ? `Unlocked ${formatted}` : '';
}

/**
 * Formats a numeric score or stat with comma thousand-separators (e.g. 12,480).
 *
 * @param {number | null | undefined} num
 * @returns {string}
 */
export function formatNumber(num) {
  if (typeof num !== 'number' || !Number.isFinite(num)) {
    return '0';
  }
  return num.toLocaleString('en-US');
}

/**
 * Computes and formats average Classic score from gamesPlayed and score totals.
 * Returns a dash "—" when there are no games or no score totals recorded.
 *
 * @param {Object | null | undefined} stats
 * @returns {string} Formatted average score or "—"
 */
export function formatAverageClassicScore(stats) {
  const games = stats?.gamesPlayed?.classic ?? 0;
  if (typeof games !== 'number' || games <= 0) {
    return '—';
  }

  const scoreTotal =
    stats?.scoreTotals?.classic ??
    stats?.totalScore?.classic ??
    stats?.classicScoreTotal ??
    (typeof stats?.scoreTotals === 'number' ? stats.scoreTotals : null);

  if (
    scoreTotal === null ||
    scoreTotal === undefined ||
    typeof scoreTotal !== 'number' ||
    !Number.isFinite(scoreTotal)
  ) {
    return '—';
  }

  return Math.round(scoreTotal / games).toLocaleString('en-US');
}

/**
 * Formats a combo count as "×N" if > 0, otherwise "—".
 *
 * @param {number | null | undefined} combo
 * @returns {string}
 */
export function formatCombo(combo) {
  if (typeof combo === 'number' && Number.isFinite(combo) && combo > 0) {
    return `×${combo}`;
  }
  return '—';
}

/**
 * Calculates total games played across all modes.
 *
 * @param {Object | null | undefined} stats
 * @returns {number}
 */
export function getTotalGamesPlayed(stats) {
  if (!stats) return 0;
  if (typeof stats.gamesPlayed === 'number') return stats.gamesPlayed;
  if (!stats.gamesPlayed || typeof stats.gamesPlayed !== 'object') return 0;
  const { classic = 0, blitz = 0, adventure = 0 } = stats.gamesPlayed;
  return (
    (typeof classic === 'number' ? classic : 0) +
    (typeof blitz === 'number' ? blitz : 0) +
    (typeof adventure === 'number' ? adventure : 0)
  );
}
