const fs = require('node:path') ? require('node:fs') : null;
const path = require('node:path');

// Register custom ESM resolver for extensionless imports in Node
try {
  const { register } = require('node:module');
  const { pathToFileURL } = require('node:url');
  if (typeof register === 'function' && !process.env.JEST_WORKER_ID) {
    register(pathToFileURL(path.join(__dirname, 'loader.mjs')));
  }
} catch {}

const { createRng } = require('../src/engine/rng');
const { validateLevel } = require('../src/engine/modes/adventure');
const { findClears } = require('../src/engine/board');
const { playLevel } = require('./bot');

const DEFAULT_LEVELS_PATH = path.join(__dirname, '../assets/levels/levels.json');

/**
 * Returns the target win rate band for a given level ID (13 to 50).
 * Slopes from [0.85, 0.95] at level 13 down to [0.35, 0.55] at level 50.
 *
 * @param {number} id - Level id (13-50)
 * @returns {{ min: number, max: number, target: number }}
 */
function getTargetWinBand(id) {
  const t = Math.max(0, Math.min(1, (id - 13) / (50 - 13)));
  const min = 0.85 - 0.50 * t; // 0.85 -> 0.35
  const max = 0.95 - 0.40 * t; // 0.95 -> 0.55
  const target = (min + max) / 2;
  return { min, max, target };
}

/**
 * Generates an 8x8 board string array for a level with target density, gems, and locks.
 *
 * @param {number} id - Level ID
 * @param {number} seed - Level seed
 * @param {number} density - Fraction of board filled (0.08 to 0.35)
 * @param {number} gemCount - Number of gems (0 to 8)
 * @param {number} lockCount - Number of locks (0 to 10)
 * @returns {string[]} 8 rows of 8 characters
 */
function generateLevelBoard(id, seed, density, gemCount, lockCount) {
  const rng = createRng(seed);
  const targetFilled = Math.min(22, Math.max(5, Math.round(64 * density)));
  const board = Array.from({ length: 8 }, () => Array(8).fill('.'));

  // Symmetry archetype: quadrant (4-fold), rotational (180 deg), or horizontal/vertical mirror
  const archetype = id % 4;

  const candidateCoords = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      candidateCoords.push([r, c]);
    }
  }

  // Shuffle candidate coordinates
  for (let i = candidateCoords.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [candidateCoords[i], candidateCoords[j]] = [candidateCoords[j], candidateCoords[i]];
  }

  let filled = 0;

  for (const [r, c] of candidateCoords) {
    if (filled >= targetFilled) break;

    let syms;
    if (archetype === 0) {
      syms = [
        [r, c],
        [r, 7 - c],
        [7 - r, c],
        [7 - r, 7 - c],
      ];
    } else if (archetype === 1) {
      syms = [
        [r, c],
        [7 - r, 7 - c],
      ];
    } else if (archetype === 2) {
      syms = [
        [r, c],
        [7 - r, c],
      ];
    } else {
      syms = [
        [r, c],
        [r, 7 - c],
      ];
    }

    // Filter to unique coordinates
    const uniqueMap = new Map();
    for (const [sr, sc] of syms) {
      uniqueMap.set(`${sr},${sc}`, [sr, sc]);
    }
    const uniqueSyms = Array.from(uniqueMap.values());

    // Check row/column constraints: no row or column should exceed 6 filled cells
    let canPlaceAll = true;
    for (const [sr, sc] of uniqueSyms) {
      if (board[sr][sc] !== '.') continue;
      const rCount = board[sr].filter((ch) => ch !== '.').length + 1;
      const cCount = board.map((row) => row[sc]).filter((ch) => ch !== '.').length + 1;
      if (rCount > 6 || cCount > 6) {
        canPlaceAll = false;
        break;
      }
    }

    if (canPlaceAll && filled + uniqueSyms.length <= targetFilled + 2) {
      for (const [sr, sc] of uniqueSyms) {
        if (board[sr][sc] === '.') {
          board[sr][sc] = 'X';
          filled++;
        }
      }
    }
  }

  // Ensure minimum filled cells reached
  while (filled < targetFilled) {
    let added = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === '.') {
          const rCount = board[r].filter((ch) => ch !== '.').length;
          const cCount = board.map((row) => row[c]).filter((ch) => ch !== '.').length;
          if (rCount < 6 && cCount < 6) {
            board[r][c] = 'X';
            filled++;
            added = true;
            break;
          }
        }
      }
      if (added || filled >= targetFilled) break;
    }
    if (!added) break;
  }

  // Gather all 'X' positions to convert to G and L
  const xPositions = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === 'X') {
        xPositions.push([r, c]);
      }
    }
  }

  // Shuffle positions
  for (let i = xPositions.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [xPositions[i], xPositions[j]] = [xPositions[j], xPositions[i]];
  }

  // Place gems (G)
  let actualGemCount = 0;
  while (actualGemCount < gemCount && xPositions.length > 0) {
    const [r, c] = xPositions.pop();
    board[r][c] = 'G';
    actualGemCount++;
  }

  // Place locks (L)
  let actualLockCount = 0;
  while (actualLockCount < lockCount && xPositions.length > 0) {
    const [r, c] = xPositions.pop();
    board[r][c] = 'L';
    actualLockCount++;
  }

  return board.map((row) => row.join(''));
}

