/**
 * Pure helper that picks the highlight stat string from a game stats object.
 *
 * Rules:
 * 1. Perfect clears if above 0 (e.g. "Perfect clears: 2")
 * 2. Otherwise best combo if 2 or higher (e.g. "Best combo this game: x6")
 * 3. Otherwise lines cleared (e.g. "Lines cleared: 14")
 *
 * @param {Object | null | undefined} stats - Game stats object from state.stats.
 * @param {number} [stats.perfectClears]
 * @param {number} [stats.bestCombo]
 * @param {number} [stats.linesCleared]
 * @returns {string} Formatted highlight stat string.
 */
export function getHighlightStat(stats) {
  if (stats && typeof stats.perfectClears === 'number' && stats.perfectClears > 0) {
    return `Perfect clears: ${stats.perfectClears}`;
  }

  if (stats && typeof stats.bestCombo === 'number' && stats.bestCombo >= 2) {
    return `Best combo this game: x${stats.bestCombo}`;
  }

  const lines = stats && typeof stats.linesCleared === 'number' ? stats.linesCleared : 0;
  return `Lines cleared: ${lines}`;
}

/**
 * Alias for getHighlightStat.
 *
 * @param {Object | null | undefined} stats
 * @returns {string}
 */
export function pickHighlightStat(stats) {
  return getHighlightStat(stats);
}

export default getHighlightStat;
