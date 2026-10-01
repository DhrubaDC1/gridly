import { Dimensions } from 'react-native';

export const BOARD_GRID_SIZE = 8;
export const TOTAL_BOARD_CELLS = 64;
export const DEFAULT_CELL_GAP = 3;
export const DEFAULT_BOARD_PADDING = 8;
export const BASE_CELL_SIZE = 44;
export const BASE_CELL_RADIUS = 6;
export const BOARD_RADIUS = 20;
export const BOARD_MAX_WIDTH = 420;

/**
 * Adjusts hex color brightness by a percentage.
 * Positive percent brightens, negative percent darkens.
 *
 * @param {string} hex
 * @param {number} percent
 * @returns {string}
 */
export function adjustBrightness(hex, percent) {
  if (!hex || typeof hex !== 'string') return hex;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return hex;
  const num = parseInt(cleanHex, 16);
  if (Number.isNaN(num)) return hex;
  const delta = Math.round(255 * (percent / 100));
  const r = Math.min(255, Math.max(0, (num >> 16) + delta));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + delta));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + delta));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Calculates board width based on screen width.
 * Formula: min(screenWidth - 32, 420)
 *
 * @param {number} [screenWidth]
 * @returns {number}
 */
export function getDefaultBoardSize(screenWidth) {
  const width =
    typeof screenWidth === 'number'
      ? screenWidth
      : Dimensions.get('window').width;
  return Math.min(width - 32, BOARD_MAX_WIDTH);
}

/**
 * Calculates individual cell size from board size.
 *
 * @param {number} boardSize
 * @param {number} [padding=DEFAULT_BOARD_PADDING]
 * @param {number} [gap=DEFAULT_CELL_GAP]
 * @returns {number}
 */
export function calculateCellSize(
  boardSize,
  padding = DEFAULT_BOARD_PADDING,
  gap = DEFAULT_CELL_GAP
) {
  const availableSpace = boardSize - 2 * padding - (BOARD_GRID_SIZE - 1) * gap;
  return availableSpace / BOARD_GRID_SIZE;
}

/**
 * Scales cell corner radius proportionally to cell size.
 * Base: 6px radius at 44px cell size.
 *
 * @param {number} cellSize
 * @returns {number}
 */
export function calculateCellRadius(cellSize) {
  return (cellSize / BASE_CELL_SIZE) * BASE_CELL_RADIUS;
}

/**
 * Returns (x, y) coordinates of a cell given its 1D index (0..63) or { row, col }.
 *
 * @param {number | { row: number, col: number }} indexOrCoords
 * @param {number} cellSize
 * @param {number} [padding=DEFAULT_BOARD_PADDING]
 * @param {number} [gap=DEFAULT_CELL_GAP]
 * @returns {{ x: number, y: number, row: number, col: number }}
 */
export function getCellPosition(
  indexOrCoords,
  cellSize,
  padding = DEFAULT_BOARD_PADDING,
  gap = DEFAULT_CELL_GAP
) {
  let row;
  let col;
  if (typeof indexOrCoords === 'number') {
    row = Math.floor(indexOrCoords / BOARD_GRID_SIZE);
    col = indexOrCoords % BOARD_GRID_SIZE;
  } else {
    row = indexOrCoords.row;
    col = indexOrCoords.col;
  }

  const x = padding + col * (cellSize + gap);
  const y = padding + row * (cellSize + gap);

  return { x, y, row, col };
}

/**
 * Converts row and column to 1D index (0..63).
 *
 * @param {number} row
 * @param {number} col
 * @returns {number}
 */
export function getCellIndex(row, col) {
  return row * BOARD_GRID_SIZE + col;
}

/**
 * Converts 1D index to { row, col }.
 *
 * @param {number} index
 * @returns {{ row: number, col: number }}
 */
export function getCellRowCol(index) {
  return {
    row: Math.floor(index / BOARD_GRID_SIZE),
    col: index % BOARD_GRID_SIZE,
  };
}

/**
 * Returns complete board metrics object.
 *
 * @param {number} boardSize
 * @param {number} [padding=DEFAULT_BOARD_PADDING]
 * @param {number} [gap=DEFAULT_CELL_GAP]
 */
export function getBoardMetrics(
  boardSize,
  padding = DEFAULT_BOARD_PADDING,
  gap = DEFAULT_CELL_GAP
) {
  const cellSize = calculateCellSize(boardSize, padding, gap);
  const cellRadius = calculateCellRadius(cellSize);

  return {
    boardSize,
    padding,
    gap,
    cellSize,
    cellRadius,
    gridSize: BOARD_GRID_SIZE,
    totalCells: TOTAL_BOARD_CELLS,
    boardRadius: BOARD_RADIUS,
  };
}

/**
 * Maps pixel coordinates on the board to cell row/col/index.
 * Returns null if out of board bounds.
 *
 * @param {number} px
 * @param {number} py
 * @param {number} cellSize
 * @param {number} [padding=DEFAULT_BOARD_PADDING]
 * @param {number} [gap=DEFAULT_CELL_GAP]
 * @returns {{ row: number, col: number, index: number } | null}
 */
export function getCellAtPosition(
  px,
  py,
  cellSize,
  padding = DEFAULT_BOARD_PADDING,
  gap = DEFAULT_CELL_GAP
) {
  if (px < 0 || py < 0) {
    return null;
  }

  const step = cellSize + gap;
  const col = Math.round((px - padding) / step) + 0;
  const row = Math.round((py - padding) / step) + 0;

  if (row < 0 || row >= BOARD_GRID_SIZE || col < 0 || col >= BOARD_GRID_SIZE) {
    return null;
  }

  return {
    row,
    col,
    index: row * BOARD_GRID_SIZE + col,
  };
}
