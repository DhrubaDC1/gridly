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

const { playLevel } = require('./bot');

const LEVELS_PATH = path.join(__dirname, '../assets/levels/levels.json');
const SEEDS = 100;
const MIN_WINS = 10;

/** Linear-interpolated percentile (p in 0-1) of an ascending-sorted array. */
function percentile(sorted, p) {
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const round50 = (n) => Math.round(n / 50) * 50;

/**
 * Turns won-run scores into [p10, median, p85] rounded to 50, strictly ascending.
 *
 * @param {number[]} scores
 * @returns {number[]}
 */
function starsFromScores(scores) {
  const sorted = [...scores].sort((a, b) => a - b);
  const s1 = Math.max(50, round50(percentile(sorted, 0.1)));
  const s2 = Math.max(s1 + 50, round50(percentile(sorted, 0.5)));
  const s3 = Math.max(s2 + 50, round50(percentile(sorted, 0.85)));
  return [s1, s2, s3];
}

/**
 * Runs the bot on SEEDS seeds per level (same seed scheme as verify-levels).
 *
 * @param {Object[]} levels
 * @returns {{ id: number, wins: number, stars: number[] | null }[]}
 */
function calibrate(levels) {
  return levels.map((level) => {
    const scores = [];
    for (let s = 0; s < SEEDS; s++) {
      const seed = (level.seed ?? 1000 + level.id) * 100 + s;
      const res = playLevel(level, seed);
      if (res.won) scores.push(res.score);
    }
    return {
      id: level.id,
      wins: scores.length,
      stars: scores.length < MIN_WINS ? null : starsFromScores(scores),
    };
  });
}

const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

module.exports = { calibrate, starsFromScores };

if (require.main === module) {
  const text = fs.readFileSync(LEVELS_PATH, 'utf8');
  const levels = JSON.parse(text);
  const results = calibrate(levels);

  // Rewrite only the "stars" lines so the file's formatting stays untouched.
  let i = 0;
  const out = text.replace(/"stars": \[[^\]]*\]/g, (m) => {
    const r = results[i++];
    return r.stars ? `"stars": [${r.stars.join(', ')}]` : m;
  });

  console.log('level  wins  before -> after');
  results.forEach((r, k) => {
    const before = levels[k].stars;
    if (!r.stars) {
      console.warn(`WARNING level ${r.id}: only ${r.wins}/${SEEDS} wins, stars unchanged (${before.join('/')})`);
      return;
    }
    console.log(`${String(r.id).padStart(5)}  ${String(r.wins).padStart(4)}  ${before.join('/')} -> ${r.stars.join('/')}`);
  });
  const after = results.map((r, k) => r.stars || levels[k].stars);
  console.log(`\nAverage stars per level: before ${avg(levels.map((l) => avg(l.stars))).toFixed(1)}, after ${avg(after.map(avg)).toFixed(1)}`);

  fs.writeFileSync(LEVELS_PATH, out);
}
