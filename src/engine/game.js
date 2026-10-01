import { getPiece } from './pieces';
import {
  BOARD_SIZE,
  createBoard,
  canPlace,
  placePiece as boardPlacePiece,
  findClears,
  applyClears,
  isEmpty,
  anyFit,
} from './board';
import { calculateScore, getComboMultiplier } from './scoring';
import { generateTray, TRAY_SIZE } from './generator';
import { createRng, createRngFromState } from './rng';

/**
 * Core game state and turn flow for Gridly.
 * Pure JS, deterministic, no React/Expo imports, no Date.now(), no Math.random().
 *
 * @typedef {Object} PieceRef
 * @property {string} id - Piece catalog identifier.
 * @property {number} color - Color index (0-5).
 *
 * @typedef {Object} GameStats
 * @property {number} linesCleared
 * @property {number} bestCombo
 * @property {number} perfectClears
 * @property {number} monoLines
 * @property {number} holdsUsed
 * @property {number} piecesPlaced
 *
 * @typedef {Object} GameState
 * @property {string} mode
 * @property {import('./board').Board} board
 * @property {(PieceRef | null)[]} tray
 * @property {PieceRef | null} hold
 * @property {boolean} holdUsed
 * @property {number} score
 * @property {number} combo
 * @property {number} missStreak
 * @property {number} placements
 * @property {number} rngState
 * @property {boolean} over
 * @property {string | null} overReason
 * @property {GameStats} stats
 *
 * @typedef {Object} GameEvent
 * @property {string} type
 * @property {any} [key]
 */

/**
 * Checks if game is over (no tray piece and no held piece fits anywhere on the board).
 *
 * @param {GameState} state
 * @returns {boolean}
 */
export function isGameOver(state) {
  if (!state) {
    return true;
  }
  if (state.over) {
    return true;
  }

  const piecesToCheck = [];
  if (Array.isArray(state.tray)) {
    for (let i = 0; i < state.tray.length; i++) {
      const item = state.tray[i];
      if (item && item.id) {
        const piece = getPiece(item.id);
        if (piece) {
          piecesToCheck.push(piece);
        }
      }
    }
  }

  if (state.hold && state.hold.id) {
    const piece = getPiece(state.hold.id);
    if (piece) {
      piecesToCheck.push(piece);
    }
  }

  if (piecesToCheck.length === 0) {
    return true;
  }

  return !anyFit(state.board, piecesToCheck);
}

/**
 * Creates a new game state with a generated tray.
 *
 * @param {Object} [options]
 * @param {number} [options.seed=0]
 * @param {string} [options.mode='classic']
 * @returns {GameState}
 */
export function createGame({ seed = 0, mode = 'classic' } = {}) {
  const rng = createRng(seed);
  const board = createBoard();
  const generatedTray = generateTray(board, 0, rng);
  const tray = generatedTray.map((p) => ({ id: p.id, color: p.color }));
  const rngState = rng.getState();

  const state = {
    mode,
    board,
    tray,
    hold: null,
    holdUsed: false,
    score: 0,
    combo: 0,
    missStreak: 0,
    placements: 0,
    rngState,
    over: false,
    overReason: null,
    stats: {
      linesCleared: 0,
      bestCombo: 0,
      perfectClears: 0,
      monoLines: 0,
      holdsUsed: 0,
      piecesPlaced: 0,
    },
  };

  if (isGameOver(state)) {
    state.over = true;
    state.overReason = 'noMoves';
  }

  return state;
}

/**
 * Holds a piece from the tray into the hold slot, swapping if occupied.
 * Allowed once per placement: sets holdUsed to true.
 *
 * @param {GameState} state
 * @param {number} trayIndex
 * @returns {{ state: GameState, events: Object[] }}
 */
export function holdPiece(state, trayIndex) {
  if (!state || state.over || state.holdUsed) {
    return { state, events: [] };
  }

  const idx = typeof trayIndex === 'string' ? parseInt(trayIndex, 10) : trayIndex;
  if (!Number.isInteger(idx) || idx < 0 || idx >= TRAY_SIZE) {
    return { state, events: [] };
  }

  const pieceToHold = state.tray[idx];
  if (!pieceToHold) {
    return { state, events: [] };
  }

  const swappedOut = state.hold ? { id: state.hold.id, color: state.hold.color } : null;
  const nextTray = [...state.tray];
  nextTray[idx] = swappedOut;
  const nextHold = { id: pieceToHold.id, color: pieceToHold.color };

  const nextState = {
    ...state,
    tray: nextTray,
    hold: nextHold,
    holdUsed: true,
    stats: {
      ...state.stats,
      holdsUsed: (state.stats?.holdsUsed ?? 0) + 1,
    },
  };

  const events = [
    {
      type: 'held',
      piece: { id: pieceToHold.id, color: pieceToHold.color },
      swappedOut,
    },
  ];

  if (isGameOver(nextState)) {
    nextState.over = true;
    nextState.overReason = 'noMoves';
    events.push({ type: 'gameOver', reason: 'noMoves' });
  }

  return { state: nextState, events };
}

