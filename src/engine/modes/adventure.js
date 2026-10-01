import {
  createGame,
  placePiece,
  holdPiece,
  serializeGame,
  restoreGame,
} from '../game';
import { createBoard } from '../board';
import { generateTray } from '../generator';
import { createRng } from '../rng';

/**
 * Configuration for Adventure mode.
 */
export const adventureConfig = Object.freeze({
  mode: 'adventure',
  hasTimer: false,
  hasMoveLimit: true,
});

/**
 * Helper to construct a cell from a board character.
 *
 * @param {string} ch
 * @param {import('../rng').Rng} rng
 * @returns {import('../board').Cell | null}
 */
function cellFromChar(ch, rng) {
  if (ch === 'X') {
    return { color: rng.int(6), kind: 'normal', hp: 1 };
  }
  if (ch === 'G') {
    return { color: rng.int(6), kind: 'gem', hp: 1 };
  }
  if (ch === 'L') {
    return { color: rng.int(6), kind: 'lock', hp: 2 };
  }
  return null;
}

/**
 * Builds the starting 64-cell board array for an adventure level.
 * - '.' produces null (empty)
 * - 'X' produces normal block (color from level seed, hp: 1)
 * - 'G' produces gem block (hp: 1)
 * - 'L' produces lock block (hp: 2)
 *
 * @param {Object} level
 * @param {number} [level.seed=0]
 * @param {string[] | string} [level.board]
 * @returns {import('../board').Board}
 */
export function parseLevel(level) {
  const seed = level?.seed ?? 0;
  const rng = createRng(seed);
  const board = createBoard();

  if (!level || !level.board) {
    return board;
  }

  const rawBoard = level.board;

  if (Array.isArray(rawBoard)) {
    if (rawBoard.length === 8) {
      for (let r = 0; r < 8; r++) {
        const rowStr = rawBoard[r];
        if (typeof rowStr === 'string') {
          for (let c = 0; c < 8; c++) {
            const ch = rowStr[c];
            const index = r * 8 + c;
            board[index] = cellFromChar(ch, rng);
          }
        }
      }
    } else if (rawBoard.length === 64) {
      for (let i = 0; i < 64; i++) {
        board[i] = cellFromChar(rawBoard[i], rng);
      }
    }
  } else if (typeof rawBoard === 'string') {
    const cleaned = rawBoard.replace(/\s+/g, '');
    for (let i = 0; i < Math.min(64, cleaned.length); i++) {
      board[i] = cellFromChar(cleaned[i], rng);
    }
  }

  return board;
}

/**
 * Initializes goal progress tracking objects.
 *
 * @param {Array<{ type: string, value?: number, target?: number, lines?: number, count?: number }>} [goalsConfig]
 * @param {import('../board').Board} board
 * @returns {Array<{ type: string, target: number, current: number, completed: boolean, value?: number }>}
 */
function initializeGoals(goalsConfig, board) {
  if (!Array.isArray(goalsConfig)) {
    return [];
  }
  const totalGemsOnBoard = board.filter((c) => c && c.kind === 'gem').length;

  return goalsConfig.map((g) => {
    let target = 0;
    if (g.type === 'gems') {
      target = g.value ?? g.target ?? g.count ?? totalGemsOnBoard;
    } else if (g.type === 'score') {
      target = g.value ?? g.target ?? 0;
    } else if (g.type === 'lines') {
      target = g.value ?? g.target ?? g.lines ?? g.count ?? 0;
    }

    return {
      type: g.type,
      target,
      current: 0,
      completed: target <= 0,
      ...(g.value !== undefined ? { value: g.value } : {}),
    };
  });
}

/**
 * Calculates awarded stars from the current score against thresholds.
 * Minimum 1 star on level completion.
 *
 * @param {number} score
 * @param {number[]} starsThresholds
 * @returns {number} 1, 2, or 3
 */
export function calculateStars(score, starsThresholds) {
  if (!Array.isArray(starsThresholds) || starsThresholds.length === 0) {
    return 1;
  }
  let stars = 1;
  for (let i = 0; i < starsThresholds.length; i++) {
    if (score >= starsThresholds[i]) {
      stars = Math.max(stars, i + 1);
    }
  }
  return Math.min(3, Math.max(1, stars));
}

/**
 * Validates a level configuration object and returns a list of problem descriptions.
 * Returns empty array if level is valid.
 *
 * @param {Object} level
 * @returns {string[]}
 */
