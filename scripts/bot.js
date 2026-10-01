const path = require('node:path');

// Register custom ESM resolver for extensionless imports in Node
try {
  const { register } = require('node:module');
  const { pathToFileURL } = require('node:url');
  if (typeof register === 'function' && !process.env.JEST_WORKER_ID) {
    register(pathToFileURL(path.join(__dirname, 'loader.mjs')));
  }
} catch {}

const {
  createAdventureGame,
  placeAdventure,
  calculateStars,
} = require('../src/engine/modes/adventure');
const { getPiece, pieceSize } = require('../src/engine/pieces');
const {
  canPlace,
  placePiece: boardPlacePiece,
  findClears,
  applyClears,
  anyFit,
} = require('../src/engine/board');

const COMMON_TEST_PIECE_IDS = [
  'line-1x2',
  'line-2x1',
  'line-1x3',
  'line-3x1',
  'square-2x2',
];

/**
 * Counts legal positions for a piece on a board.
 *
 * @param {Array} board
 * @param {Object} piece
 * @param {number} maxCount
 * @returns {number}
 */
function countPlacements(board, piece, maxCount = 10) {
  const { rows, cols } = pieceSize(piece);
  let count = 0;
  for (let r = 0; r <= 8 - rows; r++) {
    for (let c = 0; c <= 8 - cols; c++) {
      if (canPlace(board, piece, r, c)) {
        count++;
        if (count >= maxCount) return count;
      }
    }
  }
  return count;
}

/**
 * Evaluates a candidate placement according to:
 * - lines cleared (highest weight)
 * - gems collected and lock cracks
 * - progress toward the level goals
 * - penalties for holes (empty cells enclosed by filled cells or walls)
 * - board roughness
 * - big penalty for leaving no legal move next turn
 *
 * @param {Object} state - Current Adventure GameState
 * @param {number} slot - Tray index (0, 1, 2)
 * @param {Object} piece - Catalog piece
 * @param {number} color - Color index
 * @param {number} row - Row index
 * @param {number} col - Col index
 * @returns {number} Score for candidate move
 */
