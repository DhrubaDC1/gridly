import fs from 'node:fs';
import path from 'node:path';
import { validateLevel } from '../modes/adventure';
import { playLevel } from '../../../scripts/bot';
import { generateLevels } from '../../../scripts/gen-levels';

const LEVELS_PATH = path.resolve(__dirname, '../../../assets/levels/levels.json');

const ORIGINAL_LEVELS_1_TO_12 = [
  {
    id: 1,
    seed: 1001,
    board: [
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      'XXXXXX..',
    ],
    goals: [{ type: 'lines', value: 1 }],
    stars: [150, 300, 500],
  },
  {
    id: 2,
    seed: 1002,
    board: [
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      'XXXXXX..',
      'XXXXXX..',
    ],
    goals: [{ type: 'lines', value: 2 }],
    stars: [300, 600, 1000],
  },
  {
    id: 3,
    seed: 1003,
    board: [
      '........',
      '........',
      'XX....XX',
      'XX....XX',
      '........',
      'XX....XX',
      'XX....XX',
      '........',
    ],
    goals: [{ type: 'score', value: 500 }],
    stars: [500, 800, 1200],
  },
  {
    id: 4,
    seed: 1004,
    board: [
      '........',
      'XXXX.XXX',
      '........',
      'XXXX.XXX',
      '........',
      'XXXX.XXX',
      '........',
      '........',
    ],
    goals: [{ type: 'lines', value: 3 }],
    stars: [500, 900, 1400],
  },
  {
    id: 5,
    seed: 1005,
    board: [
      '........',
      '........',
      '........',
      'XXX.GXXX',
      '........',
      'XXXG.XXX',
      '........',
      '........',
    ],
    goals: [{ type: 'gems' }],
    stars: [300, 600, 1000],
  },
  {
    id: 6,
    seed: 1006,
    board: [
      '........',
      '.G....G.',
      '.XXXXXX.',
      '........',
      '........',
      '.XXXXXX.',
      '.G....G.',
      '........',
    ],
    goals: [{ type: 'gems' }],
    stars: [500, 1000, 1500],
  },
  {
    id: 7,
    seed: 1007,
    board: [
      '........',
      '....G...',
      '..XXXX..',
      'G.XXXX.G',
      '..XXXX..',
      '........',
      '........',
      '........',
    ],
    goals: [{ type: 'gems' }, { type: 'score', value: 800 }],
    stars: [800, 1400, 2000],
  },
  {
    id: 8,
    seed: 1008,
    board: [
      '...G....',
      '...X....',
      '...X....',
      'GXX.XXG.',
      '...X....',
      '...X....',
      '...G....',
      '........',
    ],
    goals: [{ type: 'gems' }, { type: 'lines', value: 3 }],
    stars: [600, 1200, 1800],
  },
  {
    id: 9,
    seed: 1009,
    board: [
      '........',
      '........',
      '........',
      'XXXLLXXX',
      '........',
      '........',
      '........',
      '........',
    ],
    goals: [{ type: 'lines', value: 2 }],
    stars: [400, 800, 1400],
  },
  {
    id: 10,
    seed: 1010,
    board: [
      '........',
      '..L..L..',
      '..G..G..',
      'XXXX.XXX',
      '........',
      '........',
      '........',
      '........',
    ],
    goals: [{ type: 'gems' }],
    stars: [600, 1200, 1800],
  },
  {
    id: 11,
    seed: 1011,
    board: [
      '........',
      '.XX..XX.',
      '.XL..LX.',
      '........',
      '........',
      '.XL..LX.',
      '.XX..XX.',
      '........',
    ],
    goals: [{ type: 'score', value: 1000 }, { type: 'lines', value: 4 }],
    stars: [1000, 1800, 2500],
  },
  {
    id: 12,
    seed: 1012,
    board: [
      '........',
      '..G..G..',
      '........',
      'XXX.XX..',
      '........',
      '....L...',
      '........',
      '........',
    ],
    goals: [{ type: 'gems' }, { type: 'score', value: 1500 }],
    moves: 25,
    stars: [1500, 2500, 3500],
  },
];

describe('Adventure Levels and Scripts', () => {
  let levels;

  beforeAll(() => {
    const raw = fs.readFileSync(LEVELS_PATH, 'utf8');
    levels = JSON.parse(raw);
  });

  it('contains exactly 50 levels', () => {
    expect(levels).toBeInstanceOf(Array);
    expect(levels.length).toBe(50);
  });

  it('has consecutive IDs from 1 to 50', () => {
    const ids = levels.map((l) => l.id);
    const expectedIds = Array.from({ length: 50 }, (_, i) => i + 1);
    expect(ids).toEqual(expectedIds);
  });

  it('preserves levels 1-12 unchanged (ignoring stars, which are calibrated)', () => {
    const strip = ({ stars, ...rest }) => rest;
    expect(levels.slice(0, 12).map(strip)).toEqual(ORIGINAL_LEVELS_1_TO_12.map(strip));
  });

  it('validates every single level with validateLevel', () => {
    for (const lvl of levels) {
      const problems = validateLevel(lvl);
      expect(problems).toEqual([]);
    }
  });

  it('has strictly ascending and positive star thresholds for every level', () => {
    for (const lvl of levels) {
      expect(Array.isArray(lvl.stars)).toBe(true);
      expect(lvl.stars.length).toBe(3);
      const [s1, s2, s3] = lvl.stars;
      expect(s1).toBeGreaterThan(0);
      expect(s2).toBeGreaterThan(s1);
      expect(s3).toBeGreaterThan(s2);
    }
  });

  it('exports playLevel returning { won, stars, moves, score }', () => {
    expect(typeof playLevel).toBe('function');
    const result = playLevel(levels[0], 1001);
    expect(result).toHaveProperty('won');
    expect(typeof result.won).toBe('boolean');
    expect(result).toHaveProperty('stars');
    expect(typeof result.stars).toBe('number');
    expect(result).toHaveProperty('moves');
    expect(typeof result.moves).toBe('number');
    expect(result).toHaveProperty('score');
    expect(typeof result.score).toBe('number');
  });

  it('produces deterministic output when running gen-levels twice', () => {
    // Run generation with few seeds to keep test well under 30s
    const run1 = generateLevels({
      seedsPerEval: 2,
      maxIterations: 2,
      outputPath: null,
      verbose: false,
    });
    const run2 = generateLevels({
      seedsPerEval: 2,
      maxIterations: 2,
      outputPath: null,
      verbose: false,
    });

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  }, 15000);
});
