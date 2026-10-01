import {
  TRAY_SIZE,
  COLOR_COUNT,
  DIFFICULTY_THRESHOLDS,
  getPieceCategory,
  getDifficultyMultipliers,
  pickWeightedPiece,
  findSmallestFittingPiece,
  canPlaceAll,
  generateTray,
} from '../generator';
import { createBoard, placePiece, anyFit, canPlace, BOARD_SIZE } from '../board';
import { createRng } from '../rng';
import { getPiece, PIECES } from '../pieces';

describe('Piece Generator Engine (§5)', () => {
  const p1x1 = getPiece('line_1x1');
  const p1x5 = getPiece('line_1x5');

  describe('Tray shape & properties', () => {
    it('returns an array of 3 pieces', () => {
      const rng = createRng(123);
      const tray = generateTray(createBoard(), 0, rng);
      expect(Array.isArray(tray)).toBe(true);
      expect(tray).toHaveLength(TRAY_SIZE);
    });

    it('assigns each piece a valid random color between 0 and 5', () => {
      const rng = createRng(456);
      const tray = generateTray(createBoard(), 0, rng);
      for (const piece of tray) {
        expect(typeof piece.id).toBe('string');
        expect(Array.isArray(piece.cells)).toBe(true);
        expect(Number.isInteger(piece.color)).toBe(true);
        expect(piece.color).toBeGreaterThanOrEqual(0);
        expect(piece.color).toBeLessThan(COLOR_COUNT);
      }
    });
  });

  describe('Determinism: same seed gives the same tray', () => {
    it('generates identical trays when given the same seed and score', () => {
      const seed = 987654321;
      const rng1 = createRng(seed);
      const rng2 = createRng(seed);

      const board = createBoard();
      const tray1 = generateTray(board, 0, rng1);
      const tray2 = generateTray(board, 0, rng2);

      expect(tray1).toEqual(tray2);
    });

    it('generates identical trays at high scores with the same seed', () => {
      const seed = 555123;
      const rng1 = createRng(seed);
      const rng2 = createRng(seed);

      const board = createBoard();
      const tray1 = generateTray(board, 12000, rng1);
      const tray2 = generateTray(board, 12000, rng2);

      expect(tray1).toEqual(tray2);
    });

    it('generates different trays for different seeds', () => {
      const rng1 = createRng(111);
      const rng2 = createRng(999);

      const board = createBoard();
      const tray1 = generateTray(board, 0, rng1);
      const tray2 = generateTray(board, 0, rng2);

      expect(tray1).not.toEqual(tray2);
    });
  });

  describe('Difficulty curve & weight shift', () => {
    it('categorizes pieces into small, medium, and large', () => {
      expect(getPieceCategory(getPiece('line_1x1'))).toBe('small'); // 1 cell
      expect(getPieceCategory(getPiece('line_1x2'))).toBe('small'); // 2 cells
      expect(getPieceCategory(getPiece('small_l_0'))).toBe('small'); // 3 cells

      expect(getPieceCategory(getPiece('square_2x2'))).toBe('medium'); // 4 cells
      expect(getPieceCategory(getPiece('t_0'))).toBe('medium'); // 4 cells
      expect(getPieceCategory(getPiece('line_1x5'))).toBe('medium'); // 5 cells
      expect(getPieceCategory(getPiece('big_l_0'))).toBe('medium'); // 5 cells

      expect(getPieceCategory(getPiece('rect_2x3'))).toBe('large'); // 6 cells
      expect(getPieceCategory(getPiece('rect_3x2'))).toBe('large'); // 6 cells
      expect(getPieceCategory(getPiece('square_3x3'))).toBe('large'); // 9 cells
    });

    it('retrieves multipliers shifting from small to large as score rises', () => {
      const earlyMults = getDifficultyMultipliers(0);
      const midMults = getDifficultyMultipliers(3000);
      const highMults = getDifficultyMultipliers(10000);
      const masterMults = getDifficultyMultipliers(30000);

      // Low score favors small pieces over large pieces
      expect(earlyMults.small).toBeGreaterThan(earlyMults.large);

      // High score favors large pieces over small pieces
      expect(highMults.large).toBeGreaterThan(highMults.small);
      expect(masterMults.large).toBeGreaterThan(masterMults.small);

      // Multipliers monotonically increase for large pieces
      expect(masterMults.large).toBeGreaterThan(highMults.large);
      expect(highMults.large).toBeGreaterThan(midMults.large);
    });

    it('statistically generates more large pieces at high score than at score 0', () => {
      const lowMults = getDifficultyMultipliers(0);
      const highMults = getDifficultyMultipliers(25000);

      const rngLow = createRng(42);
      const rngHigh = createRng(42);

      let lowLargeCount = 0;
      let highLargeCount = 0;
      const samples = 600;

      for (let i = 0; i < samples; i++) {
        const pLow = pickWeightedPiece(rngLow, lowMults);
        if (getPieceCategory(pLow) === 'large') lowLargeCount++;

        const pHigh = pickWeightedPiece(rngHigh, highMults);
        if (getPieceCategory(pHigh) === 'large') highLargeCount++;
      }

      expect(highLargeCount).toBeGreaterThan(lowLargeCount * 2);
    });
  });

  describe('canPlaceAll helper', () => {
    it('returns true when pieces array is empty', () => {
      expect(canPlaceAll(createBoard(), [])).toBe(true);
    });

    it('returns true when all 3 pieces can fit on an empty board', () => {
      const p1 = { ...getPiece('square_2x2'), color: 0 };
      const p2 = { ...getPiece('line_1x4'), color: 1 };
      const p3 = { ...getPiece('square_3x3'), color: 2 };
      expect(canPlaceAll(createBoard(), [p1, p2, p3])).toBe(true);
    });

    it('simulates line clears to allow placement of subsequent pieces', () => {
      // Create a board where row 0 has 7 filled cells (cols 0-6) and col 7 is empty.
      // Piece 1 is line_1x1 placed at (0, 7) which clears row 0.
      // Piece 2 is line_1x5 which now fits in row 0.
      // All other rows 1-7 are completely full so line_1x5 could not fit otherwise.
      let board = createBoard();
      // Fill all cells except (0, 7)
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (r !== 0 || c !== 7) {
            board = placePiece(board, p1x1, r, c, 0);
          }
        }
      }

      const piece1 = { ...p1x1, color: 0 };
      const piece2 = { ...p1x5, color: 1 };

      // Without line clear piece2 could never fit. With line clear row 0 clears and piece2 fits!
      expect(canPlaceAll(board, [piece1, piece2])).toBe(true);
    });

    it('returns false when pieces cannot all fit', () => {
      // Checkerboard pattern: every other cell is filled.
      // Every empty cell is isolated with no horizontally or vertically adjacent empty cells.
      let board = createBoard();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if ((r + c) % 2 === 0) {
            board = placePiece(board, p1x1, r, c, 0);
          }
        }
      }

      // Three pieces each needing 2 adjacent cells cannot fit anywhere on this board
      const p1 = { ...getPiece('line_1x2'), color: 0 };
      const p2 = { ...getPiece('line_1x2'), color: 1 };
      const p3 = { ...getPiece('line_1x2'), color: 2 };
      expect(canPlaceAll(board, [p1, p2, p3])).toBe(false);
    });
  });

  describe('findSmallestFittingPiece helper', () => {
    it('returns line_1x1 when only a single cell is open', () => {
      let board = createBoard();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (r !== 3 || c !== 3) {
            board = placePiece(board, p1x1, r, c, 0);
          }
        }
      }
      const smallest = findSmallestFittingPiece(board);
      expect(smallest).not.toBeNull();
      expect(smallest.id).toBe('line_1x1');
    });

    it('returns null when the board is completely full', () => {
      let board = createBoard();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          board = placePiece(board, p1x1, r, c, 0);
        }
      }
      expect(findSmallestFittingPiece(board)).toBeNull();
    });
  });

  describe('Fairness guarantee on a nearly full board', () => {
    it('guarantees at least 1 piece fits when only 1 cell is empty', () => {
      // Fill 63 cells, leave only cell (4, 4) empty
      let board = createBoard();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (r !== 4 || c !== 4) {
            board = placePiece(board, p1x1, r, c, 0);
          }
        }
      }

      // Test across multiple seeds and scores
      const seeds = [1, 42, 100, 777, 9999];
      for (const seed of seeds) {
        const rng = createRng(seed);
        const tray = generateTray(board, 5000, rng);

        expect(tray).toHaveLength(TRAY_SIZE);
        expect(anyFit(board, tray)).toBe(true);
        expect(tray.some(p => canPlace(board, p, 4, 4))).toBe(true);
      }
    });

    it('guarantees at least 1 piece fits when only a 2x1 hole is empty', () => {
      let board = createBoard();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if ((r !== 2 || c !== 2) && (r !== 3 || c !== 2)) {
            board = placePiece(board, p1x1, r, c, 0);
          }
        }
      }

      const rng = createRng(12345);
      const tray = generateTray(board, 8000, rng);
      expect(anyFit(board, tray)).toBe(true);
    });
  });

  describe('Early-mercy preference (score < 1500)', () => {
    it('ensures all 3 pieces can be placed in some order on an open board', () => {
      const rng = createRng(77);
      const board = createBoard();
      const tray = generateTray(board, 0, rng);

      expect(tray).toHaveLength(TRAY_SIZE);
      expect(canPlaceAll(board, tray)).toBe(true);
    });

    it('works under score 1500 across various seeds', () => {
      for (let seed = 1; seed <= 10; seed++) {
        const rng = createRng(seed);
        const board = createBoard();
        const tray = generateTray(board, 500, rng);
        expect(canPlaceAll(board, tray)).toBe(true);
      }
    });

    it('gives up after 20 tries and still guarantees fairness if all 3 cannot fit', () => {
      // Board with only 2 scattered empty cells (0, 0) and (7, 7).
      // Since each piece has >= 1 cell, placing all 3 would require at least 3 cells.
      // Therefore, all 3 pieces CAN NEVER fit.
      let board = createBoard();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if ((r !== 0 || c !== 0) && (r !== 7 || c !== 7)) {
            board = placePiece(board, p1x1, r, c, 0);
          }
        }
      }

      const rng = createRng(42);
      // Score < 1500 triggers early mercy attempts, which gives up after 20 tries
      const tray = generateTray(board, 500, rng);

      // Early mercy gave up after 20 tries, but fairness guarantee still holds!
      expect(tray).toHaveLength(TRAY_SIZE);
      expect(anyFit(board, tray)).toBe(true);
    });
  });
});
