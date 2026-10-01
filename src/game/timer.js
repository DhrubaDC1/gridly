/**
 * Pure timer math helpers for Blitz mode.
 * No side effects, no React, no Date.now(), no Math.random().
 */

export const BLITZ_MAX_TIME_MS = 120000;

/**
 * Calculates elapsed time in milliseconds between two timestamps.
 *
 * @param {number} lastTime - Previous timestamp in ms
 * @param {number} currentTime - Current timestamp in ms
 * @returns {number} Non-negative elapsed time in ms
 */
export function calculateElapsed(lastTime, currentTime) {
  if (
    typeof lastTime !== 'number' ||
    typeof currentTime !== 'number' ||
    Number.isNaN(lastTime) ||
    Number.isNaN(currentTime)
  ) {
    return 0;
  }
  return Math.max(0, currentTime - lastTime);
}

/**
 * Calculates the progress ratio [0, 1] of time left relative to maximum time.
 *
 * @param {number} timeLeftMs - Time remaining in ms
 * @param {number} [maxTimeMs=120000] - Maximum blitz time cap in ms
 * @returns {number} Ratio between 0 and 1
 */
export function calculateTimerRatio(timeLeftMs, maxTimeMs = BLITZ_MAX_TIME_MS) {
  if (
    typeof timeLeftMs !== 'number' ||
    Number.isNaN(timeLeftMs) ||
    timeLeftMs <= 0 ||
    typeof maxTimeMs !== 'number' ||
    maxTimeMs <= 0
  ) {
    return 0;
  }
  return Math.max(0, Math.min(1, timeLeftMs / maxTimeMs));
}

/**
 * Returns the ceiling seconds remaining for display.
 *
 * @param {number} timeLeftMs - Time remaining in ms
 * @returns {number} Integer seconds >= 0
 */
export function getRemainingSeconds(timeLeftMs) {
  if (
    typeof timeLeftMs !== 'number' ||
    Number.isNaN(timeLeftMs) ||
    timeLeftMs <= 0
  ) {
    return 0;
  }
  return Math.ceil(timeLeftMs / 1000);
}

/**
 * Formats seconds remaining as a display string (e.g. "90s").
 *
 * @param {number} timeLeftMs - Time remaining in ms
 * @returns {string} Formatted string
 */
export function formatRemainingSeconds(timeLeftMs) {
  return `${getRemainingSeconds(timeLeftMs)}s`;
}
