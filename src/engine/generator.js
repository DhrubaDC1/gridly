import { PIECES, pieceSize } from './pieces';
import {
  BOARD_SIZE,
  createBoard,
  canPlace,
  placePiece,
  findClears,
  applyClears,
  anyFit,
} from './board';
import { createRng } from './rng';

/**
 * Piece generation and tray management for Gridly.
 * Pure JS, deterministic, no side effects.
 *
 * @typedef {import('./pieces').Piece} Piece
 * @typedef {import('./board').Board} Board
 * @typedef {import('./rng').Rng} Rng
 *
 * @typedef {Piece & { color: number }} TrayPiece
 *
 * @typedef {'small' | 'medium' | 'large'} PieceCategory
 *
 * @typedef {Object} CategoryMultipliers
 * @property {number} small
 * @property {number} medium
 * @property {number} large
 *
 * @typedef {Object} DifficultyThreshold
 * @property {number} minScore
 * @property {CategoryMultipliers} multipliers
 */

export const TRAY_SIZE = 3;
export const COLOR_COUNT = 6;
export const MAX_RESAMPLE_ATTEMPTS = 20;
export const EARLY_MERCY_MAX_ATTEMPTS = 20;
export const EARLY_MERCY_SCORE_THRESHOLD = 1500;
export const EARLY_MERCY_SEARCH_MAX_NODES = 500;

/**
 * Difficulty curve table: score thresholds -> category weight multipliers.
 * Weights shift toward larger pieces as score rises.
 *
 * @type {readonly DifficultyThreshold[]}
 */
export const DIFFICULTY_THRESHOLDS = Object.freeze([
  {
    minScore: 0,
    multipliers: Object.freeze({ small: 1.2, medium: 1.0, large: 0.6 }),
  },
  {
    minScore: 1500,
    multipliers: Object.freeze({ small: 1.0, medium: 1.0, large: 1.0 }),
  },
  {
    minScore: 5000,
    multipliers: Object.freeze({ small: 0.8, medium: 1.0, large: 1.4 }),
  },
  {
    minScore: 10000,
    multipliers: Object.freeze({ small: 0.6, medium: 1.0, large: 1.8 }),
  },
  {
    minScore: 25000,
    multipliers: Object.freeze({ small: 0.4, medium: 1.0, large: 2.2 }),
  },
]);

// Pre-sorted catalog ascending by cell count to quickly find smallest fitting piece
const PIECES_BY_SIZE = Object.freeze(
  [...PIECES].sort((a, b) => a.cells.length - b.cells.length)
);

/**
 * Classifies a piece into small (1-3 cells), medium (4-5 cells), or large (6+ cells).
 *
 * @param {Piece} piece
 * @returns {PieceCategory}
 */
export function getPieceCategory(piece) {
  const count = piece?.cells?.length ?? 0;
  if (count <= 3) {
    return 'small';
  }
  if (count <= 5) {
    return 'medium';
  }
  return 'large';
}

/**
 * Looks up difficulty multipliers based on current score.
 *
 * @param {number} [score=0]
 * @returns {CategoryMultipliers}
 */
export function getDifficultyMultipliers(score = 0) {
  let matched = DIFFICULTY_THRESHOLDS[0].multipliers;
  for (let i = 0; i < DIFFICULTY_THRESHOLDS.length; i++) {
    if (score >= DIFFICULTY_THRESHOLDS[i].minScore) {
      matched = DIFFICULTY_THRESHOLDS[i].multipliers;
    }
  }
  return matched;
}

/**
 * Calculates effective generation weight for a piece given category multipliers.
 *
 * @param {Piece} piece
 * @param {CategoryMultipliers} multipliers
 * @returns {number}
 */
export function getPieceWeight(piece, multipliers) {
  const category = getPieceCategory(piece);
  const mult = multipliers?.[category] ?? 1;
  return (piece?.weight ?? 1) * mult;
}

/**
 * Selects a random piece from the catalog using weighted random selection.
 *
 * @param {Rng} rng
 * @param {CategoryMultipliers} multipliers
 * @returns {Piece}
 */
export function pickWeightedPiece(rng, multipliers) {
  let totalWeight = 0;
  for (let i = 0; i < PIECES.length; i++) {
    totalWeight += getPieceWeight(PIECES[i], multipliers);
  }

  const roll = rng.next() * totalWeight;
  let accumulated = 0;
  for (let i = 0; i < PIECES.length; i++) {
    accumulated += getPieceWeight(PIECES[i], multipliers);
    if (roll < accumulated) {
      return PIECES[i];
    }
  }

  return PIECES[PIECES.length - 1];
}

/**
 * Generates a single piece with a random color in 0-5.
 *
 * @param {Rng} rng
 * @param {CategoryMultipliers} multipliers
 * @returns {TrayPiece}
 */
export function generateTrayPiece(rng, multipliers) {
  const basePiece = pickWeightedPiece(rng, multipliers);
  const color = rng.int(COLOR_COUNT);
  return {
    ...basePiece,
    color,
  };
}

