/**
 * Pure functions for calculating Clear Wave animations and clearing descriptions.
 * Pure JS, deterministic, no side effects.
 */

export const STAGGER_MS_PER_CELL = 18;
export const CLEAR_DURATION_MS = 220;

/**
 * Calculates Chebyshev distance (max of row and column difference) between two cells.
 *
 * @param {number | { row: number, col: number }} cell - Board cell index (0..63) or { row, col }
 * @param {number | { row: number, col: number }} center - Board cell index (0..63) or { row, col }
 * @returns {number}
 */
export function getCellDistance(cell, center) {
  const cellRow = typeof cell === 'number' ? Math.floor(cell / 8) : cell.row;
  const cellCol = typeof cell === 'number' ? cell % 8 : cell.col;
  const centerRow = typeof center === 'number' ? Math.floor(center / 8) : center.row;
  const centerCol = typeof center === 'number' ? center % 8 : center.col;

  const rowDist = Math.abs(cellRow - centerRow);
  const colDist = Math.abs(cellCol - centerCol);
  return Math.max(rowDist, colDist);
}

/**
 * Computes the stagger delay in milliseconds for a cell given its distance.
 * When reduceMotion is true, returns 0 (no stagger).
 *
 * @param {number} distance - Distance from center cell (Chebyshev distance).
 * @param {boolean} [reduceMotion=false] - Whether reduce motion is active.
 * @returns {number} Delay in milliseconds.
 */
export function getStaggerDelay(distance, reduceMotion = false) {
  if (reduceMotion) {
    return 0;
  }
  const d = Math.max(0, typeof distance === 'number' ? distance : 0);
  return d * STAGGER_MS_PER_CELL;
}

/**
 * Computes stagger delay given a cell and center cell.
 *
 * @param {number | { row: number, col: number }} cell
 * @param {number | { row: number, col: number }} center
 * @param {boolean} [reduceMotion=false]
 * @returns {number}
 */
export function getCellStaggerDelay(cell, center, reduceMotion = false) {
  const distance = getCellDistance(cell, center);
  return getStaggerDelay(distance, reduceMotion);
}

/**
 * Calculates the center cell of a placed piece given its cell coordinates or indices.
 *
 * @param {Array<number | [number, number] | { row: number, col: number }>} placedCells
 * @returns {{ row: number, col: number, index: number, valueOf: () => number, toString: () => string }}
 */
export function getPieceCenterCell(placedCells) {
  if (!placedCells || placedCells.length === 0) {
    return {
      row: 0,
      col: 0,
      index: 0,
      valueOf() {
        return this.index;
      },
      toString() {
        return String(this.index);
      },
    };
  }

  const rows = [];
  const cols = [];

  for (let i = 0; i < placedCells.length; i++) {
    const item = placedCells[i];
    let r;
    let c;
    if (typeof item === 'number') {
      r = Math.floor(item / 8);
      c = item % 8;
    } else if (Array.isArray(item)) {
      [r, c] = item;
    } else {
      r = item.row ?? item.r ?? 0;
      c = item.col ?? item.c ?? 0;
    }
    rows.push(r);
    cols.push(c);
  }

  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);

  const centerRow = Math.round((minRow + maxRow) / 2);
  const centerCol = Math.round((minCol + maxCol) / 2);
  const centerIndex = centerRow * 8 + centerCol;

  return {
    row: centerRow,
    col: centerCol,
    index: centerIndex,
    valueOf() {
      return this.index;
    },
    toString() {
      return String(this.index);
    },
  };
}

/**
 * Builds the clearing description from the previous game state and engine events.
 * Returns null if no lines were cleared.
 *
 * @param {Object} previousState - Previous game state before placement.
 * @param {Array<Object>} events - Events returned by placePiece.
 * @returns {Object | null} Clearing description object.
 */
export function buildClearingDescription(previousState, events) {
  if (!events || !Array.isArray(events)) {
    return null;
  }

  const clearedEvent = events.find((e) => e.type === 'cleared');
  if (!clearedEvent || !clearedEvent.cells || clearedEvent.cells.length === 0) {
    return null;
  }

  const placedEvent = events.find((e) => e.type === 'placed');
  const centerCell = getPieceCenterCell(placedEvent?.cells);

  const prevBoard = previousState?.board;
  const placedIndices = placedEvent?.cells || [];
  const placedColor = placedEvent?.color ?? 0;

  const cells = clearedEvent.cells.map((index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    const prevCell = prevBoard ? prevBoard[index] : null;

    let color;
    let kind = 'normal';
    let hp = 1;

    if (prevCell) {
      color = prevCell.color;
      kind = prevCell.kind || 'normal';
      hp = prevCell.hp ?? 1;
    } else if (placedIndices.includes(index)) {
      color = placedColor;
      kind = 'normal';
      hp = 1;
    } else {
      color = placedColor;
    }

    const distance = getCellDistance({ row, col }, centerCell);

    return {
      index,
      row,
      col,
      color,
      kind,
      hp,
      distance,
    };
  });

  return {
    cells,
    indices: clearedEvent.cells,
    centerCell,
    center: { row: centerCell.row, col: centerCell.col },
    rows: clearedEvent.rows,
    cols: clearedEvent.cols,
    linesCount: clearedEvent.linesCount,
  };
}