/**
 * Creates an initial candidate level configuration before auto-calibration.
 *
 * @param {number} id - Level ID (13..50)
 * @returns {Object}
 */
function createInitialLevel(id) {
  const seed = 1000 + id;
  const t = Math.max(0, Math.min(1, (id - 13) / (50 - 13)));

  // Prefilled block density rises from ~8% to 35%
  const density = 0.08 + 0.27 * t;

  // Gem count from 0 to 8
  let gemCount = Math.round(8 * t);

  // Lock count from 0 to 10 (locks introduced around level 16, scaling to 10 at 50)
  let lockCount = 0;
  if (id >= 16 && id <= 20) {
    lockCount = Math.round(1 + 2 * ((id - 16) / 4)); // 1 to 3
  } else if (id > 20) {
    lockCount = Math.round(3 + 7 * ((id - 21) / 29)); // 3 to 10
  }

  // Goal types: mix gems, score, lines across a cycle of 6 archetypes
  // Ensuring consecutive levels never have the same goals
  const goalArchetypes = [
    'lines',
    'gems',
    'score',
    'gems_lines',
    'gems_score',
    'score_lines',
  ];
  const archetype = goalArchetypes[(id - 13) % goalArchetypes.length];

  if (archetype.includes('gems')) {
    gemCount = Math.max(2, Math.min(4, Math.round(2 + 2 * t)));
    lockCount = Math.min(lockCount, 5);
  }

  const board = generateLevelBoard(id, seed, density, gemCount, lockCount);

  // Construct goals
  const goals = [];
  if (archetype === 'lines') {
    goals.push({ type: 'lines', value: 3 + Math.round(t * 2) });
  } else if (archetype === 'gems') {
    goals.push({ type: 'gems' });
  } else if (archetype === 'score') {
    goals.push({ type: 'score', value: 1000 + Math.round(t * 1800) });
  } else if (archetype === 'gems_lines') {
    goals.push({ type: 'gems' });
    goals.push({ type: 'lines', value: 2 + Math.round(t * 2) });
  } else if (archetype === 'gems_score') {
    goals.push({ type: 'gems' });
    goals.push({ type: 'score', value: 600 + Math.round(t * 1200) });
  } else if (archetype === 'score_lines') {
    goals.push({ type: 'score', value: 700 + Math.round(t * 1200) });
    goals.push({ type: 'lines', value: 2 + Math.round(t * 2) });
  }

  const level = {
    id,
    seed,
    board,
    goals,
    stars: [500, 1000, 1500], // initial placeholder, will be calibrated
  };

  // Move limits appear from level 15 and tighten
  if (id >= 15) {
    const moveProgress = (id - 15) / (50 - 15);
    level.moves = Math.round(34 - 14 * moveProgress); // 34 down to 20
  }

  return level;
}

/**
 * Auto-calibrates a level using the bot on a given number of seeds.
 * Adjusts move limits and score/lines goals until the win rate is in the target band.
 * Also calculates strictly ascending, reachable star thresholds.
 *
 * @param {Object} candidate - Candidate level
 * @param {Object} [options]
 * @param {number} [options.seedsPerEval=30]
 * @param {number} [options.maxIterations=6]
 * @param {boolean} [options.verbose=false]
 * @returns {Object} Calibrated level
 */
