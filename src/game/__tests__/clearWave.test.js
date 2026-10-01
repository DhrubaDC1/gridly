import {
  getStaggerDelay,
  getCellDistance,
  getCellStaggerDelay,
  getPieceCenterCell,
  buildClearingDescription,
  STAGGER_MS_PER_CELL,
  CLEAR_DURATION_MS,
} from '../clearWave';

describe('clearWave pure helpers', () => {
  describe('getStaggerDelay', () => {
    test('computes correct delay in ms given distance (18ms per cell)', () => {
      expect(getStaggerDelay(0)).toBe(0);
      expect(getStaggerDelay(1)).toBe(18);
      expect(getStaggerDelay(2)).toBe(36);
      expect(getStaggerDelay(3)).toBe(54);
      expect(getStaggerDelay(4)).toBe(72);
      expect(getStaggerDelay(7)).toBe(126);
    });

    test('returns 0 delay when reduceMotion is true regardless of distance', () => {
      expect(getStaggerDelay(0, true)).toBe(0);
      expect(getStaggerDelay(1, true)).toBe(0);
      expect(getStaggerDelay(2, true)).toBe(0);
      expect(getStaggerDelay(5, true)).toBe(0);
      expect(getStaggerDelay(8, true)).toBe(0);
    });

    test('handles negative distance and non-numbers safely', () => {
      expect(getStaggerDelay(-1)).toBe(0);
      expect(getStaggerDelay(null)).toBe(0);
      expect(getStaggerDelay(undefined)).toBe(0);
    });
  });

  describe('getCellDistance', () => {
    test('computes Chebyshev distance (max of row and column distance)', () => {
      // Same row, 3 columns apart
      expect(getCellDistance({ row: 2, col: 1 }, { row: 2, col: 4 })).toBe(3);

      // Same col, 4 rows apart
      expect(getCellDistance({ row: 0, col: 3 }, { row: 4, col: 3 })).toBe(4);

      // Diagonal: row diff 2, col diff 3 -> max is 3
      expect(getCellDistance({ row: 1, col: 1 }, { row: 3, col: 4 })).toBe(3);

      // Same cell -> distance 0
      expect(getCellDistance({ row: 3, col: 3 }, { row: 3, col: 3 })).toBe(0);
    });

    test('supports 1D cell indices (0..63)', () => {
      // index 0 is (0, 0), index 9 is (1, 1) -> max(1, 1) = 1
      expect(getCellDistance(0, 9)).toBe(1);

      // index 0 is (0, 0), index 7 is (0, 7) -> max(0, 7) = 7
      expect(getCellDistance(0, 7)).toBe(7);

      // index 56 is (7, 0), index 7 is (0, 7) -> max(7, 7) = 7
      expect(getCellDistance(56, 7)).toBe(7);
    });

    test('getCellStaggerDelay combines distance and stagger delay', () => {
      const cell = { row: 0, col: 0 };
      const center = { row: 0, col: 2 };
      expect(getCellStaggerDelay(cell, center)).toBe(36);
      expect(getCellStaggerDelay(cell, center, true)).toBe(0);
    });
  });

  describe('getPieceCenterCell', () => {
    test('computes center for a 1x1 piece', () => {
      const center = getPieceCenterCell([18]); // row 2, col 2
      expect(center.row).toBe(2);
      expect(center.col).toBe(2);
      expect(center.index).toBe(18);
      expect(Number(center)).toBe(18);
    });

    test('computes center for a 1x3 line piece', () => {
      // row 3, cols 1, 2, 3 -> indices 25, 26, 27
      const center = getPieceCenterCell([25, 26, 27]);
      expect(center.row).toBe(3);
      expect(center.col).toBe(2);
      expect(center.index).toBe(26);
    });

    test('computes center for a 3x3 square piece', () => {
      // rows 0..2, cols 0..2 -> center is row 1, col 1 (index 9)
      const cells = [0, 1, 2, 8, 9, 10, 16, 17, 18];
      const center = getPieceCenterCell(cells);
      expect(center.row).toBe(1);
      expect(center.col).toBe(1);
      expect(center.index).toBe(9);
    });

    test('handles empty or missing cells gracefully', () => {
      const center = getPieceCenterCell([]);
      expect(center.row).toBe(0);
      expect(center.col).toBe(0);
      expect(center.index).toBe(0);
    });
  });

  describe('buildClearingDescription', () => {
    test('returns null if events array is empty, missing, or has no cleared event', () => {
      expect(buildClearingDescription({ board: [] }, null)).toBeNull();
      expect(buildClearingDescription({ board: [] }, [])).toBeNull();
      expect(
        buildClearingDescription({ board: [] }, [{ type: 'placed', cells: [0] }])
      ).toBeNull();
    });

    test('builds clearing description preserving cell color and kind from previous state', () => {
      // Prepare previous board with row 0 almost full (cols 0-6 filled, col 7 empty)
      const prevBoard = new Array(64).fill(null);
      for (let c = 0; c < 7; c++) {
        prevBoard[c] = {
          color: c % 3,
          kind: c === 2 ? 'gem' : c === 5 ? 'lock' : 'normal',
          hp: c === 5 ? 2 : 1,
        };
      }

      // Move: placed 1x1 at (0, 7), color 4, which clears row 0
      const events = [
        {
          type: 'placed',
          pieceId: 'line_1x1',
          cells: [7],
          color: 4,
        },
        {
          type: 'cleared',
          rows: [0],
          cols: [],
          cells: [0, 1, 2, 3, 4, 5, 6, 7],
          mono: [],
          linesCount: 1,
        },
      ];

      const clearing = buildClearingDescription({ board: prevBoard }, events);

      expect(clearing).not.toBeNull();
      expect(clearing.indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(clearing.cells).toHaveLength(8);

      // Check center cell: placed at index 7 (row 0, col 7)
      expect(clearing.centerCell.row).toBe(0);
      expect(clearing.centerCell.col).toBe(7);
      expect(clearing.centerCell.index).toBe(7);

      // Check cell 2: gem preserved from prevBoard
      const cell2 = clearing.cells.find((c) => c.index === 2);
      expect(cell2.kind).toBe('gem');
      expect(cell2.color).toBe(prevBoard[2].color);
      // Distance from (0, 7) to (0, 2) is 5
      expect(cell2.distance).toBe(5);

      // Check cell 5: lock with hp 2 preserved from prevBoard
      const cell5 = clearing.cells.find((c) => c.index === 5);
      expect(cell5.kind).toBe('lock');
      expect(cell5.hp).toBe(2);
      expect(cell5.color).toBe(prevBoard[5].color);
      // Distance from (0, 7) to (0, 5) is 2
      expect(cell5.distance).toBe(2);

      // Check cell 7: was empty in prevBoard, taken from placedEvent
      const cell7 = clearing.cells.find((c) => c.index === 7);
      expect(cell7.color).toBe(4);
      expect(cell7.kind).toBe('normal');
      expect(cell7.hp).toBe(1);
      // Distance from center (0, 7) to (0, 7) is 0
      expect(cell7.distance).toBe(0);
    });

    test('computes distance from center for multi-line simultaneous row and col clear', () => {
      const prevBoard = new Array(64).fill(null);
      // Row 2 and Col 3 clearing
      // Placed piece at row 2, col 3 (index 19)
      const clearedCells = [];
      for (let c = 0; c < 8; c++) clearedCells.push(2 * 8 + c);
      for (let r = 0; r < 8; r++) {
        const idx = r * 8 + 3;
        if (!clearedCells.includes(idx)) clearedCells.push(idx);
      }
      clearedCells.sort((a, b) => a - b);

      const events = [
        {
          type: 'placed',
          pieceId: 'line_1x1',
          cells: [19], // row 2, col 3
          color: 1,
        },
        {
          type: 'cleared',
          rows: [2],
          cols: [3],
          cells: clearedCells,
          mono: [],
          linesCount: 2,
        },
      ];

      const clearing = buildClearingDescription({ board: prevBoard }, events);
      expect(clearing).not.toBeNull();
      expect(clearing.centerCell.row).toBe(2);
      expect(clearing.centerCell.col).toBe(3);

      // Center cell distance is 0
      const centerPlaced = clearing.cells.find((c) => c.index === 19);
      expect(centerPlaced.distance).toBe(0);

      // Cell at (2, 0): index 16 -> distance max(|2-2|, |0-3|) = 3
      const leftCell = clearing.cells.find((c) => c.index === 16);
      expect(leftCell.distance).toBe(3);

      // Cell at (7, 3): index 59 -> distance max(|7-2|, |3-3|) = 5
      const bottomCell = clearing.cells.find((c) => c.index === 59);
      expect(bottomCell.distance).toBe(5);
    });
  });
});