/**
 * Detects monochromatic lines (all 8 cells of a cleared line have the same color before clearing).
 *
 * @param {import('./board').Board} placedBoard
 * @param {import('./board').Clears} clears
 * @returns {string[]} Array of line IDs, e.g. ['row-0', 'col-3']
 */
function findMonoLines(placedBoard, clears) {
  const mono = [];

  for (let i = 0; i < clears.rows.length; i++) {
    const r = clears.rows[i];
    const firstCell = placedBoard[r * BOARD_SIZE];
    let isMono = firstCell !== null;
    if (isMono) {
      for (let c = 1; c < BOARD_SIZE; c++) {
        const cell = placedBoard[r * BOARD_SIZE + c];
        if (!cell || cell.color !== firstCell.color) {
          isMono = false;
          break;
        }
      }
    }
    if (isMono) {
      mono.push(`row-${r}`);
    }
  }

  for (let i = 0; i < clears.cols.length; i++) {
    const c = clears.cols[i];
    const firstCell = placedBoard[c];
    let isMono = firstCell !== null;
    if (isMono) {
      for (let r = 1; r < BOARD_SIZE; r++) {
        const cell = placedBoard[r * BOARD_SIZE + c];
        if (!cell || cell.color !== firstCell.color) {
          isMono = false;
          break;
        }
      }
    }
    if (isMono) {
      mono.push(`col-${c}`);
    }
  }

  return mono;
}

/**
 * Places a piece from the tray (index 0-2) or from hold onto the board.
 * Returns { state, events }. Invalid placement returns the same state and empty events.
 *
 * @param {GameState} state
 * @param {number | 'hold'} source - Tray index 0-2 or 'hold'
 * @param {number} row - Board row index (0-7)
 * @param {number} col - Board col index (0-7)
 * @returns {{ state: GameState, events: Object[] }}
 */