function calibrateLevel(candidate, options = {}) {
  const seedsCount = options.seedsPerEval ?? 30;
  const maxIterations = options.maxIterations ?? 6;
  const verbose = options.verbose ?? false;

  const { min: targetMin, max: targetMax, target: targetMid } = getTargetWinBand(candidate.id);

  let current = JSON.parse(JSON.stringify(candidate));
  let best = JSON.parse(JSON.stringify(current));
  let bestDist = Infinity;
  let bestWinRate = 0;
  let bestRuns = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    const runs = [];
    let wins = 0;
    for (let s = 0; s < seedsCount; s++) {
      const runSeed = current.seed * 100 + s;
      const res = playLevel(current, runSeed);
      runs.push(res);
      if (res.won) wins++;
    }

    const winRate = wins / seedsCount;
    const dist = Math.abs(winRate - targetMid);

    if (dist < bestDist) {
      bestDist = dist;
      bestWinRate = winRate;
      best = JSON.parse(JSON.stringify(current));
      bestRuns = runs;
    }

    if (verbose) {
      console.log(
        `  Level ${candidate.id} [iter ${iter}]: winRate=${(winRate * 100).toFixed(1)}% ` +
          `(target ${(targetMin * 100).toFixed(1)}%-${(targetMax * 100).toFixed(1)}%) ` +
          `moves=${current.moves ?? 'none'}`
      );
    }

    // Landed in target band!
    if (winRate >= targetMin && winRate <= targetMax) {
      break;
    }

    // Adjust candidate parameters
    if (winRate < targetMin) {
      // Too hard: loosen
      const gap = targetMin - winRate;
      const moveDelta = gap >= 0.25 ? 3 : gap >= 0.12 ? 2 : 1;
      const scoreMult = gap >= 0.25 ? 0.78 : gap >= 0.12 ? 0.85 : 0.92;

      if (current.moves !== undefined) {
        current.moves = Math.min(60, current.moves + moveDelta);
      }
      for (const g of current.goals) {
        if (g.type === 'score') {
          g.value = Math.max(400, Math.round((g.value * scoreMult) / 50) * 50);
        } else if (g.type === 'lines') {
          g.value = Math.max(1, g.value - (gap >= 0.2 ? 2 : 1));
        }
      }
    } else {
      // Too easy: tighten
      const gap = winRate - targetMax;
      const moveDelta = gap >= 0.25 ? 2 : 1;
      const scoreMult = gap >= 0.25 ? 1.20 : gap >= 0.12 ? 1.15 : 1.08;

      if (current.moves !== undefined) {
        current.moves = Math.max(10, current.moves - moveDelta);
      } else if (candidate.id >= 15) {
        current.moves = 30;
      }
      for (const g of current.goals) {
        if (g.type === 'score') {
          g.value = Math.round((g.value * scoreMult) / 50) * 50;
        } else if (g.type === 'lines') {
          g.value += 1;
        }
      }
    }
  }

  // Ensure bestRuns has won runs for median score calculation
  if (bestRuns.length === 0 || !bestRuns.some((r) => r.won)) {
    for (let s = 0; s < seedsCount; s++) {
      const runSeed = best.seed * 100 + s;
      bestRuns.push(playLevel(best, runSeed));
    }
  }

  const wonScores = bestRuns
    .filter((r) => r.won)
    .map((r) => r.score)
    .sort((a, b) => a - b);

  let scoreGoalVal = 0;
  for (const g of best.goals) {
    if (g.type === 'score' && g.value) scoreGoalVal = g.value;
  }

  const medianScore =
    wonScores.length > 0
      ? wonScores[Math.floor(wonScores.length / 2)]
      : scoreGoalVal > 0
      ? scoreGoalVal * 1.2
      : 1200;

  // Star thresholds: ascending and reachable (bot's median score on won runs >= star2)
  const star2 = Math.min(medianScore, Math.max(250, Math.floor(medianScore / 50) * 50));
  let star1 = Math.floor((star2 * 0.65) / 50) * 50;
  if (scoreGoalVal > 0) {
    star1 = Math.min(star1, Math.floor(scoreGoalVal / 50) * 50);
  }
  if (star1 >= star2) star1 = Math.max(100, star2 - 50);
  if (star1 < 100) star1 = 100;
  if (star2 <= star1) star1 = Math.max(50, star2 - 50);

  const star3 = Math.max(star2 + 100, Math.ceil((medianScore * 1.35) / 50) * 50);

  best.stars = [star1, star2, star3];

  return best;
}

