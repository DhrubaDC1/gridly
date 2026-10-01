/**
 * Pure JavaScript stats module for Gridly.
 * No React, no Expo, no side-effects, no Date.now(), no Math.random().
 *
 * @typedef {Object} ModeStats
 * @property {number} classic
 * @property {number} blitz
 * @property {number} adventure
 *
 * @typedef {Object} Stats
 * @property {ModeStats} gamesPlayed
 * @property {ModeStats} bestScore
 * @property {number} totalLinesCleared
 * @property {number} bestCombo
 * @property {number} perfectClears
 * @property {number} monoLines
 * @property {number} totalPiecesPlaced
 * @property {number} holdsUsed
 * @property {number} totalPlayTime - Total play time in milliseconds
 * @property {number} currentStreak
 * @property {number} bestStreak
 * @property {string | null} lastPlayedDay - 'YYYY-MM-DD'
 *
 * @typedef {Object} GameEngineStats
 * @property {number} [linesCleared]
 * @property {number} [bestCombo]
 * @property {number} [perfectClears]
 * @property {number} [monoLines]
 * @property {number} [holdsUsed]
 * @property {number} [piecesPlaced]
 * @property {number} [totalPiecesPlaced]
 *
 * @typedef {Object} GameResult
 * @property {string} [mode] - 'classic' | 'blitz' | 'adventure'
 * @property {number} [score] - Final game score
 * @property {GameEngineStats} [game] - Game-level stats object
 * @property {number} [durationMs] - Duration played in milliseconds
 * @property {string | null} [dayKey] - 'YYYY-MM-DD' calendar day string
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86400000;

/**
 * Calculates calendar day difference (toDay - fromDay) in UTC.
 * Deterministic and pure: no clock access, no timezone skew.
 *
 * @param {string} fromDay - 'YYYY-MM-DD'
 * @param {string} toDay - 'YYYY-MM-DD'
 * @returns {number} Difference in calendar days
 */
export function getDayDifference(fromDay, toDay) {
  const [fromY, fromM, fromD] = fromDay.split('-').map(Number);
  const [toY, toM, toD] = toDay.split('-').map(Number);
  const fromUtc = Date.UTC(fromY, fromM - 1, fromD);
  const toUtc = Date.UTC(toY, toM - 1, toD);
  return Math.round((toUtc - fromUtc) / MS_PER_DAY);
}

/**
 * Creates and returns a new zero-valued stats object.
 *
 * @returns {Stats}
 */
export function createStats() {
  return {
    gamesPlayed: {
      classic: 0,
      blitz: 0,
      adventure: 0,
    },
    bestScore: {
      classic: 0,
      blitz: 0,
      adventure: 0,
    },
    totalLinesCleared: 0,
    bestCombo: 0,
    perfectClears: 0,
    monoLines: 0,
    totalPiecesPlaced: 0,
    holdsUsed: 0,
    totalPlayTime: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDay: null,
  };
}

/**
 * Applies a completed game result to aggregate player stats.
 * Pure function: never mutates input arguments, returns a new stats object.
 *
 * @param {Stats | null | undefined} stats - Current aggregate stats
 * @param {GameResult | null | undefined} result - Game result to apply
 * @returns {Stats} New updated aggregate stats object
 */
export function applyGameResult(stats, result) {
  const current = stats || createStats();
  const res = result || {};
  const game = res.game || {};

  // 1. Games played per mode
  const nextGamesPlayed = {
    classic: current.gamesPlayed?.classic ?? 0,
    blitz: current.gamesPlayed?.blitz ?? 0,
    adventure: current.gamesPlayed?.adventure ?? 0,
    ...(current.gamesPlayed || {}),
  };
  if (res.mode && typeof res.mode === 'string') {
    nextGamesPlayed[res.mode] = (nextGamesPlayed[res.mode] ?? 0) + 1;
  }

  // 2. Best score per mode
  const nextBestScore = {
    classic: current.bestScore?.classic ?? 0,
    blitz: current.bestScore?.blitz ?? 0,
    adventure: current.bestScore?.adventure ?? 0,
    ...(current.bestScore || {}),
  };
  if (
    res.mode &&
    typeof res.mode === 'string' &&
    typeof res.score === 'number' &&
    Number.isFinite(res.score)
  ) {
    const prevBest = nextBestScore[res.mode] ?? 0;
    nextBestScore[res.mode] = Math.max(prevBest, res.score);
  }

  // 3. Line clears, best combo, perfect clears, mono lines
  const linesCleared = typeof game.linesCleared === 'number' ? game.linesCleared : 0;
  const totalLinesCleared = (current.totalLinesCleared ?? 0) + linesCleared;

  const gameCombo = typeof game.bestCombo === 'number' ? game.bestCombo : 0;
  const bestCombo = Math.max(current.bestCombo ?? 0, gameCombo);

  const perfectClears = typeof game.perfectClears === 'number' ? game.perfectClears : 0;
  const totalPerfectClears = (current.perfectClears ?? 0) + perfectClears;

  const monoLines = typeof game.monoLines === 'number' ? game.monoLines : 0;
  const totalMonoLines = (current.monoLines ?? 0) + monoLines;

  // 4. Pieces placed and holds used
  const piecesPlaced =
    typeof game.piecesPlaced === 'number'
      ? game.piecesPlaced
      : typeof game.totalPiecesPlaced === 'number'
      ? game.totalPiecesPlaced
      : 0;
  const totalPiecesPlaced = (current.totalPiecesPlaced ?? 0) + piecesPlaced;

  const holdsUsed = typeof game.holdsUsed === 'number' ? game.holdsUsed : 0;
  const totalHoldsUsed = (current.holdsUsed ?? 0) + holdsUsed;

  // 5. Total play time ms
  const durationMs =
    typeof res.durationMs === 'number' && Number.isFinite(res.durationMs) && res.durationMs > 0
      ? res.durationMs
      : 0;
  const totalPlayTime = (current.totalPlayTime ?? 0) + durationMs;

  // 6. Day streak
  let currentStreak = current.currentStreak ?? 0;
  let bestStreak = current.bestStreak ?? 0;
  let lastPlayedDay = current.lastPlayedDay ?? null;

  if (res.dayKey && typeof res.dayKey === 'string' && DATE_REGEX.test(res.dayKey)) {
    const dayKey = res.dayKey;
    if (!lastPlayedDay || !DATE_REGEX.test(lastPlayedDay)) {
      currentStreak = 1;
      lastPlayedDay = dayKey;
    } else {
      const diff = getDayDifference(lastPlayedDay, dayKey);
      if (diff === 0) {
        // Same day as lastPlayedDay leaves the streak unchanged
      } else if (diff === 1) {
        // Next calendar day increments it
        currentStreak += 1;
        lastPlayedDay = dayKey;
      } else {
        // Any other gap resets it to 1
        currentStreak = 1;
        lastPlayedDay = dayKey;
      }
    }
    bestStreak = Math.max(bestStreak, currentStreak);
  }

  return {
    gamesPlayed: nextGamesPlayed,
    bestScore: nextBestScore,
    totalLinesCleared,
    bestCombo,
    perfectClears: totalPerfectClears,
    monoLines: totalMonoLines,
    totalPiecesPlaced,
    holdsUsed: totalHoldsUsed,
    totalPlayTime,
    currentStreak,
    bestStreak,
    lastPlayedDay,
  };
}
