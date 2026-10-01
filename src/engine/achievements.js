/**
 * Pure JavaScript achievements engine for Gridly.
 * No React, no Expo, no side-effects, no Date.now(), no Math.random().
 *
 * @typedef {Object} Achievement
 * @property {string} id - Unique identifier matching AGENTS.md §7
 * @property {string} name - Friendly, sentence-case display name
 * @property {string} description - Plain, friendly description
 *
 * @typedef {Object} EvaluateContext
 * @property {Record<string, string>} [unlocked] - Map of achievement ID to unlock timestamp
 * @property {string} [mode] - Current game mode ('classic' | 'blitz' | 'adventure')
 * @property {number} [score] - Current score in the active game
 * @property {number | null} [adventureLevel] - Level just completed or null
 * @property {number | Record<string, number>} [stars] - Adventure stars if provided in context
 */

/**
 * Catalog of all 25 achievements in Gridly.
 * Exactly matches AGENTS.md §7 table.
 *
 * @type {readonly Achievement[]}
 */
export const ACHIEVEMENTS = Object.freeze([
  {
    id: 'first_clear',
    name: 'First clear',
    description: 'Clear your first line.',
  },
  {
    id: 'double',
    name: 'Double clear',
    description: 'Clear two lines at once.',
  },
  {
    id: 'quad',
    name: 'Quad clear',
    description: 'Clear four lines at once.',
  },
  {
    id: 'combo_3',
    name: 'Triple combo',
    description: 'Reach a combo of 3.',
  },
  {
    id: 'combo_5',
    name: 'High five',
    description: 'Reach a combo of 5.',
  },
  {
    id: 'combo_10',
    name: 'Combo master',
    description: 'Reach a combo of 10.',
  },
  {
    id: 'perfect',
    name: 'Clean sweep',
    description: 'Clear the entire board.',
  },
  {
    id: 'perfect_5',
    name: 'Master sweeper',
    description: 'Clear the entire board 5 times.',
  },
  {
    id: 'mono',
    name: 'Monochrome',
    description: 'Clear a line of a single color.',
  },
  {
    id: 'mono_10',
    name: 'Color harmony',
    description: 'Clear 10 monochromatic lines.',
  },
  {
    id: 'classic_1k',
    name: 'Getting started',
    description: 'Score 1,000 points in classic mode.',
  },
  {
    id: '5k',
    name: 'Five thousand',
    description: 'Score 5,000 points in classic mode.',
  },
  {
    id: '10k',
    name: 'Ten thousand',
    description: 'Score 10,000 points in classic mode.',
  },
  {
    id: '25k',
    name: 'Quarter century',
    description: 'Score 25,000 points in classic mode.',
  },
  {
    id: 'blitz_3k',
    name: 'Quick thinker',
    description: 'Score 3,000 points in blitz mode.',
  },
  {
    id: 'blitz_8k',
    name: 'Lightning fast',
    description: 'Score 8,000 points in blitz mode.',
  },
  {
    id: 'adv_10',
    name: 'Adventure awaits',
    description: 'Complete level 10 in adventure mode.',
  },
  {
    id: 'adv_25',
    name: 'Halfway there',
    description: 'Complete level 25 in adventure mode.',
  },
  {
    id: 'adv_50',
    name: 'Adventure champion',
    description: 'Complete level 50 in adventure mode.',
  },
  {
    id: 'stars_100',
    name: 'Star collector',
    description: 'Earn 100 stars in adventure mode.',
  },
  {
    id: 'games_10',
    name: 'Regular player',
    description: 'Play 10 games across any mode.',
  },
  {
    id: 'games_100',
    name: 'Dedicated',
    description: 'Play 100 games across any mode.',
  },
  {
    id: 'lines_1000',
    name: 'Line clearer',
    description: 'Clear 1,000 lines in total.',
  },
  {
    id: 'holder',
    name: 'Careful planner',
    description: 'Use the hold slot 50 times.',
  },
  {
    id: 'streak_7',
    name: 'Weekly habit',
    description: 'Play for 7 days in a row.',
  },
]);

