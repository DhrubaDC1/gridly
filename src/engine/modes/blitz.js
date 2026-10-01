import {
  createGame,
  placePiece,
  holdPiece,
  serializeGame,
  restoreGame,
} from '../game';

/**
 * Constants for Blitz mode.
 */
export const INITIAL_TIME_MS = 90000;
export const MAX_TIME_MS = 120000;
export const TIME_BONUS_PER_LINE_MS = 2000;
export const SPEED_BONUS_WINDOW_MS = 1500;
export const SPEED_BONUS_MULTIPLIER = 0.5;

/**
 * Configuration for Blitz mode (90s sprint, clears add +2s up to 120s, speed bonus for fast drops).
 */
export const blitzConfig = Object.freeze({
  mode: 'blitz',
  hasTimer: true,
  hasMoveLimit: false,
  initialTimeMs: INITIAL_TIME_MS,
  maxTimeMs: MAX_TIME_MS,
  timeBonusPerLineMs: TIME_BONUS_PER_LINE_MS,
  speedBonusWindowMs: SPEED_BONUS_WINDOW_MS,
  speedBonusMultiplier: SPEED_BONUS_MULTIPLIER,
});

/**
 * Creates a new Blitz game instance.
 *
 * @param {number | { seed?: number, initial?: any }} [seedOrOptions=0]
 * @returns {import('../game').GameState & { timeLeftMs: number, lastPlaceAtMs: number | null }}
 */
export function createBlitzGame(seedOrOptions = 0) {
  const seed =
    typeof seedOrOptions === 'object' && seedOrOptions !== null
      ? (seedOrOptions.seed ?? 0)
      : (seedOrOptions ?? 0);
  const initial =
    typeof seedOrOptions === 'object' && seedOrOptions !== null
      ? seedOrOptions.initial
      : null;

  const base = createGame({ seed, mode: 'blitz', initial });
  return {
    ...base,
    timeLeftMs: INITIAL_TIME_MS,
    lastPlaceAtMs: null,
  };
}

/**
 * Advances the Blitz timer by elapsedMs.
 * Pure function: subtracts elapsed time (never below 0).
 * At 0, returns state with over: true, overReason: 'timeUp', and a gameOver event.
 *
 * @param {import('../game').GameState} state
 * @param {number} [elapsedMs=0]
 * @returns {{ state: import('../game').GameState, events: Object[] }}
 */
export function tick(state, elapsedMs = 0) {
  if (!state || state.over) {
    return { state, events: [] };
  }

  const elapsed =
    typeof elapsedMs === 'number' && !isNaN(elapsedMs)
      ? Math.max(0, elapsedMs)
      : 0;
  const current =
    typeof state.timeLeftMs === 'number' ? state.timeLeftMs : INITIAL_TIME_MS;
  const nextTime = Math.max(0, current - elapsed);

  if (nextTime === 0) {
    const nextState = {
      ...state,
      timeLeftMs: 0,
      over: true,
      overReason: 'timeUp',
    };
    return {
      state: nextState,
      events: [{ type: 'gameOver', reason: 'timeUp' }],
    };
  }

  const nextState = {
    ...state,
    timeLeftMs: nextTime,
  };

  return {
    state: nextState,
    events: [],
  };
}

/**
 * Places a piece in Blitz mode.
 * Delegates to placePiece, then:
 * - adds 2000ms per cleared line to timeLeftMs capped at 120000ms
 * - if the previous placement was within 1500ms (nowMs - lastPlaceAtMs <= 1500),
 *   adds 50% of that placement's score delta to the score and updates
 *   the scored event's delta and total accordingly
 * - stores lastPlaceAtMs = nowMs
 *
 * @param {import('../game').GameState} state
 * @param {number | 'hold'} source - Tray index 0-2 or 'hold'
 * @param {number} row - Board row index (0-7)
 * @param {number} col - Board col index (0-7)
 * @param {number} [nowMs] - Current timestamp in milliseconds provided by caller
 * @returns {{ state: import('../game').GameState, events: Object[] }}
 */
export function placeBlitz(state, source, row, col, nowMs) {
  if (
    !state ||
    state.over ||
    (typeof state.timeLeftMs === 'number' && state.timeLeftMs <= 0)
  ) {
    return { state, events: [] };
  }

  const result = placePiece(state, source, row, col);
  if (result.state === state || result.events.length === 0) {
    return result;
  }

  // 1. Line clears & time bonus (+2s per line, capped at 120s)
  const clearedEvent = result.events.find((e) => e.type === 'cleared');
  const linesCount = clearedEvent ? (clearedEvent.linesCount ?? 0) : 0;
  const currentTime =
    typeof state.timeLeftMs === 'number' ? state.timeLeftMs : INITIAL_TIME_MS;
  const addedTime = linesCount * TIME_BONUS_PER_LINE_MS;
  const newTimeLeftMs = Math.min(MAX_TIME_MS, currentTime + addedTime);

  // 2. Speed bonus (+50% score delta if previous placement was within 1500ms)
  const hasPreviousPlacement =
    typeof state.lastPlaceAtMs === 'number' && state.lastPlaceAtMs !== null;
  const hasNow = typeof nowMs === 'number' && !isNaN(nowMs);
  const isSpeedBonus =
    hasPreviousPlacement &&
    hasNow &&
    nowMs - state.lastPlaceAtMs >= 0 &&
    nowMs - state.lastPlaceAtMs <= SPEED_BONUS_WINDOW_MS;

  let finalScore = result.state.score;
  let finalEvents = result.events;

  if (isSpeedBonus) {
    const scoredIndex = result.events.findIndex((e) => e.type === 'scored');
    if (scoredIndex !== -1) {
      const scoredEvent = result.events[scoredIndex];
      const baseDelta = scoredEvent.delta;
      const speedBonus = Math.round(baseDelta * SPEED_BONUS_MULTIPLIER);
      const finalDelta = baseDelta + speedBonus;
      finalScore = state.score + finalDelta;

      finalEvents = result.events.map((e, idx) => {
        if (idx === scoredIndex) {
          return {
            ...e,
            delta: finalDelta,
            total: finalScore,
          };
        }
        return { ...e };
      });
    }
  }

  // 3. Store lastPlaceAtMs = nowMs
  const nextLastPlaceAtMs = hasNow ? nowMs : (state.lastPlaceAtMs ?? null);

  const nextState = {
    ...result.state,
    timeLeftMs: newTimeLeftMs,
    lastPlaceAtMs: nextLastPlaceAtMs,
    score: finalScore,
  };

  return {
    state: nextState,
    events: finalEvents,
  };
}

/**
 * Re-export holdPiece, serializeGame, and restoreGame for convenience.
 */
export { holdPiece, serializeGame, restoreGame };

/**
 * Serializes a Blitz game state.
 *
 * @param {import('../game').GameState} state
 * @returns {string}
 */
export function serializeBlitzGame(state) {
  return serializeGame(state);
}

/**
 * Restores a Blitz game state from JSON or object.
 *
 * @param {string | Object} json
 * @returns {import('../game').GameState}
 */
export function restoreBlitzGame(json) {
  return restoreGame(json);
}
