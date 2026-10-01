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
} from '../boardLayout';

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
});

