/**
 * Scoring calculation for Gridly.
 * Pure JS, deterministic, no side effects.
 *
 * All tuning values live as named constants at the top of this file.
 *
 * @typedef {Object} ScoreInput
 * @property {number} [cellsPlaced=0] - Number of cells placed in the move.
 * @property {number} [linesCleared=0] - Number of lines cleared in one placement.
 * @property {number} [monoLines=0] - Number of cleared lines that were monochromatic.
 * @property {number} [combo=0] - Current combo count.
 * @property {boolean} [perfectClear=false] - Whether board became completely empty after clears.
 *
 * @typedef {Object} ScoreBreakdown
 * @property {number} cells - Points earned from placing cells (+1 per cell).
 * @property {number} lines - Base points earned from line clears.
 * @property {number} mono - Bonus points earned from mono lines (+500 per mono line).
 * @property {number} comboMultiplier - Multiplier applied to clear score and mono bonus.
 * @property {number} clears - (lines + mono) * comboMultiplier.
 * @property {number} perfectClear - Bonus points for clearing the entire board (+2000, not multiplied).
 *
 * @typedef {Object} ScoreResult
 * @property {number} delta - Total score points awarded for this action.
 * @property {ScoreBreakdown} breakdown - Detailed breakdown of score components.
 */

export const POINTS_PER_CELL = 1;

export const LINE_CLEAR_BASE_POINTS = Object.freeze({
  1: 100,
  2: 300,
  3: 600,
  4: 1000,
});

export const EXTRA_LINE_POINTS = 500;
export const MONO_LINE_BONUS = 500;
export const COMBO_MULTIPLIER_STEP = 0.5;
export const PERFECT_CLEAR_BONUS = 2000;

/**
 * Calculates base line clear points given the number of cleared lines.
 * L=1: 100, L=2: 300, L=3: 600, L=4: 1000, L>=5: 1000 + 500 * (L - 4).
 *
 * @param {number} linesCleared
 * @returns {number}
 */
export function getLineClearScore(linesCleared = 0) {
  if (linesCleared <= 0) {
    return 0;
  }
  if (linesCleared <= 4) {
    return LINE_CLEAR_BASE_POINTS[linesCleared] ?? 0;
  }
  return LINE_CLEAR_BASE_POINTS[4] + EXTRA_LINE_POINTS * (linesCleared - 4);
}

/**
 * Calculates combo multiplier.
 * 1 + 0.5 * (combo - 1) when combo > 1, otherwise 1.
 *
 * @param {number} combo
 * @returns {number}
 */
export function getComboMultiplier(combo = 0) {
  if (combo <= 1) {
    return 1;
  }
  return 1 + (combo - 1) * COMBO_MULTIPLIER_STEP;
}

/**
 * Calculates total score delta and breakdown for a placement action.
 *
 * @param {ScoreInput} [input={}]
 * @returns {ScoreResult}
 */
export function calculateScore({
  cellsPlaced = 0,
  linesCleared = 0,
  monoLines = 0,
  combo = 0,
  perfectClear = false,
} = {}) {
  const cellsScore = Math.max(0, cellsPlaced) * POINTS_PER_CELL;
  const linesScore = getLineClearScore(linesCleared);
  const monoScore = Math.max(0, monoLines) * MONO_LINE_BONUS;

  const multiplier = linesCleared > 0 ? getComboMultiplier(combo) : 1;
  const clearsScore = Math.round((linesScore + monoScore) * multiplier);
  const perfectClearScore = perfectClear ? PERFECT_CLEAR_BONUS : 0;

  const delta = cellsScore + clearsScore + perfectClearScore;

  return {
    delta,
    breakdown: {
      cells: cellsScore,
      lines: linesScore,
      mono: monoScore,
      comboMultiplier: multiplier,
      clears: clearsScore,
      perfectClear: perfectClearScore,
    },
  };
}

export default calculateScore;