function formatLevelJson(level) {
  const parts = [];
  parts.push('  {');
  parts.push(`    "id": ${level.id},`);
  parts.push(`    "seed": ${level.seed},`);
  parts.push(
    `    "board": [\n${level.board.map((r) => `      ${JSON.stringify(r)}`).join(',\n')}\n    ],`
  );
  parts.push(`    "goals": ${JSON.stringify(level.goals).replace(/},/g, '}, ')},`);
  if (level.moves !== undefined) {
    parts.push(`    "moves": ${level.moves},`);
  }
  parts.push(`    "stars": ${JSON.stringify(level.stars).replace(/,/g, ', ')}`);
  parts.push('  }');
  return parts.join('\n');
}

/**
 * Generates all 50 levels: keeps levels 1-12 unchanged, generates and calibrates 13-50.
 *
 * @param {Object} [options]
 * @param {number} [options.seedsPerEval=30]
 * @param {number} [options.maxIterations=6]
 * @param {string} [options.inputPath]
 * @param {string} [options.outputPath]
 * @param {boolean} [options.verbose=false]
 * @returns {Object[]} Array of 50 validated level objects
 */
function generateLevels(options = {}) {
  const inputPath = options.inputPath ?? DEFAULT_LEVELS_PATH;
  const outputPath = options.outputPath ?? DEFAULT_LEVELS_PATH;
  const verbose = options.verbose ?? false;
  const seedsPerEval = options.seedsPerEval ?? 30;
  const maxIterations = options.maxIterations ?? 6;

  let existingLevels = [];
  if (fs && fs.existsSync(inputPath)) {
    const raw = fs.readFileSync(inputPath, 'utf8');
    existingLevels = JSON.parse(raw);
  }

  // Keep levels 1-12 untouched
  const preservedLevels = existingLevels.slice(0, 12);
  if (preservedLevels.length < 12) {
    throw new Error(`Expected at least 12 levels in ${inputPath}, found ${preservedLevels.length}`);
  }

  const generatedLevels = [];

  for (let id = 13; id <= 50; id++) {
    if (verbose) {
      console.log(`Generating & calibrating Level ${id}...`);
    }
    const initialCandidate = createInitialLevel(id);
    const calibrated = calibrateLevel(initialCandidate, {
      seedsPerEval,
      maxIterations,
      verbose,
    });

    const problems = validateLevel(calibrated);
    if (problems.length > 0) {
      throw new Error(`Validation failed for level ${id}: ${problems.join('; ')}`);
    }

    generatedLevels.push(calibrated);
  }

  const allLevels = [...preservedLevels, ...generatedLevels];

  // Verify all 50 levels
  for (let i = 0; i < allLevels.length; i++) {
    const lvl = allLevels[i];
    const problems = validateLevel(lvl);
    if (problems.length > 0) {
      throw new Error(`Level ${lvl.id} has validation errors: ${problems.join(', ')}`);
    }
  }

  if (outputPath && fs) {
    let preservedText = '';
    if (fs.existsSync(inputPath)) {
      const rawOriginal = fs.readFileSync(inputPath, 'utf8');
      const id13Match = rawOriginal.match(/,\s*\n\s*\{\s*\n\s*"id":\s*13\b/);
      if (id13Match) {
        preservedText = rawOriginal.slice(0, id13Match.index);
      } else {
        const lastBracket = rawOriginal.lastIndexOf(']');
        preservedText = rawOriginal.slice(0, lastBracket).trimEnd();
      }
    }

    const formattedGenerated = generatedLevels.map(formatLevelJson).join(',\n');
    let jsonStr;
    if (preservedText) {
      jsonStr = `${preservedText},\n${formattedGenerated}\n]\n`;
    } else {
      const formattedLevels = allLevels.map(formatLevelJson).join(',\n');
      jsonStr = `[\n${formattedLevels}\n]\n`;
    }
    fs.writeFileSync(outputPath, jsonStr, 'utf8');
    if (verbose) {
      console.log(`Successfully wrote ${allLevels.length} levels to ${outputPath}`);
    }
  }

  return allLevels;
}

module.exports = {
  generateLevels,
  createInitialLevel,
  calibrateLevel,
  generateLevelBoard,
  getTargetWinBand,
};

// Run CLI directly if invoked as main
if (require.main === module) {
  console.log('Generating levels 13-50 with auto-calibration (30 seeds/eval, up to 6 iterations)...');
  const startTime = Date.now();
  const levels = generateLevels({ verbose: true });
  console.log(`Generated and calibrated ${levels.length} levels in ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);
}
