import {
  BOARD_SIZE,
  CELL_COUNT,
  createBoard,
  canPlace,
  placePiece,
  findClears,
  applyClears,
  isEmpty,
  anyFit,
} from '../board';
import { getPiece } from '../pieces';

describe('Board engine (§5)', () => {
  const p1x1 = getPiece('line_1x1');
  const p1x2 = getPiece('line_1x2');
  const p2x1 = getPiece('line_2x1');
  const p1x5 = getPiece('line_1x5');
  const p5x1 = getPiece('line_5x1');
  const pSquare2 = getPiece('square_2x2');
  const pSquare3 = getPiece('square_3x3');

  describe('createBoard & isEmpty', () => {
    it('creates an empty 8x8 board with 64 null cells', () => {
      const board = createBoard();
      expect(board).toHaveLength(CELL_COUNT);
      expect(board.every(cell => cell === null)).toBe(true);
      expect(isEmpty(board)).toBe(true);
    });

    it('isEmpty returns false once a cell is placed', () => {
      const board = createBoard();
      const nextBoard = placePiece(board, p1x1, 0, 0, 1);
      expect(isEmpty(nextBoard)).toBe(false);
    });
  });

  describe('canPlace & out-of-bounds / overlap', () => {
    it('allows valid placement on an empty board', () => {
      const board = createBoard();
      expect(canPlace(board, pSquare2, 0, 0)).toBe(true);
      expect(canPlace(board, pSquare2, 6, 6)).toBe(true);
      expect(canPlace(board, p1x5, 0, 3)).toBe(true);
    });

    it('rejects out-of-bounds placements', () => {
      const board = createBoard();

      // Negative coordinates
      expect(canPlace(board, p1x1, -1, 0)).toBe(false);
      expect(canPlace(board, p1x1, 0, -1)).toBe(false);

      // Hanging off right edge
      expect(canPlace(board, p1x5, 0, 4)).toBe(false); // cols 4..8 -> 8 is out of bounds
      expect(canPlace(board, pSquare2, 0, 7)).toBe(false);

      // Hanging off bottom edge
      expect(canPlace(board, p5x1, 4, 0)).toBe(false); // rows 4..8 -> 8 is out of bounds
      expect(canPlace(board, pSquare2, 7, 0)).toBe(false);
      expect(canPlace(board, pSquare3, 6, 6)).toBe(false);
    });

    it('rejects placements overlapping occupied cells', () => {
      const board = createBoard();
      const placed = placePiece(board, pSquare2, 2, 2, 0);

      // Overlap on top-left of the 2x2
      expect(canPlace(placed, p1x1, 2, 2)).toBe(false);
      // Overlap on bottom-right of the 2x2
      expect(canPlace(placed, p1x1, 3, 3)).toBe(false);
      // Square covering the existing square
      expect(canPlace(placed, pSquare2, 2, 2)).toBe(false);
      // Partially overlapping
      expect(canPlace(placed, p1x2, 2, 1)).toBe(false); // covers (2,1) and (2,2)

      // Adjacent non-overlapping placements are allowed
      expect(canPlace(placed, p1x1, 2, 1)).toBe(true);
      expect(canPlace(placed, p1x1, 2, 4)).toBe(true);
      expect(canPlace(placed, p1x1, 1, 2)).toBe(true);
      expect(canPlace(placed, p1x1, 4, 2)).toBe(true);
    });

    it('handles falsy or invalid inputs gracefully', () => {
      const board = createBoard();
      expect(canPlace(null, p1x1, 0, 0)).toBe(false);
      expect(canPlace(board, null, 0, 0)).toBe(false);
      expect(canPlace(board, { cells: null }, 0, 0)).toBe(false);
    });
  });

  describe('placePiece & immutability', () => {
    it('places a piece on the board and does not mutate the original', () => {
      const board = createBoard();
      const newBoard = placePiece(board, p1x2, 3, 4, 2);

      // Original board remains empty
      expect(board[3 * 8 + 4]).toBeNull();
      expect(board[3 * 8 + 5]).toBeNull();

      // New board has the cells
      expect(newBoard[3 * 8 + 4]).toEqual({ color: 2, kind: 'normal', hp: 1 });
      expect(newBoard[3 * 8 + 5]).toEqual({ color: 2, kind: 'normal', hp: 1 });
    });
  });

  describe('findClears & applyClears (row and column simultaneous clear)', () => {
    it('detects a single full row and clears it', () => {
      let board = createBoard();
      for (let c = 0; c < BOARD_SIZE; c++) {
        board = placePiece(board, p1x1, 2, c, c % 6);
      }

      const clears = findClears(board);
      expect(clears.rows).toEqual([2]);
      expect(clears.cols).toEqual([]);
      expect(clears.cells).toHaveLength(8);

      const { board: clearedBoard, events } = applyClears(board, clears);
      for (let c = 0; c < BOARD_SIZE; c++) {
        expect(clearedBoard[2 * BOARD_SIZE + c]).toBeNull();
      }
      expect(events).toEqual([]);
    });

    it('detects a single full column and clears it', () => {
      let board = createBoard();
      for (let r = 0; r < BOARD_SIZE; r++) {
        board = placePiece(board, p1x1, r, 5, r % 6);
      }

      const clears = findClears(board);
      expect(clears.rows).toEqual([]);
      expect(clears.cols).toEqual([5]);
      expect(clears.cells).toHaveLength(8);

      const { board: clearedBoard, events } = applyClears(board, clears);
      for (let r = 0; r < BOARD_SIZE; r++) {
        expect(clearedBoard[r * BOARD_SIZE + 5]).toBeNull();
      }
      expect(events).toEqual([]);
    });

    it('clears a row and a column simultaneously with shared cell counted once', () => {
      let board = createBoard();
      const targetRow = 3;
      const targetCol = 4;
      const sharedIndex = targetRow * BOARD_SIZE + targetCol;

      // Fill row 3
      for (let c = 0; c < BOARD_SIZE; c++) {
        board = placePiece(board, p1x1, targetRow, c, 1);
      }
      // Fill col 4
      for (let r = 0; r < BOARD_SIZE; r++) {
        board = placePiece(board, p1x1, r, targetCol, 2);
      }

      const clears = findClears(board);
      expect(clears.rows).toEqual([targetRow]);
      expect(clears.cols).toEqual([targetCol]);

      // 8 in row + 8 in col - 1 intersection = 15 total cells
      expect(clears.cells).toHaveLength(15);

      // Shared cell is in the list exactly once
      const occurrences = clears.cells.filter(idx => idx === sharedIndex);
      expect(occurrences).toHaveLength(1);

      // Apply clear
      const { board: clearedBoard, events } = applyClears(board, clears);

      // All 15 cells should now be null
      for (const idx of clears.cells) {
        expect(clearedBoard[idx]).toBeNull();
      }
      expect(events).toEqual([]);

      // Immutability: original board is unaffected
      expect(board[sharedIndex]).not.toBeNull();
    });
  });

  describe('lock HP behavior', () => {
    it('reduces lock hp from 2 to 1 and keeps it on the board (emitting lockCracked)', () => {
      let board = createBoard();
      const lockIndex = 0; // (0, 0)
      board[lockIndex] = { color: 3, kind: 'lock', hp: 2 };

      // Fill the rest of row 0 with normal blocks
      for (let c = 1; c < BOARD_SIZE; c++) {
        board = placePiece(board, p1x1, 0, c, 1);
      }

      const clears = findClears(board);
      expect(clears.rows).toEqual([0]);

      const { board: nextBoard, events } = applyClears(board, clears);

      // Normal blocks in row 0 are cleared
      for (let c = 1; c < BOARD_SIZE; c++) {
        expect(nextBoard[c]).toBeNull();
      }

      // Lock cell remains with hp 1
      expect(nextBoard[lockIndex]).toEqual({ color: 3, kind: 'lock', hp: 1 });

      // Emitted lockCracked event
      expect(events).toContainEqual({ type: 'lockCracked', index: lockIndex });
    });

    it('removes lock with hp 1 when its line is cleared (without emitting lockCracked)', () => {
      let board = createBoard();
      const lockIndex = 0;
      board[lockIndex] = { color: 3, kind: 'lock', hp: 1 };

      // Fill the rest of row 0
      for (let c = 1; c < BOARD_SIZE; c++) {
        board = placePiece(board, p1x1, 0, c, 1);
      }

      const clears = findClears(board);
      expect(clears.rows).toEqual([0]);

      const { board: nextBoard, events } = applyClears(board, clears);

      // Lock is now completely removed
      expect(nextBoard[lockIndex]).toBeNull();

      // No lockCracked event when hp is 1
      expect(events.filter(e => e.type === 'lockCracked')).toHaveLength(0);
    });
  });

  describe('gem collection', () => {
    it('removes gem cell and emits gemCollected event', () => {
      let board = createBoard();
      const gemIndex = 2 * BOARD_SIZE + 3; // (2, 3)
      board[gemIndex] = { color: 4, kind: 'gem', hp: 1 };

      // Fill row 2
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (c !== 3) {
          board = placePiece(board, p1x1, 2, c, 0);
        }
      }

      const clears = findClears(board);
      expect(clears.rows).toEqual([2]);

      const { board: nextBoard, events } = applyClears(board, clears);

      // Gem cell is cleared
      expect(nextBoard[gemIndex]).toBeNull();

      // Emits gemCollected
      expect(events).toContainEqual({ type: 'gemCollected', index: gemIndex });
    });
  });

  describe('full clear & isEmpty', () => {
    it('returns isEmpty true after a full board clear', () => {
      let board = createBoard();

      // Fill the entire 8x8 board
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          board[r * BOARD_SIZE + c] = { color: (r + c) % 6, kind: 'normal', hp: 1 };
        }
      }

      expect(isEmpty(board)).toBe(false);

      const clears = findClears(board);
      expect(clears.rows).toHaveLength(8);
      expect(clears.cols).toHaveLength(8);
      expect(clears.cells).toHaveLength(64);

      const { board: clearedBoard } = applyClears(board, clears);
      expect(isEmpty(clearedBoard)).toBe(true);
    });
  });

  describe('anyFit', () => {
    it('returns true on an empty board', () => {
      const board = createBoard();
      expect(anyFit(board, [pSquare3, p1x5])).toBe(true);
    });

    it('returns false on a full board', () => {
      const board = new Array(CELL_COUNT).fill({ color: 0, kind: 'normal', hp: 1 });
      expect(anyFit(board, [p1x1, pSquare2])).toBe(false);
    });

    it('returns true when a smaller piece fits in the only free space', () => {
      // Board full except for cell (0, 0)
      const board = new Array(CELL_COUNT).fill({ color: 0, kind: 'normal', hp: 1 });
      board[0] = null;

      expect(anyFit(board, [pSquare2])).toBe(false);
      expect(anyFit(board, [p1x1])).toBe(true);
      expect(anyFit(board, [pSquare2, p1x1])).toBe(true);
    });

    it('handles null entries in pieces array gracefully', () => {
      const board = createBoard();
      expect(anyFit(board, [null, null])).toBe(false);
      expect(anyFit(board, [null, p1x1])).toBe(true);
      expect(anyFit(board, [])).toBe(false);
      expect(anyFit(board, null)).toBe(false);
    });
  });
});