function evaluateMove(state, slot, piece, color, row, col) {
  const currentBoard = state.board;
  const placedBoard = boardPlacePiece(
    currentBoard,
    piece,
    row,
    col,
    color,
    'normal',
    1
  );
  const clears = findClears(placedBoard);
  const linesCleared = clears.rows.length + clears.cols.length;
  const { board: clearedBoard, events: clearEvents } = applyClears(
    placedBoard,
    clears
  );

  let score = 0;

  // 1. Lines cleared (highest weight)
  if (linesCleared === 1) score += 1800;
  else if (linesCleared === 2) score += 4200;
  else if (linesCleared === 3) score += 8000;
  else if (linesCleared >= 4) score += 14000;

  // 2. Gems collected and lock cracks
  let gemsCollected = 0;
  let lockCracks = 0;
  for (let i = 0; i < clearEvents.length; i++) {
    const ev = clearEvents[i];
    if (ev.type === 'gemCollected') gemsCollected++;
    else if (ev.type === 'lockCracked') lockCracks++;
  }
  score += gemsCollected * 1000;
  score += lockCracks * 500;

  // 3. Progress toward level goals
  if (state.goals && state.goals.length > 0) {
    let allGoalsMet = true;
    for (let i = 0; i < state.goals.length; i++) {
      const g = state.goals[i];
      const cur = g.current || 0;
      let nextCur = cur;
      if (g.type === 'gems') {
        nextCur += gemsCollected;
        score += gemsCollected * 1500;
      } else if (g.type === 'lines') {
        nextCur += linesCleared;
        score += linesCleared * 1000;
      } else if (g.type === 'score') {
        const delta = linesCleared * 150 + piece.cells.length * 10;
        nextCur = state.score + delta;
        score += delta * 4;
      }

      if (nextCur >= g.target) {
        score += 3000; // Goal completed bonus
      } else {
        allGoalsMet = false;
      }
    }
    if (allGoalsMet) {
      score += 70000; // Winning move
    }
  }

  // Bonus for placing in rows/columns that contain gems/locks (helping toward goals)
  if (state.goals) {
    const hasGemsGoal = state.goals.some((g) => g.type === 'gems' && !g.completed);
    for (let i = 0; i < piece.cells.length; i++) {
      const [pr, pc] = piece.cells[i];
      const tr = row + pr;
      const tc = col + pc;
      for (let c = 0; c < 8; c++) {
        const cell = currentBoard[tr * 8 + c];
        if (cell && cell.kind === 'gem') {
          score += hasGemsGoal ? 200 : 50;
        } else if (cell && cell.kind === 'lock') {
          score += 50;
        }
      }
      for (let r = 0; r < 8; r++) {
        const cell = currentBoard[r * 8 + tc];
        if (cell && cell.kind === 'gem') {
          score += hasGemsGoal ? 200 : 50;
        } else if (cell && cell.kind === 'lock') {
          score += 50;
        }
      }
    }
  }

  // Bonus for nearly full lines (encourages setting up line clears)
  for (let r = 0; r < 8; r++) {
    let count = 0;
    const ro = r * 8;
    for (let c = 0; c < 8; c++) {
      if (clearedBoard[ro + c] !== null) count++;
    }
    if (count === 7) score += 120;
    else if (count === 6) score += 50;
  }
  for (let c = 0; c < 8; c++) {
    let count = 0;
    for (let r = 0; r < 8; r++) {
      if (clearedBoard[r * 8 + c] !== null) count++;
    }
    if (count === 7) score += 120;
    else if (count === 6) score += 50;
  }

  // 4. Penalties for holes (empty cells enclosed by filled cells or walls)
  let holesPenalty = 0;
  for (let r = 0; r < 8; r++) {
    const rowOffset = r * 8;
    for (let c = 0; c < 8; c++) {
      if (clearedBoard[rowOffset + c] === null) {
        let wallsOrFilled = 0;
        if (r === 0 || clearedBoard[rowOffset - 8 + c] !== null) wallsOrFilled++;
        if (r === 7 || clearedBoard[rowOffset + 8 + c] !== null) wallsOrFilled++;
        if (c === 0 || clearedBoard[rowOffset + c - 1] !== null) wallsOrFilled++;
        if (c === 7 || clearedBoard[rowOffset + c + 1] !== null) wallsOrFilled++;

        if (wallsOrFilled === 4) {
          holesPenalty += 80; // 1x1 completely enclosed
        } else if (wallsOrFilled === 3) {
          holesPenalty += 25; // 3-wall pocket
        }
      }
    }
  }
  score -= holesPenalty;

  // 5. Board roughness and transitions
  let colHeights = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let c = 0; c < 8; c++) {
    for (let r = 0; r < 8; r++) {
      if (clearedBoard[r * 8 + c] !== null) {
        colHeights[c] = 8 - r;
        break;
      }
    }
  }
  let roughness = 0;
  for (let c = 0; c < 7; c++) {
    roughness += Math.abs(colHeights[c] - colHeights[c + 1]);
  }

  let transitions = 0;
  for (let r = 0; r < 8; r++) {
    const ro = r * 8;
    for (let c = 0; c < 7; c++) {
      if ((clearedBoard[ro + c] !== null) !== (clearedBoard[ro + c + 1] !== null)) {
        transitions++;
      }
    }
  }
  for (let c = 0; c < 8; c++) {
    for (let r = 0; r < 7; r++) {
      if ((clearedBoard[r * 8 + c] !== null) !== (clearedBoard[(r + 1) * 8 + c] !== null)) {
        transitions++;
      }
    }
  }
  score -= roughness * 8 + transitions * 5;

  // Penalty for filled cells to avoid overcrowding
  let filledCount = 0;
  for (let i = 0; i < 64; i++) {
    if (clearedBoard[i] !== null) filledCount++;
  }
  score -= filledCount * 10;

  // 6. Big penalty for leaving no legal move next turn
  const remainingTrayPieces = [];
  for (let i = 0; i < 3; i++) {
    if (i !== slot && state.tray[i]) {
      const p = getPiece(state.tray[i].id);
      if (p) remainingTrayPieces.push(p);
    }
  }

  if (remainingTrayPieces.length > 0) {
    let fittingRemaining = 0;
    for (let i = 0; i < remainingTrayPieces.length; i++) {
      const remPiece = remainingTrayPieces[i];
      const spots = countPlacements(clearedBoard, remPiece, 6);
      if (spots === 0) {
        score -= 9000; // Remaining piece cannot fit anywhere!
      } else {
        fittingRemaining++;
        score += spots * 40; // Mobility bonus
      }
    }
    if (fittingRemaining === 0) {
      score -= 50000; // Immediate game over!
    }
  } else {
    // Tray will refill; check if common pieces can fit
    let commonFit = 0;
    for (let i = 0; i < COMMON_TEST_PIECE_IDS.length; i++) {
      const p = getPiece(COMMON_TEST_PIECE_IDS[i]);
      if (p) {
        const spots = countPlacements(clearedBoard, p, 5);
        commonFit += spots;
      }
    }
    if (commonFit === 0) {
      score -= 40000;
    } else {
      score += Math.min(commonFit, 10) * 30;
    }
  }

  return score;
}

/**
 * Plays an adventure level to completion or failure using a greedy bot.
 *
 * @param {Object} level - Level configuration object
 * @param {number} [seed] - RNG seed override
 * @returns {{ won: boolean, stars: number, moves: number, score: number }}
 */
function playLevel(level, seed) {
  const effectiveSeed = seed !== undefined ? seed : (level.seed ?? 0);
  let state = createAdventureGame(level, { seed: effectiveSeed });
  let moves = 0;
  const maxMoves = typeof level.moves === 'number' ? level.moves : 500;

  while (!state.over && moves < maxMoves) {
    let bestMove = null;
    let bestScore = -Infinity;

    for (let slot = 0; slot < 3; slot++) {
      const item = state.tray[slot];
      if (!item) continue;
      const piece = getPiece(item.id);
      if (!piece) continue;

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (!canPlace(state.board, piece, r, c)) continue;

          const score = evaluateMove(state, slot, piece, item.color, r, c);
          if (score > bestScore) {
            bestScore = score;
            bestMove = { slot, r, c };
          }
        }
      }
    }

    if (!bestMove) {
      break;
    }

    const result = placeAdventure(state, bestMove.slot, bestMove.r, bestMove.c);
    state = result.state;
    moves++;
  }

  const won = Boolean(state.completed);
  const stars = won
    ? state.stars || calculateStars(state.score, state.starsThresholds)
    : 0;

  return {
    won,
    stars,
    moves,
    score: state.score,
  };
}

module.exports = {
  playLevel,
  evaluateMove,
};