export function validateLevel(level) {
  const problems = [];

  if (!level || typeof level !== 'object') {
    return ['level must be an object'];
  }

  // 1. ID
  if (typeof level.id !== 'number' || !Number.isInteger(level.id) || level.id <= 0) {
    problems.push('level id must be a positive integer');
  }

  // 2. Seed
  if (typeof level.seed !== 'number' || isNaN(level.seed)) {
    problems.push('level seed must be a valid number');
  }

  // 3. Board dimensions and characters
  let gemCount = 0;
  if (!Array.isArray(level.board) || level.board.length !== 8) {
    problems.push('board must be an array of 8 rows');
  } else {
    for (let r = 0; r < 8; r++) {
      const row = level.board[r];
      if (typeof row !== 'string' || row.length !== 8) {
        problems.push(`board row ${r} must be a string of 8 characters`);
      } else {
        for (let c = 0; c < 8; c++) {
          const ch = row[c];
          if (ch === 'G') {
            gemCount++;
          } else if (ch !== '.' && ch !== 'X' && ch !== 'L') {
            problems.push(`unknown character "${ch}" at row ${r}, col ${c}`);
          }
        }
      }
    }
  }

  // 4. Goals
  if (!Array.isArray(level.goals) || level.goals.length === 0) {
    problems.push('level must have at least one goal');
  } else {
    for (let i = 0; i < level.goals.length; i++) {
      const goal = level.goals[i];
      if (!goal || typeof goal !== 'object') {
        problems.push(`goal at index ${i} must be an object`);
        continue;
      }

      if (goal.type === 'gems') {
        if (gemCount === 0) {
          problems.push('goal of gems specified but no gems (G) found on board');
        }
        if (goal.value !== undefined && (typeof goal.value !== 'number' || goal.value <= 0)) {
          problems.push('gems goal value must be a positive number if provided');
        }
      } else if (goal.type === 'score') {
        if (typeof goal.value !== 'number' || goal.value <= 0) {
          problems.push('score goal must specify a positive numeric value');
        }
      } else if (goal.type === 'lines') {
        const val = goal.value ?? goal.lines ?? goal.target;
        if (typeof val !== 'number' || val <= 0) {
          problems.push('lines goal must specify a positive numeric value');
        }
      } else {
        problems.push(`unknown goal type "${goal.type}" at index ${i}`);
      }
    }
  }

  // 5. Moves (optional)
  if (level.moves !== undefined) {
    if (typeof level.moves !== 'number' || !Number.isInteger(level.moves) || level.moves <= 0) {
      problems.push('moves must be a positive integer if specified');
    }
  }

  // 6. Stars
  if (!Array.isArray(level.stars) || level.stars.length !== 3) {
    problems.push('stars must be an array of 3 threshold numbers');
  } else {
    const [s1, s2, s3] = level.stars;
    if (typeof s1 !== 'number' || typeof s2 !== 'number' || typeof s3 !== 'number') {
      problems.push('all star thresholds must be numbers');
    } else if (s1 <= 0) {
      problems.push('star thresholds must be positive numbers');
    } else if (s1 >= s2 || s2 >= s3) {
      problems.push('stars thresholds must be strictly ascending');
    }
  }

  return problems;
}

/**
 * Creates a new Adventure game state from a level configuration.
 *
 * @param {Object} level
 * @param {Object} [options]
 * @returns {import('../game').GameState & { levelId: number, level: number, goals: Object[], movesLeft: number | null, starsThresholds: number[], completed: boolean, stars: number }}
 */
export function createAdventureGame(level, options = {}) {
  const levelData =
    typeof level === 'object' && level !== null
      ? level
      : { id: level, seed: 0, board: [], goals: [] };

  const seed = options.seed ?? levelData.seed ?? 0;
  const board = options.initial?.board
    ? options.initial.board.map((c) => (c ? { ...c } : null))
    : parseLevel(levelData);

  const rng = createRng(seed);

  let trayPieces;
  if (options.initial?.tray) {
    trayPieces = options.initial.tray.map((p) =>
      p ? { id: p.id, color: p.color } : null
    );
  } else {
    const rawTray = generateTray(board, 0, rng);
    trayPieces = rawTray.map((p) => ({ id: p.id, color: p.color }));
  }

  const base = createGame({
    seed,
    mode: 'adventure',
    initial: {
      board,
      tray: trayPieces,
    },
  });

  if (!options.initial?.tray) {
    base.rngState = rng.getState();
  }

  const movesLeft =
    typeof levelData.moves === 'number' && Number.isInteger(levelData.moves)
      ? levelData.moves
      : null;

  const starsThresholds = Array.isArray(levelData.stars)
    ? [...levelData.stars]
    : [1000, 2000, 3000];

  const goals = initializeGoals(levelData.goals, board);

  return {
    ...base,
    mode: 'adventure',
    levelId: levelData.id,
    level: levelData.id,
    goals,
    movesLeft,
    starsThresholds,
    completed: false,
    stars: 0,
  };
}

/**
 * Places a piece in Adventure mode.
 * Delegates to placePiece, updates goal progress from events, decrements movesLeft,
 * and emits levelComplete { stars } when all goals are met,
 * or gameOver with reason 'outOfMoves' or 'noMoves' when it cannot be completed.
 *
 * @param {import('../game').GameState} state
 * @param {number | 'hold'} source - Tray index 0-2 or 'hold'
 * @param {number} row - Board row index (0-7)
 * @param {number} col - Board col index (0-7)
 * @returns {{ state: import('../game').GameState, events: Object[] }}
 */