/**
 * Generates a candidate tray of 3 pieces.
 *
 * @param {Rng} rng
 * @param {CategoryMultipliers} multipliers
 * @returns {TrayPiece[]}
 */
export function generateCandidateTray(rng, multipliers) {
  return [
    generateTrayPiece(rng, multipliers),
    generateTrayPiece(rng, multipliers),
    generateTrayPiece(rng, multipliers),
  ];
}

/**
 * Finds the smallest catalog piece that can fit on the current board.
 *
 * @param {Board} board
 * @returns {Piece | null}
 */
export function findSmallestFittingPiece(board) {
  for (let i = 0; i < PIECES_BY_SIZE.length; i++) {
    const piece = PIECES_BY_SIZE[i];
    if (anyFit(board, [piece])) {
      return piece;
    }
  }
  return null;
}

/**
 * Quick search to determine if all pieces can be placed in some order on the board.
 * Simulates line clears upon placement. Node budget prevents long searches.
 *
 * @param {Board} board
 * @param {TrayPiece[]} pieces
 * @param {number} [maxNodes=EARLY_MERCY_SEARCH_MAX_NODES]
 * @returns {boolean}
 */
export function canPlaceAll(board, pieces, maxNodes = EARLY_MERCY_SEARCH_MAX_NODES) {
  if (!pieces || pieces.length === 0) {
    return true;
  }
  if (!board) {
    return false;
  }

  let nodes = 0;

  function search(currentBoard, remainingPieces) {
    if (remainingPieces.length === 0) {
      return true;
    }
    nodes++;
    if (nodes > maxNodes) {
      return false;
    }

    for (let i = 0; i < remainingPieces.length; i++) {
      const piece = remainingPieces[i];
      const { rows, cols } = pieceSize(piece);
      const maxRow = BOARD_SIZE - rows;
      const maxCol = BOARD_SIZE - cols;

      for (let r = 0; r <= maxRow; r++) {
        for (let c = 0; c <= maxCol; c++) {
          if (canPlace(currentBoard, piece, r, c)) {
            let nextBoard = placePiece(
              currentBoard,
              piece,
              r,
              c,
              piece.color ?? 0
            );
            const clears = findClears(nextBoard);
            if (clears.cells.length > 0) {
              nextBoard = applyClears(nextBoard, clears).board;
            }

            const nextRemaining = remainingPieces.filter((_, idx) => idx !== i);
            if (search(nextBoard, nextRemaining)) {
              return true;
            }
            if (nodes > maxNodes) {
              return false;
            }
          }
        }
      }
    }

    return false;
  }

  return search(board, pieces);
}

/**
 * Generates 3 tray pieces according to score difficulty, fairness guarantee,
 * and early-mercy preference below 1500 points.
 *
 * @param {Board} [board=createBoard()]
 * @param {number} [score=0]
 * @param {Rng} [rng=createRng(0)]
 * @returns {TrayPiece[]}
 */
export function generateTray(
  board = createBoard(),
  score = 0,
  rng = createRng(0)
) {
  const multipliers = getDifficultyMultipliers(score);

  // Early mercy: below 1500 points, prefer sets where all 3 pieces can be placed in some order
  if (score < EARLY_MERCY_SCORE_THRESHOLD) {
    let firstFittingTray = null;
    let lastTray = null;

    for (let attempt = 0; attempt < EARLY_MERCY_MAX_ATTEMPTS; attempt++) {
      const candidate = generateCandidateTray(rng, multipliers);
      lastTray = candidate;

      if (canPlaceAll(board, candidate)) {
        return candidate;
      }

      if (!firstFittingTray && anyFit(board, candidate)) {
        firstFittingTray = candidate;
      }
    }

    // Early mercy gave up after 20 tries. Fall back to fairness guarantee:
    if (firstFittingTray) {
      return firstFittingTray;
    }

    // No generated candidate fit even 1 piece. Force the smallest fitting piece into one slot.
    const smallest = findSmallestFittingPiece(board);
    if (smallest && lastTray) {
      lastTray[0] = { ...smallest, color: rng.int(COLOR_COUNT) };
    }
    return lastTray;
  }

  // Score >= 1500: Fairness guarantee: at least 1 piece must fit, resample up to 20 times
  let lastTray = null;
  for (let attempt = 0; attempt <= MAX_RESAMPLE_ATTEMPTS; attempt++) {
    const candidate = generateCandidateTray(rng, multipliers);
    lastTray = candidate;

    if (anyFit(board, candidate)) {
      return candidate;
    }
  }

  // Resampled 20 times and none fit. Force the smallest fitting piece into one slot.
  const smallest = findSmallestFittingPiece(board);
  if (smallest && lastTray) {
    lastTray[0] = { ...smallest, color: rng.int(COLOR_COUNT) };
  }
  return lastTray;
}

export default generateTray;
