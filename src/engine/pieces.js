/**
 * Shape catalog for Gridly.
 * Pure JS, deterministic, no side effects.
 *
 * Each piece is normalized such that the minimum row and column indices are 0.
 *
 * @typedef {[number, number]} CellCoord - [row, col] coordinate.
 * @typedef {Object} Piece
 * @property {string} id - Unique identifier for the piece.
 * @property {CellCoord[]} cells - Array of [row, col] coordinates.
 * @property {number} weight - Relative weight in random generation.
 *
 * @typedef {Object} PieceSize
 * @property {number} rows - Bounding box row count.
 * @property {number} cols - Bounding box column count.
 */

/** @type {readonly Piece[]} */
export const PIECES = Object.freeze([
  // Lines: 1x1, 1x2, 2x1, 1x3, 3x1, 1x4, 4x1, 1x5, 5x1 (9 pieces)
  { id: 'line_1x1', cells: [[0, 0]], weight: 1 },
  { id: 'line_1x2', cells: [[0, 0], [0, 1]], weight: 1 },
  { id: 'line_2x1', cells: [[0, 0], [1, 0]], weight: 1 },
  { id: 'line_1x3', cells: [[0, 0], [0, 1], [0, 2]], weight: 1 },
  { id: 'line_3x1', cells: [[0, 0], [1, 0], [2, 0]], weight: 1 },
  { id: 'line_1x4', cells: [[0, 0], [0, 1], [0, 2], [0, 3]], weight: 1 },
  { id: 'line_4x1', cells: [[0, 0], [1, 0], [2, 0], [3, 0]], weight: 1 },
  { id: 'line_1x5', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], weight: 1 },
  { id: 'line_5x1', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], weight: 1 },

  // Squares: 2x2, 3x3 (2 pieces)
  { id: 'square_2x2', cells: [[0, 0], [0, 1], [1, 0], [1, 1]], weight: 1 },
  { id: 'square_3x3', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], weight: 1 },

  // Rectangles: 2x3, 3x2 (2 pieces)
  { id: 'rect_2x3', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], weight: 1 },
  { id: 'rect_3x2', cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]], weight: 1 },

  // Small L (3 cells, 2x2 minus one): 4 orientations
  { id: 'small_l_0', cells: [[0, 0], [1, 0], [1, 1]], weight: 1 },
  { id: 'small_l_90', cells: [[0, 0], [0, 1], [1, 0]], weight: 1 },
  { id: 'small_l_180', cells: [[0, 0], [0, 1], [1, 1]], weight: 1 },
  { id: 'small_l_270', cells: [[0, 1], [1, 0], [1, 1]], weight: 1 },

  // Big L (5 cells, 3x3 corner): 4 orientations
  { id: 'big_l_0', cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], weight: 1 },
  { id: 'big_l_90', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], weight: 1 },
  { id: 'big_l_180', cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], weight: 1 },
  { id: 'big_l_270', cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]], weight: 1 },

  // L-tetromino: 4 orientations
  { id: 'l_tetromino_0', cells: [[0, 0], [1, 0], [2, 0], [2, 1]], weight: 1 },
  { id: 'l_tetromino_90', cells: [[0, 0], [0, 1], [0, 2], [1, 0]], weight: 1 },
  { id: 'l_tetromino_180', cells: [[0, 0], [0, 1], [1, 1], [2, 1]], weight: 1 },
  { id: 'l_tetromino_270', cells: [[0, 2], [1, 0], [1, 1], [1, 2]], weight: 1 },

  // J-tetromino: 4 orientations
  { id: 'j_tetromino_0', cells: [[0, 1], [1, 1], [2, 0], [2, 1]], weight: 1 },
  { id: 'j_tetromino_90', cells: [[0, 0], [1, 0], [1, 1], [1, 2]], weight: 1 },
  { id: 'j_tetromino_180', cells: [[0, 0], [0, 1], [1, 0], [2, 0]], weight: 1 },
  { id: 'j_tetromino_270', cells: [[0, 0], [0, 1], [0, 2], [1, 2]], weight: 1 },

  // T: 4 orientations
  { id: 't_0', cells: [[0, 0], [0, 1], [0, 2], [1, 1]], weight: 1 },
  { id: 't_90', cells: [[0, 1], [1, 0], [1, 1], [2, 1]], weight: 1 },
  { id: 't_180', cells: [[0, 1], [1, 0], [1, 1], [1, 2]], weight: 1 },
  { id: 't_270', cells: [[0, 0], [1, 0], [1, 1], [2, 0]], weight: 1 },

  // S: 2 orientations
  { id: 's_0', cells: [[0, 1], [0, 2], [1, 0], [1, 1]], weight: 1 },
  { id: 's_90', cells: [[0, 0], [1, 0], [1, 1], [2, 1]], weight: 1 },

  // Z: 2 orientations
  { id: 'z_0', cells: [[0, 0], [0, 1], [1, 1], [1, 2]], weight: 1 },
  { id: 'z_90', cells: [[0, 1], [1, 0], [1, 1], [2, 0]], weight: 1 },
]);

const PIECES_BY_ID = new Map(PIECES.map(p => [p.id, p]));

/**
 * Retrieves a piece by its unique ID.
 *
 * @param {string} id - Piece identifier.
 * @returns {Piece | null}
 */
export function getPiece(id) {
  return PIECES_BY_ID.get(id) || null;
}

/**
 * Calculates the bounding box size (rows and columns) of a piece.
 *
 * @param {Piece} piece
 * @returns {PieceSize}
 */
export function pieceSize(piece) {
  if (!piece || !piece.cells || piece.cells.length === 0) {
    return { rows: 0, cols: 0 };
  }
  let maxR = 0;
  let maxC = 0;
  for (let i = 0; i < piece.cells.length; i++) {
    const [r, c] = piece.cells[i];
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { rows: maxR + 1, cols: maxC + 1 };
}
