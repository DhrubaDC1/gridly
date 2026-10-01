import {
  BOARD_GRID_SIZE,
  TOTAL_BOARD_CELLS,
  DEFAULT_CELL_GAP,
  DEFAULT_BOARD_PADDING,
  BASE_CELL_SIZE,
  BASE_CELL_RADIUS,
  BOARD_RADIUS,
  BOARD_MAX_WIDTH,
  getDefaultBoardSize,
  calculateCellSize,
  calculateCellRadius,
  adjustBrightness,
  getCellPosition,
  getCellIndex,
  getCellRowCol,
  getBoardMetrics,
  getCellAtPosition,
  getPieceDimensions,
  calculateRestScale,
  getRestScale,
  restScale,
} from '../boardLayout';
import { getPiece } from '../../engine/pieces';

describe('boardLayout', () => {
  test('constants match AGENTS.md specs', () => {
    expect(BOARD_GRID_SIZE).toBe(8);
    expect(TOTAL_BOARD_CELLS).toBe(64);
    expect(DEFAULT_CELL_GAP).toBe(3);
    expect(BASE_CELL_SIZE).toBe(44);
    expect(BASE_CELL_RADIUS).toBe(6);
    expect(BOARD_RADIUS).toBe(20);
    expect(BOARD_MAX_WIDTH).toBe(420);
  });

  test('getDefaultBoardSize clamps correctly', () => {
    expect(getDefaultBoardSize(390)).toBe(358);
    expect(getDefaultBoardSize(460)).toBe(420);
    expect(getDefaultBoardSize(600)).toBe(420);
  });

  test('calculateCellSize geometry produces exact board width', () => {
    const boardSize = 420;
    const padding = DEFAULT_BOARD_PADDING;
    const gap = DEFAULT_CELL_GAP;
    const cellSize = calculateCellSize(boardSize, padding, gap);

    const totalWidth = 2 * padding + 8 * cellSize + 7 * gap;
    expect(totalWidth).toBeCloseTo(boardSize, 5);
  });

  test('calculateCellRadius scales proportionally', () => {
    expect(calculateCellRadius(44)).toBe(6);
    expect(calculateCellRadius(22)).toBe(3);
    expect(calculateCellRadius(88)).toBe(12);
  });

  test('adjustBrightness brightens and darkens hex colors', () => {
    // Darkening Harbor (#5B7DB1)
    const darkened = adjustBrightness('#5B7DB1', -25);
    expect(darkened).toMatch(/^#[0-9a-f]{6}$/i);
    expect(darkened).not.toBe('#5b7db1');

    // Lightening
    const brightened = adjustBrightness('#5B7DB1', 20);
    expect(brightened).toMatch(/^#[0-9a-f]{6}$/i);
    expect(brightened).not.toBe('#5b7db1');

    // Clamping to black and white
    expect(adjustBrightness('#5B7DB1', -200)).toBe('#000000');
    expect(adjustBrightness('#5B7DB1', 200)).toBe('#ffffff');

    // Invalid inputs handled safely
    expect(adjustBrightness(null, 10)).toBeNull();
    expect(adjustBrightness('invalid', 10)).toBe('invalid');
  });

  test('getCellPosition calculates correct positions for corners', () => {
    const cellSize = 40;
    const padding = 8;
    const gap = 3;

    // Top-left: index 0 (row 0, col 0)
    const tl = getCellPosition(0, cellSize, padding, gap);
    expect(tl).toEqual({ x: 8, y: 8, row: 0, col: 0 });

    // Top-right: index 7 (row 0, col 7)
    const tr = getCellPosition(7, cellSize, padding, gap);
    expect(tr).toEqual({ x: 8 + 7 * 43, y: 8, row: 0, col: 7 });

    // Bottom-left: index 56 (row 7, col 0)
    const bl = getCellPosition(56, cellSize, padding, gap);
    expect(bl).toEqual({ x: 8, y: 8 + 7 * 43, row: 7, col: 0 });

    // Bottom-right: index 63 (row 7, col 7)
    const br = getCellPosition(63, cellSize, padding, gap);
    expect(br).toEqual({ x: 8 + 7 * 43, y: 8 + 7 * 43, row: 7, col: 7 });

    // Supports coords object as first argument
    const coords = getCellPosition({ row: 2, col: 3 }, cellSize, padding, gap);
    expect(coords).toEqual({ x: 8 + 3 * 43, y: 8 + 2 * 43, row: 2, col: 3 });
  });

  test('getCellIndex and getCellRowCol round-trip perfectly', () => {
    for (let index = 0; index < TOTAL_BOARD_CELLS; index++) {
      const { row, col } = getCellRowCol(index);
      expect(getCellIndex(row, col)).toBe(index);
      expect(row).toBe(Math.floor(index / 8));
      expect(col).toBe(index % 8);
    }
  });

  test('getBoardMetrics provides all required layout values', () => {
    const metrics = getBoardMetrics(358);
    expect(metrics.boardSize).toBe(358);
    expect(metrics.gridSize).toBe(8);
    expect(metrics.totalCells).toBe(64);
    expect(metrics.boardRadius).toBe(20);
    expect(metrics.cellSize).toBeGreaterThan(0);
    expect(metrics.cellRadius).toBeGreaterThan(0);
  });

  test('getCellAtPosition maps pixels to cell coordinates', () => {
    const cellSize = 40;
    const padding = 8;
    const gap = 3;

    // Inside cell (row 1, col 2) -> index 10
    const cellX = padding + 2 * 43 + 20;
    const cellY = padding + 1 * 43 + 20;
    const hit = getCellAtPosition(cellX, cellY, cellSize, padding, gap);
    expect(hit).toEqual({ row: 1, col: 2, index: 10 });

    // Out of bounds
    expect(getCellAtPosition(-10, 50, cellSize, padding, gap)).toBeNull();
    expect(getCellAtPosition(500, 50, cellSize, padding, gap)).toBeNull();
  });

  test('getPieceDimensions calculates bounding box and pixel dimensions correctly', () => {
    const cellSize = 40;
    const gap = 3;

    // 1x3 horizontal piece
    const p1x3 = { cells: [[0, 0], [0, 1], [0, 2]] };
    const dim1x3 = getPieceDimensions(p1x3, cellSize, gap);
    expect(dim1x3.numRows).toBe(1);
    expect(dim1x3.numCols).toBe(3);
    expect(dim1x3.width).toBe(3 * 40 + 2 * 3);
    expect(dim1x3.height).toBe(40);

    // 2x2 square
    const p2x2 = { cells: [[0, 0], [0, 1], [1, 0], [1, 1]] };
    const dim2x2 = getPieceDimensions(p2x2, cellSize, gap);
    expect(dim2x2.numRows).toBe(2);
    expect(dim2x2.numCols).toBe(2);
    expect(dim2x2.width).toBe(2 * 40 + 3);
    expect(dim2x2.height).toBe(2 * 40 + 3);

    // Empty/null
    expect(getPieceDimensions(null, cellSize)).toEqual({
      numRows: 0,
      numCols: 0,
      width: 0,
      height: 0,
      minR: 0,
      minC: 0,
    });
  });

  describe('calculateRestScale', () => {
    const cellSize = 44;
    const gap = 3;
    const slotWidth = 90;
    const slotHeight = 96;

    test('1x1 piece scales to max rest scale of 0.55', () => {
      const piece1x1 = getPiece('line_1x1');
      const dims = getPieceDimensions(piece1x1, cellSize, gap);
      expect(dims.width).toBe(44);
      expect(dims.height).toBe(44);

      const scale = calculateRestScale(dims.width, dims.height, slotWidth, slotHeight);
      expect(scale).toBe(0.55);

      // Also works when passing piece object directly
      const scaleFromPiece = calculateRestScale(piece1x1, slotWidth, slotHeight, cellSize, gap);
      expect(scaleFromPiece).toBe(0.55);

      // Fits well within slot
      expect(dims.width * scale).toBeLessThanOrEqual(slotWidth - 16);
      expect(dims.height * scale).toBeLessThanOrEqual(slotHeight - 16);
    });

    test('1x5 piece scales down below 0.55 to sit fully inside slotWidth - 16', () => {
      const piece1x5 = getPiece('line_1x5');
      const dims = getPieceDimensions(piece1x5, cellSize, gap);
      // 5 * 44 + 4 * 3 = 232
      expect(dims.width).toBe(232);
      expect(dims.height).toBe(44);

      const expectedScale = (slotWidth - 16) / dims.width; // 74 / 232 ≈ 0.3189655
      const scale = calculateRestScale(dims.width, dims.height, slotWidth, slotHeight);

      expect(scale).toBeCloseTo(expectedScale, 6);
      expect(scale).toBeLessThan(0.55);

      // Verify piece sits fully inside slot with at least 8px margin on each side
      const scaledWidth = dims.width * scale;
      const scaledHeight = dims.height * scale;
      expect(scaledWidth).toBeCloseTo(slotWidth - 16, 5);
      expect(scaledWidth).toBeLessThanOrEqual(slotWidth - 16);
      expect(scaledHeight).toBeLessThanOrEqual(slotHeight - 16);

      const leftMargin = (slotWidth - scaledWidth) / 2;
      expect(leftMargin).toBeCloseTo(8, 5);

      // Verify with piece object directly
      expect(calculateRestScale(piece1x5, slotWidth, slotHeight, cellSize, gap)).toBeCloseTo(
        expectedScale,
        6
      );
    });

    test('5x1 piece scales down below 0.55 to sit fully inside slotHeight - 16', () => {
      const piece5x1 = getPiece('line_5x1');
      const dims = getPieceDimensions(piece5x1, cellSize, gap);
      expect(dims.width).toBe(44);
      expect(dims.height).toBe(232);

      const expectedScale = (slotHeight - 16) / dims.height; // 80 / 232 ≈ 0.3448275
      const scale = calculateRestScale(dims.width, dims.height, slotWidth, slotHeight);

      expect(scale).toBeCloseTo(expectedScale, 6);
      expect(scale).toBeLessThan(0.55);

      // Verify piece sits fully inside slot with at least 8px margin on each side
      const scaledWidth = dims.width * scale;
      const scaledHeight = dims.height * scale;
      expect(scaledWidth).toBeLessThanOrEqual(slotWidth - 16);
      expect(scaledHeight).toBeCloseTo(slotHeight - 16, 5);
      expect(scaledHeight).toBeLessThanOrEqual(slotHeight - 16);

      const topMargin = (slotHeight - scaledHeight) / 2;
      expect(topMargin).toBeCloseTo(8, 5);

      // Verify with piece object directly
      expect(calculateRestScale(piece5x1, slotWidth, slotHeight, cellSize, gap)).toBeCloseTo(
        expectedScale,
        6
      );
    });

    test('3x3 piece scales down in tight slots and clamps to 0.55 in larger slots', () => {
      const piece3x3 = getPiece('square_3x3');
      const dims = getPieceDimensions(piece3x3, cellSize, gap);
      // 3 * 44 + 2 * 3 = 138
      expect(dims.width).toBe(138);
      expect(dims.height).toBe(138);

      // In narrow slot (90x96): (90 - 16) / 138 = 74 / 138 ≈ 0.5362 < 0.55
      const tightScale = calculateRestScale(dims.width, dims.height, slotWidth, slotHeight);
      expect(tightScale).toBeCloseTo(74 / 138, 5);
      expect(tightScale).toBeLessThan(0.55);
      expect(dims.width * tightScale).toBeCloseTo(slotWidth - 16, 5);

      // In wide slot (120x96): (120 - 16) / 138 ≈ 0.7536, (96 - 16) / 138 ≈ 0.5797 -> clamped to 0.55
      const wideScale = calculateRestScale(dims.width, dims.height, 120, slotHeight);
      expect(wideScale).toBe(0.55);

      // Passing piece object directly
      expect(calculateRestScale(piece3x3, slotWidth, slotHeight, cellSize, gap)).toBeCloseTo(
        74 / 138,
        5
      );
    });

    test('supports options object argument shape', () => {
      const scale = calculateRestScale({
        pieceWidth: 232,
        pieceHeight: 44,
        slotWidth: 90,
        slotHeight: 96,
      });
      expect(scale).toBeCloseTo(74 / 232, 6);
    });

    test('handles invalid, missing, or zero dimensions with 0.55 default', () => {
      expect(calculateRestScale(null, null, 90, 96)).toBe(0.55);
      expect(calculateRestScale(0, 0, 90, 96)).toBe(0.55);
      expect(calculateRestScale(undefined, 44, 90, 96)).toBe(0.55);
      expect(calculateRestScale(44, 44, 0, 96)).toBe(0.55);
      expect(calculateRestScale({ width: 0, height: 0, slotWidth: 90, slotHeight: 96 })).toBe(0.55);
    });

    test('exports getRestScale and restScale as identical aliases', () => {
      expect(getRestScale).toBe(calculateRestScale);
      expect(restScale).toBe(calculateRestScale);
    });
  });
});

