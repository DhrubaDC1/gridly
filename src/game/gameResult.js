/**
 * Pure helper functions for game results and calendar day keys.
 * No React, no Expo, no side-effects.
 */

/**
 * Returns a 'YYYY-MM-DD' calendar day string in local time.
 *
 * @param {Date | number | string} [date=new Date()]
 * @returns {string}
 */
export function getLocalDayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Builds a GameResult object suitable for applyGameResult from the game state.
 *
 * @param {import('../engine/game').GameState | Object | null} state
 * @param {number | { durationMs?: number, dayKey?: string | null }} [optionsOrDuration=0]
 * @param {string | null} [maybeDayKey=null]
 * @returns {import('../engine/stats').GameResult}
 */
export function buildGameResult(state, optionsOrDuration = 0, maybeDayKey = null) {
  let durationMs = 0;
  let dayKey = null;

  if (typeof optionsOrDuration === 'object' && optionsOrDuration !== null) {
    durationMs = optionsOrDuration.durationMs ?? 0;
    dayKey = optionsOrDuration.dayKey ?? null;
  } else {
    durationMs = typeof optionsOrDuration === 'number' ? optionsOrDuration : 0;
    dayKey = maybeDayKey;
  }

  const s = state || {};
  return {
    mode: s.mode || 'classic',
    score: typeof s.score === 'number' && Number.isFinite(s.score) ? s.score : 0,
    game: s.stats || {},
    durationMs: typeof durationMs === 'number' && durationMs > 0 ? durationMs : 0,
    dayKey,
  };
}

export default buildGameResult;