export function placePiece(state, source, row, col) {
  if (!state || state.over) {
    return { state, events: [] };
  }

  let pieceToPlace = null;
  let trayIndex = -1;

  if (source === 'hold') {
    pieceToPlace = state.hold;
  } else {
    const parsed = typeof source === 'string' ? parseInt(source, 10) : source;
    if (Number.isInteger(parsed) && parsed >= 0 && parsed < TRAY_SIZE) {
      trayIndex = parsed;
      pieceToPlace = state.tray[trayIndex];
    }
  }

  if (!pieceToPlace) {
    return { state, events: [] };
  }

  const catalogPiece = getPiece(pieceToPlace.id);
  if (!catalogPiece || !canPlace(state.board, catalogPiece, row, col)) {
    return { state, events: [] };
  }

  // 1. Place cells on board
  const placedCellIndices = catalogPiece.cells.map(
    ([r, c]) => (row + r) * BOARD_SIZE + (col + c)
  );
  const placedBoard = boardPlacePiece(
    state.board,
    catalogPiece,
    row,
    col,
    pieceToPlace.color,
    'normal',
    1
  );

  const events = [
    {
      type: 'placed',
      pieceId: pieceToPlace.id,
      cells: placedCellIndices,
      color: pieceToPlace.color,
    },
  ];

  // 2. Find clears and detect mono lines
  const clears = findClears(placedBoard);
  const linesCount = clears.rows.length + clears.cols.length;
  const mono = findMonoLines(placedBoard, clears);

  if (linesCount > 0) {
    events.push({
      type: 'cleared',
      rows: clears.rows,
      cols: clears.cols,
      cells: clears.cells,
      mono,
      linesCount,
    });
  }

  // 3. Apply clears to board (emits gemCollected / lockCracked)
  const { board: clearedBoard, events: clearEvents } = applyClears(
    placedBoard,
    clears
  );
  for (let i = 0; i < clearEvents.length; i++) {
    events.push(clearEvents[i]);
  }

  // 4. Update combo and missStreak
  let newCombo = state.combo;
  let newMissStreak = state.missStreak;
  if (linesCount > 0) {
    newCombo = state.combo + 1;
    newMissStreak = 0;
    events.push({
      type: 'combo',
      count: newCombo,
      multiplier: getComboMultiplier(newCombo),
    });
  } else {
    newMissStreak = state.missStreak + 1;
    if (newMissStreak >= 3) {
      newCombo = 0;
    }
  }

  const bestCombo = Math.max(state.stats?.bestCombo ?? 0, newCombo);

  // 5. Detect perfect clear and compute score
  const isBoardEmpty = linesCount > 0 && isEmpty(clearedBoard);
  if (isBoardEmpty) {
    events.push({ type: 'perfectClear' });
  }

  const scoreResult = calculateScore({
    cellsPlaced: catalogPiece.cells.length,
    linesCleared: linesCount,
    monoLines: mono.length,
    combo: newCombo,
    perfectClear: isBoardEmpty,
  });

  const newTotalScore = state.score + scoreResult.delta;
  events.push({
    type: 'scored',
    delta: scoreResult.delta,
    total: newTotalScore,
    breakdown: scoreResult.breakdown,
  });

  // 6. Update tray and hold
  const newTray = [...state.tray];
  let newHold = state.hold ? { ...state.hold } : null;
  if (source === 'hold') {
    newHold = null;
  } else {
    newTray[trayIndex] = null;
  }

  // 7. Refill tray when tray itself is empty (held piece does not count)
  let nextRngState = state.rngState;
  const isTrayEmpty = newTray.every((p) => p === null);
  if (isTrayEmpty) {
    const rng = createRngFromState(nextRngState);
    const generatedPieces = generateTray(clearedBoard, newTotalScore, rng);
    for (let i = 0; i < TRAY_SIZE; i++) {
      newTray[i] = {
        id: generatedPieces[i].id,
        color: generatedPieces[i].color,
      };
    }
    nextRngState = rng.getState();
    events.push({
      type: 'trayRefilled',
      pieces: newTray.map((p) => ({ id: p.id, color: p.color })),
    });
  }

  // 8. Build next state and check game over
  const nextState = {
    mode: state.mode,
    board: clearedBoard,
    tray: newTray,
    hold: newHold,
    holdUsed: false,
    score: newTotalScore,
    combo: newCombo,
    missStreak: newMissStreak,
    placements: state.placements + 1,
    rngState: nextRngState,
    over: false,
    overReason: null,
    stats: {
      linesCleared: (state.stats?.linesCleared ?? 0) + linesCount,
      bestCombo,
      perfectClears: (state.stats?.perfectClears ?? 0) + (isBoardEmpty ? 1 : 0),
      monoLines: (state.stats?.monoLines ?? 0) + mono.length,
      holdsUsed: state.stats?.holdsUsed ?? 0,
      piecesPlaced: (state.stats?.piecesPlaced ?? 0) + 1,
    },
  };

  if (isGameOver(nextState)) {
    nextState.over = true;
    nextState.overReason = 'noMoves';
    events.push({ type: 'gameOver', reason: 'noMoves' });
  }

  return { state: nextState, events };
}

/**
 * Serializes game state to a JSON string.
 *
 * @param {GameState} state
 * @returns {string}
 */
export function serializeGame(state) {
  return JSON.stringify(state);
}

/**
 * Restores a game state from JSON string or plain object.
 *
 * @param {string | Object} json
 * @returns {GameState}
 */
export function restoreGame(json) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  return {
    mode: parsed.mode,
    board: parsed.board.map((cell) => (cell ? { ...cell } : null)),
    tray: parsed.tray.map((p) => (p ? { id: p.id, color: p.color } : null)),
    hold: parsed.hold ? { id: parsed.hold.id, color: parsed.hold.color } : null,
    holdUsed: Boolean(parsed.holdUsed),
    score: parsed.score,
    combo: parsed.combo,
    missStreak: parsed.missStreak,
    placements: parsed.placements,
    rngState: parsed.rngState,
    over: Boolean(parsed.over),
    overReason: parsed.overReason ?? null,
    stats: {
      linesCleared: parsed.stats?.linesCleared ?? 0,
      bestCombo: parsed.stats?.bestCombo ?? 0,
      perfectClears: parsed.stats?.perfectClears ?? 0,
      monoLines: parsed.stats?.monoLines ?? 0,
      holdsUsed: parsed.stats?.holdsUsed ?? 0,
      piecesPlaced: parsed.stats?.piecesPlaced ?? 0,
    },
  };
}
