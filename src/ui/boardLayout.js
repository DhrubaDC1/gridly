import { Dimensions } from 'react-native';

export const BOARD_GRID_SIZE = 8;
export const TOTAL_BOARD_CELLS = 64;
export const DEFAULT_CELL_GAP = 3;
export const DEFAULT_BOARD_PADDING = 8;
export const BASE_CELL_SIZE = 44;
export const BASE_CELL_RADIUS = 44 * 0.16;
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
 * Formula: cellSize * 0.16 (approx 7 at 44px cell size).
 *
 * @param {number} cellSize
 * @returns {number}
 */
export function calculateCellRadius(cellSize) {
  return (cellSize ?? BASE_CELL_SIZE) * 0.16;
}

/**
 * Calculates line endpoints for a socket's inner deboss lines (top shadow and bottom lip).
 * Both lines are 1px tall and inset horizontally by the cell corner radius.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} cellSize
 * @param {number} cellRadius
 * @returns {{
 *   topLine: { p1: { x: number, y: number }, p2: { x: number, y: number } },
 *   bottomLine: { p1: { x: number, y: number }, p2: { x: number, y: number } }
 * }}
 */
export function getSocketLines(x, y, cellSize, cellRadius) {
  const x1 = x + cellRadius;
  const x2 = x + cellSize - cellRadius;
  return {
    topLine: {
      p1: { x: x1, y: y + 0.5 },
      p2: { x: x2, y: y + 0.5 },
    },
    bottomLine: {
      p1: { x: x1, y: y + cellSize - 0.5 },
      p2: { x: x2, y: y + cellSize - 0.5 },
    },
  };
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

/**
 * Calculates bounding box and pixel dimensions of a piece at a given cell size.
 *
 * @param {{ cells: Array<[number, number] | { r: number, c: number }> }} piece
 * @param {number} cellSize
 * @param {number} [gap=DEFAULT_CELL_GAP]
 * @returns {{ numRows: number, numCols: number, width: number, height: number, minR: number, minC: number }}
 */
export function getPieceDimensions(piece, cellSize, gap = DEFAULT_CELL_GAP) {
  if (!piece || !piece.cells || piece.cells.length === 0) {
    return { numRows: 0, numCols: 0, width: 0, height: 0, minR: 0, minC: 0 };
  }

  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;

  for (const cell of piece.cells) {
    const r = Array.isArray(cell) ? cell[0] : cell.r;
    const c = Array.isArray(cell) ? cell[1] : cell.c;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }

  const numRows = maxR - minR + 1;
  const numCols = maxC - minC + 1;
  const width = numCols * cellSize + (numCols - 1) * gap;
  const height = numRows * cellSize + (numRows - 1) * gap;

  return { numRows, numCols, width, height, minR, minC };
}

/**
 * Calculates the rest scale for a piece inside a tray or hold slot.
 * Ensures pieces sit at up to 0.55 scale, scaling down when the piece's full width or height
 * exceeds (slotWidth - 16) or (slotHeight - 16) so that large pieces sit fully inside the slot.
 *
 * Formula: min(0.55, (slotWidth - 16) / pieceWidth, (slotHeight - 16) / pieceHeight)
 *
 * @param {number | { width: number, height: number } | { cells: Array<any> }} pieceOrWidth
 * @param {number} [pieceHeightOrSlotWidth]
 * @param {number} [slotWidthOrHeight]
 * @param {number} [slotHeightOrCellSize]
 * @param {number} [gap]
 * @returns {number}
 */
export function calculateRestScale(
  pieceOrWidth,
  pieceHeightOrSlotWidth,
  slotWidthOrHeight,
  slotHeightOrCellSize,
  gap
) {
  'worklet';
  let pieceWidth;
  let pieceHeight;
  let slotWidth;
  let slotHeight;

  if (typeof pieceOrWidth === 'object' && pieceOrWidth !== null) {
    if ('cells' in pieceOrWidth) {
      const cellSize = slotHeightOrCellSize ?? BASE_CELL_SIZE;
      const pieceGap = gap ?? DEFAULT_CELL_GAP;
      const dims = getPieceDimensions(pieceOrWidth, cellSize, pieceGap);
      pieceWidth = dims.width;
      pieceHeight = dims.height;
      slotWidth = pieceHeightOrSlotWidth;
      slotHeight = slotWidthOrHeight;
    } else {
      pieceWidth = pieceOrWidth.pieceWidth ?? pieceOrWidth.width;
      pieceHeight = pieceOrWidth.pieceHeight ?? pieceOrWidth.height;
      slotWidth = pieceOrWidth.slotWidth;
      slotHeight = pieceOrWidth.slotHeight;
    }
  } else {
    pieceWidth = pieceOrWidth;
    pieceHeight = pieceHeightOrSlotWidth;
    slotWidth = slotWidthOrHeight;
    slotHeight = slotHeightOrCellSize;
  }

  if (
    typeof pieceWidth !== 'number' ||
    typeof pieceHeight !== 'number' ||
    pieceWidth <= 0 ||
    pieceHeight <= 0 ||
    typeof slotWidth !== 'number' ||
    typeof slotHeight !== 'number' ||
    slotWidth <= 0 ||
    slotHeight <= 0
  ) {
    return 0.55;
  }

  const scaleX = (slotWidth - 16) / pieceWidth;
  const scaleY = (slotHeight - 16) / pieceHeight;

  return Math.min(0.55, scaleX, scaleY);
}

export const getRestScale = calculateRestScale;
export const restScale = calculateRestScale;