/**
 * Evaluates events, aggregate stats, and game context to find newly unlocked achievement IDs.
 * Pure function: never mutates arguments, returns an array of newly unlocked IDs.
 *
 * @param {Array<Object>} [events] - Recent game events (e.g. from placePiece)
 * @param {import('./stats').Stats | Object} [stats] - Player aggregate stats
 * @param {EvaluateContext} [context] - Evaluation context
 * @returns {string[]} Newly unlocked achievement IDs in canonical order
 */
export function evaluate(events, stats, context) {
  const eventList = Array.isArray(events) ? events : [];
  const s = stats || {};
  const ctx = context || {};
  const unlocked = ctx.unlocked || {};
  const mode = ctx.mode;
  const score = typeof ctx.score === 'number' && Number.isFinite(ctx.score) ? ctx.score : 0;
  const adventureLevel =
    typeof ctx.adventureLevel === 'number' && Number.isFinite(ctx.adventureLevel)
      ? ctx.adventureLevel
      : typeof ctx.adventureLevel === 'string' && !isNaN(parseInt(ctx.adventureLevel, 10))
      ? parseInt(ctx.adventureLevel, 10)
      : null;

  // --- 1. Event aggregations ---
  let hasClear = false;
  let maxLinesInSingleClear = 0;
  let hasMono = false;
  let maxCombo = 0;
  let hasPerfectClear = false;

  for (let i = 0; i < eventList.length; i++) {
    const ev = eventList[i];
    if (!ev || typeof ev !== 'object') continue;

    if (ev.type === 'cleared') {
      hasClear = true;
      const lines =
        typeof ev.linesCount === 'number'
          ? ev.linesCount
          : (Array.isArray(ev.rows) ? ev.rows.length : 0) +
            (Array.isArray(ev.cols) ? ev.cols.length : 0);
      if (lines > maxLinesInSingleClear) {
        maxLinesInSingleClear = lines;
      }
      if (Array.isArray(ev.mono) && ev.mono.length > 0) {
        hasMono = true;
      }
    } else if (ev.type === 'combo') {
      const count = typeof ev.count === 'number' ? ev.count : 0;
      if (count > maxCombo) {
        maxCombo = count;
      }
    } else if (ev.type === 'perfectClear') {
      hasPerfectClear = true;
    }
  }

  // --- 2. Stat aggregations ---
  let totalGames = 0;
  if (typeof s.gamesPlayed === 'number') {
    totalGames = s.gamesPlayed;
  } else if (s.gamesPlayed && typeof s.gamesPlayed === 'object') {
    totalGames = Object.values(s.gamesPlayed).reduce(
      (sum, val) => sum + (typeof val === 'number' ? val : 0),
      0
    );
  } else if (typeof s.games === 'number') {
    totalGames = s.games;
  } else if (typeof s.totalGames === 'number') {
    totalGames = s.totalGames;
  }

  const totalLines =
    typeof s.totalLinesCleared === 'number'
      ? s.totalLinesCleared
      : typeof s.linesCleared === 'number'
      ? s.linesCleared
      : typeof s.lines === 'number'
      ? s.lines
      : 0;

  const holdsUsed =
    typeof s.holdsUsed === 'number'
      ? s.holdsUsed
      : typeof s.holds === 'number'
      ? s.holds
      : 0;

  const perfectClears =
    typeof s.perfectClears === 'number'
      ? s.perfectClears
      : typeof s.perfect_clears === 'number'
      ? s.perfect_clears
      : 0;

  const monoLines =
    typeof s.monoLines === 'number'
      ? s.monoLines
      : typeof s.mono_lines === 'number'
      ? s.mono_lines
      : 0;

  const currentStreak = typeof s.currentStreak === 'number' ? s.currentStreak : 0;
  const bestStreak = typeof s.bestStreak === 'number' ? s.bestStreak : 0;
  const streakVal = typeof s.streak === 'number' ? s.streak : 0;
  const maxStreak = Math.max(currentStreak, bestStreak, streakVal);

  let totalStars = 0;
  if (typeof s.stars === 'number') {
    totalStars = s.stars;
  } else if (typeof s.totalStars === 'number') {
    totalStars = s.totalStars;
  } else if (s.stars && typeof s.stars === 'object') {
    totalStars = Object.values(s.stars).reduce(
      (sum, val) => sum + (typeof val === 'number' ? val : 0),
      0
    );
  } else if (typeof ctx.stars === 'number') {
    totalStars = ctx.stars;
  } else if (ctx.stars && typeof ctx.stars === 'object') {
    totalStars = Object.values(ctx.stars).reduce(
      (sum, val) => sum + (typeof val === 'number' ? val : 0),
      0
    );
  } else if (ctx.adventure?.stars && typeof ctx.adventure.stars === 'object') {
    totalStars = Object.values(ctx.adventure.stars).reduce(
      (sum, val) => sum + (typeof val === 'number' ? val : 0),
      0
    );
  }

  // --- 3. Evaluate each achievement ---
  const newlyUnlocked = [];

  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    const { id } = ACHIEVEMENTS[i];

    // Skip already unlocked
    if (unlocked[id]) {
      continue;
    }

    let achieved = false;

    switch (id) {
      // Event-based clears
      case 'first_clear':
        achieved = hasClear && maxLinesInSingleClear >= 1;
        break;
      case 'double':
        achieved = maxLinesInSingleClear >= 2;
        break;
      case 'quad':
        achieved = maxLinesInSingleClear >= 4;
        break;

      // Event-based combo
      case 'combo_3':
        achieved = maxCombo >= 3;
        break;
      case 'combo_5':
        achieved = maxCombo >= 5;
        break;
      case 'combo_10':
        achieved = maxCombo >= 10;
        break;

      // Event-based perfect clear & mono line
      case 'perfect':
        achieved = hasPerfectClear;
        break;
      case 'mono':
        achieved = hasMono;
        break;

      // Stat-based perfect clears & mono lines
      case 'perfect_5':
        achieved = perfectClears >= 5;
        break;
      case 'mono_10':
        achieved = monoLines >= 10;
        break;

      // Score-based (Classic)
      case 'classic_1k':
        achieved = mode === 'classic' && score >= 1000;
        break;
      case '5k':
        achieved = mode === 'classic' && score >= 5000;
        break;
      case '10k':
        achieved = mode === 'classic' && score >= 10000;
        break;
      case '25k':
        achieved = mode === 'classic' && score >= 25000;
        break;

      // Score-based (Blitz)
      case 'blitz_3k':
        achieved = mode === 'blitz' && score >= 3000;
        break;
      case 'blitz_8k':
        achieved = mode === 'blitz' && score >= 8000;
        break;

      // Adventure level completions
      case 'adv_10':
        achieved = adventureLevel !== null && adventureLevel >= 10;
        break;
      case 'adv_25':
        achieved = adventureLevel !== null && adventureLevel >= 25;
        break;
      case 'adv_50':
        achieved = adventureLevel !== null && adventureLevel >= 50;
        break;

      // Stat-based totals
      case 'stars_100':
        achieved = totalStars >= 100;
        break;
      case 'games_10':
        achieved = totalGames >= 10;
        break;
      case 'games_100':
        achieved = totalGames >= 100;
        break;
      case 'lines_1000':
        achieved = totalLines >= 1000;
        break;
      case 'holder':
        achieved = holdsUsed >= 50;
        break;
      case 'streak_7':
        achieved = maxStreak >= 7;
        break;

      default:
        break;
    }

    if (achieved) {
      newlyUnlocked.push(id);
    }
  }

  return newlyUnlocked;
}
