import { pieceSize } from './pieces';

/**
 * 8x8 Board representation and operations for Gridly.
 * Pure JS, deterministic, no side effects.
 *
 * Cell index = row * 8 + col.
 *
 * @typedef {'normal' | 'gem' | 'lock'} CellKind
 * @typedef {Object} Cell
 * @property {number} color - Color index (0-5).
 * @property {CellKind} kind - Kind of cell.
 * @property {number} hp - Hit points (1 or 2).
 *
 * @typedef {(Cell | null)[]} Board - 64-element flat array.
 *
 * @typedef {Object} Clears
 * @property {number[]} rows - Full row indices.
 * @property {number[]} cols - Full column indices.
 * @property {number[]} cells - Unique cell indices cleared.
 *
 * @typedef {Object} ClearEvent
 * @property {string} type - Event type ('gemCollected' | 'lockCracked').
 * @property {number} index - Board cell index.
 */

export const BOARD_SIZE = 8;
export const CELL_COUNT = 64;

/**
 * Creates an empty 8x8 board (flat array of 64 nulls).
 *
 * @returns {Board}
 */
export function createBoard() {
  return new Array(CELL_COUNT).fill(null);
}

/**
 * Determines whether a piece can be placed at (row, col) on the board.
 * Placement is valid if every cell of the piece is in bounds and empty.
 *
 * @param {Board} board
 * @param {import('./pieces').Piece} piece
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
export function canPlace(board, piece, row, col) {
  if (!board || !piece || !piece.cells) {
    return false;
  }

  for (let i = 0; i < piece.cells.length; i++) {
    const [r, c] = piece.cells[i];
    const targetRow = row + r;
    const targetCol = col + c;

    if (
      targetRow < 0 ||
      targetRow >= BOARD_SIZE ||
      targetCol < 0 ||
      targetCol >= BOARD_SIZE
    ) {
      return false;
    }

    const index = targetRow * BOARD_SIZE + targetCol;
    if (board[index] !== null) {
      return false;
    }
  }

  return true;
}

/**
 * Places a piece onto the board and returns a new board without mutating the input.
 *
 * @param {Board} board
 * @param {import('./pieces').Piece} piece
 * @param {number} row
 * @param {number} col
 * @param {number} color
 * @param {CellKind} [kind='normal']
 * @param {number} [hp=1]
 * @returns {Board}
 */
export function placePiece(board, piece, row, col, color, kind = 'normal', hp = 1) {
  const newBoard = [...board];

  for (let i = 0; i < piece.cells.length; i++) {
    const [r, c] = piece.cells[i];
    const targetRow = row + r;
    const targetCol = col + c;
    const index = targetRow * BOARD_SIZE + targetCol;
    newBoard[index] = { color, kind, hp };
  }

  return newBoard;
}

/**
 * Finds every full row and column on the board.
 * Cells at row/column intersections are included only once in `cells`.
 *
 * @param {Board} board
 * @returns {Clears}
 */
export function findClears(board) {
  const rows = [];
  const cols = [];
  const cellSet = new Set();

  for (let r = 0; r < BOARD_SIZE; r++) {
    let full = true;
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r * BOARD_SIZE + c] === null) {
        full = false;
        break;
      }
    }
    if (full) {
      rows.push(r);
      for (let c = 0; c < BOARD_SIZE; c++) {
        cellSet.add(r * BOARD_SIZE + c);
      }
    }
  }

  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r * BOARD_SIZE + c] === null) {
        full = false;
        break;
      }
    }
    if (full) {
      cols.push(c);
      for (let r = 0; r < BOARD_SIZE; r++) {
        cellSet.add(r * BOARD_SIZE + c);
      }
    }
  }

  const cells = Array.from(cellSet).sort((a, b) => a - b);
  return { rows, cols, cells };
}

/**
 * Applies clears to the board.
 * - Normal and gem cells are removed (gem emits gemCollected).
 * - Lock with hp: 2 drops to hp: 1 (emits lockCracked).
 * - Lock with hp: 1 is removed.
 * Returns a new board and an array of events.
 *
 * @param {Board} board
 * @param {Clears} clears
 * @returns {{ board: Board, events: ClearEvent[] }}
 */
export function applyClears(board, clears) {
  const newBoard = [...board];
  const events = [];
  const cellIndices = clears?.cells || [];

  for (let i = 0; i < cellIndices.length; i++) {
    const index = cellIndices[i];
    const cell = newBoard[index];
    if (!cell) {
      continue;
    }

    if (cell.kind === 'gem') {
      newBoard[index] = null;
      events.push({ type: 'gemCollected', index });
    } else if (cell.kind === 'lock') {
      if (cell.hp > 1) {
        newBoard[index] = { ...cell, hp: cell.hp - 1 };
        events.push({ type: 'lockCracked', index });
      } else {
        newBoard[index] = null;
      }
    } else {
      newBoard[index] = null;
    }
  }

  return { board: newBoard, events };
}

/**
 * Checks if the board is completely empty (all cells null).
 *
 * @param {Board} board
 * @returns {boolean}
 */
export function isEmpty(board) {
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) {
      return false;
    }
  }
  return true;
}

/**
 * Checks whether any of the provided pieces fits anywhere on the board.
 *
 * @param {Board} board
 * @param {(import('./pieces').Piece | null)[]} pieces
 * @returns {boolean}
 */
export function anyFit(board, pieces) {
  if (!pieces || pieces.length === 0) {
    return false;
  }

  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (!piece) {
      continue;
    }

    const { rows, cols } = pieceSize(piece);
    const maxRow = BOARD_SIZE - rows;
    const maxCol = BOARD_SIZE - cols;

    for (let r = 0; r <= maxRow; r++) {
      for (let c = 0; c <= maxCol; c++) {
        if (canPlace(board, piece, r, c)) {
          return true;
        }
      }
    }
  }

  return false;
}
