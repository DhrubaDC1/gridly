const fs = require('node:fs');
const path = require('node:path');

// Register custom ESM resolver for extensionless imports in Node
try {
  const { register } = require('node:module');
  const { pathToFileURL } = require('node:url');
  if (typeof register === 'function' && !process.env.JEST_WORKER_ID) {
    register(pathToFileURL(path.join(__dirname, 'loader.mjs')));
  }
} catch {}

const { validateLevel } = require('../src/engine/modes/adventure');
const { playLevel } = require('./bot');

const DEFAULT_LEVELS_PATH = path.join(__dirname, '../assets/levels/levels.json');
const DEFAULT_DOCS_PATH = path.join(__dirname, '../docs/LEVELS.md');

/**
 * Formats level goals into a compact string description.
 *
 * @param {Array} goals
 * @returns {string}
 */
function formatGoals(goals) {
  if (!Array.isArray(goals) || goals.length === 0) return 'None';
  return goals
    .map((g) => {
      if (g.type === 'gems') return 'Gems';
      if (g.type === 'lines') return `Lines (${g.value ?? g.lines ?? g.target ?? ''})`;
      if (g.type === 'score') return `Score (${g.value ?? ''})`;
      return g.type;
    })
    .join(' + ');
}

/**
 * Runs bot verification over levels in a file and returns summary statistics.
 *
 * @param {string} [levelsPath] - Path to levels.json
 * @param {Object} [options]
 * @param {number} [options.seedsCount=50]
 * @param {string} [options.docsPath]
 * @param {boolean} [options.saveDocs=true]
 * @param {boolean} [options.verbose=true]
 * @returns {{ allPassed: boolean, rows: Object[], summary: Object, markdown: string }}
 */
function verifyLevels(levelsPath = DEFAULT_LEVELS_PATH, options = {}) {
  const seedsCount = options.seedsCount ?? 50;
  const docsPath = options.docsPath ?? DEFAULT_DOCS_PATH;
  const saveDocs = options.saveDocs ?? true;
  const verbose = options.verbose ?? true;

  if (!fs.existsSync(levelsPath)) {
    throw new Error(`Levels file not found: ${levelsPath}`);
  }

  const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
  if (!Array.isArray(levels) || levels.length === 0) {
    throw new Error(`Levels file must contain a non-empty array: ${levelsPath}`);
  }

  const rows = [];
  let anyInvalid = false;
  let totalWinsAll = 0;
  let totalMovesAll = 0;
  let totalStarsAll = 0;
  let totalRunsCount = 0;

  if (verbose) {
    console.log(`Verifying ${levels.length} levels with ${seedsCount} seeds each...`);
  }

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const problems = validateLevel(level);
    const isValid = problems.length === 0;
    if (!isValid) {
      anyInvalid = true;
    }

    let wins = 0;
    let movesSum = 0;
    let starsSum = 0;

    for (let s = 0; s < seedsCount; s++) {
      const seed = (level.seed ?? 1000 + level.id) * 100 + s;
      const res = playLevel(level, seed);
      if (res.won) wins++;
      movesSum += res.moves;
      starsSum += res.stars;
    }

    totalWinsAll += wins;
    totalMovesAll += movesSum;
    totalStarsAll += starsSum;
    totalRunsCount += seedsCount;

    const winRateNum = (wins / seedsCount) * 100;
    const avgMovesNum = movesSum / seedsCount;
    const avgStarsNum = starsSum / seedsCount;

    rows.push({
      id: level.id,
      seed: level.seed,
      goals: formatGoals(level.goals),
      movesLimit: level.moves ?? 'None',
      starsThresholds: level.stars ? level.stars.join('/') : 'None',
      winRate: `${winRateNum.toFixed(1)}%`,
      winRateNum,
      avgMoves: avgMovesNum.toFixed(1),
      avgMovesNum,
      avgStars: avgStarsNum.toFixed(2),
      avgStarsNum,
      status: isValid ? 'Valid' : `Invalid: ${problems.join('; ')}`,
      isValid,
      problems,
    });

    if (verbose && (i + 1) % 10 === 0) {
      console.log(`  Completed ${i + 1}/${levels.length} levels...`);
    }
  }

  const overallWinRate = (totalWinsAll / totalRunsCount) * 100;
  const overallAvgMoves = totalMovesAll / totalRunsCount;
  const overallAvgStars = totalStarsAll / totalRunsCount;

  const summary = {
    totalLevels: levels.length,
    validLevels: rows.filter((r) => r.isValid).length,
    anyInvalid,
    overallWinRate: `${overallWinRate.toFixed(1)}%`,
    overallAvgMoves: overallAvgMoves.toFixed(1),
    overallAvgStars: overallAvgStars.toFixed(2),
  };

  // Build Markdown report
  let md = '# Adventure Levels Verification Report\n\n';
  md += `Verified **${levels.length} levels** using greedy bot across **${seedsCount} seeds per level**.\n\n`;
  md += '## Summary\n\n';
  md += `- **Total levels:** ${summary.totalLevels}\n`;
  md += `- **Valid levels:** ${summary.validLevels}/${summary.totalLevels} (${summary.anyInvalid ? '⚠️ ERRORS DETECTED' : '✅ All Valid'})\n`;
  md += `- **Overall bot win rate:** ${summary.overallWinRate}\n`;
  md += `- **Average moves per run:** ${summary.overallAvgMoves}\n`;
  md += `- **Average stars per run:** ${summary.overallAvgStars}\n\n`;

  md += '## Level Details\n\n';
  md += '| Level | Goals | Move Limit | Star Thresholds | Win Rate | Avg Moves | Avg Stars | Status |\n';
  md += '|:-----:|:------|:----------:|:---------------:|:--------:|:---------:|:---------:|:------:|\n';

  for (const r of rows) {
    md += `| ${r.id} | ${r.goals} | ${r.movesLimit} | ${r.starsThresholds} | ${r.winRate} | ${r.avgMoves} | ${r.avgStars} | ${r.status} |\n`;
  }
  md += '\n';

  if (saveDocs && docsPath) {
    const docsDir = path.dirname(docsPath);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    fs.writeFileSync(docsPath, md, 'utf8');
    if (verbose) {
      console.log(`Saved summary table to ${docsPath}`);
    }
  }

  return {
    allPassed: !anyInvalid,
    rows,
    summary,
    markdown: md,
  };
}

module.exports = {
  verifyLevels,
  formatGoals,
};

// Run CLI directly if invoked as main
if (require.main === module) {
  const targetFile = process.argv[2] || DEFAULT_LEVELS_PATH;
  try {
    const result = verifyLevels(targetFile, { verbose: true });
    console.log('\n' + result.markdown);
    if (!result.allPassed) {
      console.error('Validation problems found in levels!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Verification error:', err);
    process.exit(1);
  }
}