export function placeAdventure(state, source, row, col) {
  if (
    !state ||
    state.over ||
    (typeof state.movesLeft === 'number' && state.movesLeft <= 0)
  ) {
    return { state, events: [] };
  }

  const result = placePiece(state, source, row, col);
  if (result.state === state || result.events.length === 0) {
    return result;
  }

  // 1. Decrement movesLeft
  const newMovesLeft =
    typeof state.movesLeft === 'number' ? state.movesLeft - 1 : null;

  // 2. Update goal progress from events
  const gemsCollectedInTurn = result.events.filter(
    (e) => e.type === 'gemCollected'
  ).length;

  const clearedEvent = result.events.find((e) => e.type === 'cleared');
  const linesClearedInTurn = clearedEvent ? (clearedEvent.linesCount ?? 0) : 0;

  const currentScore = result.state.score;

  const nextGoals = (state.goals || []).map((goal) => {
    let nextCurrent = goal.current || 0;
    if (goal.type === 'gems') {
      nextCurrent += gemsCollectedInTurn;
    } else if (goal.type === 'lines') {
      nextCurrent += linesClearedInTurn;
    } else if (goal.type === 'score') {
      nextCurrent = currentScore;
    }

    const isCompleted = nextCurrent >= goal.target;
    return {
      ...goal,
      current: nextCurrent,
      completed: isCompleted,
    };
  });

  const allGoalsMet =
    nextGoals.length > 0 && nextGoals.every((g) => g.completed);

  // 3. Check level completion
  if (allGoalsMet) {
    const starCount = calculateStars(currentScore, state.starsThresholds);

    // Remove any gameOver event that placePiece may have emitted
    const finalEvents = result.events.filter((e) => e.type !== 'gameOver');
    finalEvents.push({ type: 'levelComplete', stars: starCount });

    const nextState = {
      ...result.state,
      mode: 'adventure',
      levelId: state.levelId,
      level: state.level,
      goals: nextGoals,
      movesLeft: newMovesLeft,
      starsThresholds: state.starsThresholds,
      over: true,
      overReason: 'levelComplete',
      completed: true,
      stars: starCount,
    };

    return { state: nextState, events: finalEvents };
  }

  // 4. Goals not met: check move limit failure (outOfMoves)
  if (newMovesLeft !== null && newMovesLeft <= 0) {
    const finalEvents = result.events.filter((e) => e.type !== 'gameOver');
    finalEvents.push({ type: 'gameOver', reason: 'outOfMoves' });

    const nextState = {
      ...result.state,
      mode: 'adventure',
      levelId: state.levelId,
      level: state.level,
      goals: nextGoals,
      movesLeft: newMovesLeft,
      starsThresholds: state.starsThresholds,
      over: true,
      overReason: 'outOfMoves',
      completed: false,
      stars: 0,
    };

    return { state: nextState, events: finalEvents };
  }

  // 5. Goals not met: check board blocked failure (noMoves)
  if (result.state.over && result.state.overReason === 'noMoves') {
    const nextState = {
      ...result.state,
      mode: 'adventure',
      levelId: state.levelId,
      level: state.level,
      goals: nextGoals,
      movesLeft: newMovesLeft,
      starsThresholds: state.starsThresholds,
      over: true,
      overReason: 'noMoves',
      completed: false,
      stars: 0,
    };

    return { state: nextState, events: result.events };
  }

  // 6. Game continues
  const nextState = {
    ...result.state,
    mode: 'adventure',
    levelId: state.levelId,
    level: state.level,
    goals: nextGoals,
    movesLeft: newMovesLeft,
    starsThresholds: state.starsThresholds,
    over: false,
    overReason: null,
    completed: false,
    stars: 0,
  };

  return { state: nextState, events: result.events };
}

/**
 * Re-export holdPiece, serializeGame, and restoreGame for convenience.
 */
export { holdPiece, serializeGame, restoreGame };

/**
 * Serializes an Adventure game state.
 *
 * @param {import('../game').GameState} state
 * @returns {string}
 */
export function serializeAdventureGame(state) {
  return serializeGame(state);
}

/**
 * Restores an Adventure game state from JSON or object.
 *
 * @param {string | Object} json
 * @returns {import('../game').GameState}
 */
export function restoreAdventureGame(json) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  const base = restoreGame(parsed);
  return {
    ...base,
    mode: 'adventure',
    levelId: parsed.levelId ?? parsed.level ?? null,
    level: parsed.level ?? parsed.levelId ?? null,
    goals: parsed.goals ? parsed.goals.map((g) => ({ ...g })) : [],
    movesLeft: parsed.movesLeft !== undefined ? parsed.movesLeft : null,
    starsThresholds: Array.isArray(parsed.starsThresholds)
      ? [...parsed.starsThresholds]
      : [1000, 2000, 3000],
    completed: Boolean(parsed.completed),
    stars: parsed.stars ?? 0,
  };
}
