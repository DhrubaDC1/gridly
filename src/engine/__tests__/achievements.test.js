import { ACHIEVEMENTS, evaluate } from '../achievements';

/**
 * Deep freezes an object to test immutability.
 *
 * @template T
 * @param {T} obj
 * @returns {T}
 */
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    if (
      obj[prop] !== null &&
      (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') &&
      !Object.isFrozen(obj[prop])
    ) {
      deepFreeze(obj[prop]);
    }
  });
  return obj;
}

describe('achievements engine module', () => {
  describe('ACHIEVEMENTS catalog', () => {
    it('exports exactly 25 achievements matching AGENTS.md §7', () => {
      expect(ACHIEVEMENTS).toBeDefined();
      expect(Array.isArray(ACHIEVEMENTS)).toBe(true);
      expect(ACHIEVEMENTS.length).toBe(25);
    });

    it('contains all 25 expected IDs with non-empty sentence-case names and descriptions', () => {
      const expectedIds = [
        'first_clear',
        'double',
        'quad',
        'combo_3',
        'combo_5',
        'combo_10',
        'perfect',
        'perfect_5',
        'mono',
        'mono_10',
        'classic_1k',
        '5k',
        '10k',
        '25k',
        'blitz_3k',
        'blitz_8k',
        'adv_10',
        'adv_25',
        'adv_50',
        'stars_100',
        'games_10',
        'games_100',
        'lines_1000',
        'holder',
        'streak_7',
      ];

      const ids = ACHIEVEMENTS.map((a) => a.id);
      expect(ids).toEqual(expectedIds);

      // Verify unique IDs
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(25);

      ACHIEVEMENTS.forEach((a) => {
        expect(typeof a.id).toBe('string');
        expect(a.id.length).toBeGreaterThan(0);
        expect(typeof a.name).toBe('string');
        expect(a.name.length).toBeGreaterThan(0);
        expect(typeof a.description).toBe('string');
        expect(a.description.length).toBeGreaterThan(0);

        // Friendly name in sentence case (first letter capitalized)
        expect(a.name[0]).toBe(a.name[0].toUpperCase());
        // Description in sentence case
        expect(a.description[0]).toBe(a.description[0].toUpperCase());
      });
    });

    it('names "perfect" as "Clean sweep"', () => {
      const perfectAch = ACHIEVEMENTS.find((a) => a.id === 'perfect');
      expect(perfectAch).toBeDefined();
      expect(perfectAch.name).toBe('Clean sweep');
    });
  });

  describe('evaluate() general behavior', () => {
    it('handles empty or missing parameters without throwing', () => {
      expect(evaluate()).toEqual([]);
      expect(evaluate([], null, null)).toEqual([]);
      expect(evaluate(undefined, undefined, undefined)).toEqual([]);
    });

    it('never mutates its input parameters (pure function)', () => {
      const events = deepFreeze([
        { type: 'cleared', rows: [0], cols: [], cells: [0, 1, 2, 3, 4, 5, 6, 7], mono: [], linesCount: 1 },
        { type: 'combo', count: 3, multiplier: 2.0 },
      ]);
      const stats = deepFreeze({
        gamesPlayed: { classic: 10, blitz: 0, adventure: 0 },
        totalLinesCleared: 1000,
        holdsUsed: 50,
        currentStreak: 7,
      });
      const context = deepFreeze({
        unlocked: { first_clear: '2026-10-01T12:00:00Z' },
        mode: 'classic',
        score: 5000,
        adventureLevel: null,
      });

      const result = evaluate(events, stats, context);
      expect(Array.isArray(result)).toBe(true);
      expect(result).not.toContain('first_clear'); // already unlocked
      expect(result).toContain('combo_3');
      expect(result).toContain('5k');
      expect(result).toContain('games_10');
      expect(result).toContain('lines_1000');
      expect(result).toContain('holder');
      expect(result).toContain('streak_7');
    });

    it('skips any IDs already present in context.unlocked', () => {
      const events = [
        { type: 'cleared', rows: [0, 1, 2, 3], cols: [], cells: [], mono: ['row-0'], linesCount: 4 },
        { type: 'combo', count: 10, multiplier: 5.5 },
        { type: 'perfectClear' },
      ];
      const stats = {
        perfectClears: 5,
        monoLines: 10,
        gamesPlayed: { classic: 100, blitz: 0, adventure: 0 },
        totalLinesCleared: 1000,
        holdsUsed: 50,
        currentStreak: 7,
        stars: 100,
      };
      const allUnlocked = {};
      ACHIEVEMENTS.forEach((a) => {
        allUnlocked[a.id] = '2026-10-01T00:00:00Z';
      });

      const result = evaluate(events, stats, {
        unlocked: allUnlocked,
        mode: 'classic',
        score: 30000,
        adventureLevel: 50,
      });

      expect(result).toEqual([]);
    });
  });

  describe('condition family: line clears (one clear, double, quad)', () => {
    it('unlocks "first_clear" when 1 line is cleared', () => {
      const events = [
        { type: 'cleared', rows: [2], cols: [], cells: [], mono: [], linesCount: 1 },
      ];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual(['first_clear']);
    });

    it('unlocks "first_clear" and "double" when 2 lines are cleared', () => {
      const events = [
        { type: 'cleared', rows: [0, 1], cols: [], cells: [], mono: [], linesCount: 2 },
      ];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual(['first_clear', 'double']);
    });

    it('unlocks "first_clear" and "double" when 3 lines are cleared (does not unlock quad)', () => {
      const events = [
        { type: 'cleared', rows: [0, 1, 2], cols: [], cells: [], mono: [], linesCount: 3 },
      ];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual(['first_clear', 'double']);
    });

    it('unlocks "first_clear", "double", and "quad" when 4 lines are cleared', () => {
      const events = [
        { type: 'cleared', rows: [0, 1], cols: [0, 1], cells: [], mono: [], linesCount: 4 },
      ];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual(['first_clear', 'double', 'quad']);
    });

    it('computes lines from rows + cols if linesCount is omitted', () => {
      const events = [
        { type: 'cleared', rows: [0], cols: [3], cells: [], mono: [] },
      ];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual(['first_clear', 'double']);
    });

    it('does not unlock clear achievements if no cleared event exists', () => {
      const events = [{ type: 'placed', pieceId: 'line-1x1' }];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual([]);
    });
  });

  describe('condition family: combo thresholds (combo_3, combo_5, combo_10)', () => {
    it('does not unlock any combo achievements below combo 3', () => {
      const events = [{ type: 'combo', count: 2, multiplier: 1.5 }];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual([]);
    });

    it('unlocks "combo_3" at combo 3', () => {
      const events = [{ type: 'combo', count: 3, multiplier: 2.0 }];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual(['combo_3']);
    });

    it('unlocks "combo_3" at combo 4 without unlocking higher thresholds', () => {
      const events = [{ type: 'combo', count: 4, multiplier: 2.5 }];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual(['combo_3']);
    });

    it('unlocks "combo_3" and "combo_5" at combo 5', () => {
      const events = [{ type: 'combo', count: 5, multiplier: 3.0 }];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual(['combo_3', 'combo_5']);
    });

    it('unlocks "combo_3", "combo_5", and "combo_10" at combo 10 or higher', () => {
      const events = [{ type: 'combo', count: 12, multiplier: 6.5 }];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual(['combo_3', 'combo_5', 'combo_10']);
    });

    it('takes the maximum combo if multiple combo events are present', () => {
      const events = [
        { type: 'combo', count: 2, multiplier: 1.5 },
        { type: 'combo', count: 5, multiplier: 3.0 },
      ];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual(['combo_3', 'combo_5']);
    });
  });

  describe('condition family: perfect and perfect_5', () => {
    it('unlocks "perfect" when a perfectClear event is emitted', () => {
      const events = [{ type: 'perfectClear' }];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual(['perfect']);
    });

    it('does not unlock "perfect_5" if stats.perfectClears < 5', () => {
      const result = evaluate([], { perfectClears: 4 }, { unlocked: {} });
      expect(result).toEqual([]);
    });

    it('unlocks "perfect_5" when stats.perfectClears >= 5', () => {
      const result = evaluate([], { perfectClears: 5 }, { unlocked: {} });
      expect(result).toEqual(['perfect_5']);
    });

    it('handles both "perfect" event and "perfect_5" stat together', () => {
      const events = [{ type: 'perfectClear' }];
      const stats = { perfectClears: 5 };
      const result = evaluate(events, stats, { unlocked: {} });
      expect(result).toEqual(['perfect', 'perfect_5']);
    });
  });

  describe('condition family: mono and mono_10', () => {
    it('unlocks "mono" when cleared event contains mono line IDs', () => {
      const events = [
        { type: 'cleared', rows: [1], cols: [], cells: [], mono: ['row-1'], linesCount: 1 },
      ];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toContain('mono');
      expect(result).toContain('first_clear');
    });

    it('does not unlock "mono" if cleared event has an empty mono array', () => {
      const events = [
        { type: 'cleared', rows: [1], cols: [], cells: [], mono: [], linesCount: 1 },
      ];
      const result = evaluate(events, {}, { unlocked: {} });
      expect(result).toEqual(['first_clear']);
    });

    it('does not unlock "mono_10" if stats.monoLines < 10', () => {
      const result = evaluate([], { monoLines: 9 }, { unlocked: {} });
      expect(result).toEqual([]);
    });

    it('unlocks "mono_10" when stats.monoLines >= 10', () => {
      const result = evaluate([], { monoLines: 10 }, { unlocked: {} });
      expect(result).toEqual(['mono_10']);
    });

    it('handles both "mono" event and "mono_10" stat together', () => {
      const events = [
        { type: 'cleared', rows: [0], cols: [], cells: [], mono: ['row-0'], linesCount: 1 },
      ];
      const stats = { monoLines: 15 };
      const result = evaluate(events, stats, { unlocked: { first_clear: '2026-10-01' } });
      expect(result).toEqual(['mono', 'mono_10']);
    });
  });

  describe('condition family: classic score thresholds (classic_1k, 5k, 10k, 25k)', () => {
    it('does not unlock any classic score achievements below 1000', () => {
      const result = evaluate([], {}, { mode: 'classic', score: 999, unlocked: {} });
      expect(result).toEqual([]);
    });

    it('unlocks "classic_1k" at score 1000 in classic mode', () => {
      const result = evaluate([], {}, { mode: 'classic', score: 1000, unlocked: {} });
      expect(result).toEqual(['classic_1k']);
    });

    it('unlocks "classic_1k" and "5k" at score 5000 in classic mode', () => {
      const result = evaluate([], {}, { mode: 'classic', score: 5000, unlocked: {} });
      expect(result).toEqual(['classic_1k', '5k']);
    });

    it('unlocks "classic_1k", "5k", and "10k" at score 10000 in classic mode', () => {
      const result = evaluate([], {}, { mode: 'classic', score: 10000, unlocked: {} });
      expect(result).toEqual(['classic_1k', '5k', '10k']);
    });

    it('unlocks all 4 classic score achievements at score 25000 or higher', () => {
      const result = evaluate([], {}, { mode: 'classic', score: 25000, unlocked: {} });
      expect(result).toEqual(['classic_1k', '5k', '10k', '25k']);
    });

    it('does not unlock classic score achievements if mode is blitz or adventure', () => {
      const blitzResult = evaluate([], {}, { mode: 'blitz', score: 25000, unlocked: {} });
      expect(blitzResult).not.toContain('classic_1k');
      expect(blitzResult).not.toContain('5k');
      expect(blitzResult).not.toContain('10k');
      expect(blitzResult).not.toContain('25k');

      const advResult = evaluate([], {}, { mode: 'adventure', score: 25000, unlocked: {} });
      expect(advResult).toEqual([]);
    });
  });

  describe('condition family: blitz score thresholds (blitz_3k, blitz_8k)', () => {
    it('does not unlock any blitz score achievements below 3000', () => {
      const result = evaluate([], {}, { mode: 'blitz', score: 2999, unlocked: {} });
      expect(result).toEqual([]);
    });

    it('unlocks "blitz_3k" at score 3000 in blitz mode', () => {
      const result = evaluate([], {}, { mode: 'blitz', score: 3000, unlocked: {} });
      expect(result).toEqual(['blitz_3k']);
    });

    it('unlocks "blitz_3k" at score 7999 in blitz mode without unlocking blitz_8k', () => {
      const result = evaluate([], {}, { mode: 'blitz', score: 7999, unlocked: {} });
      expect(result).toEqual(['blitz_3k']);
    });

    it('unlocks "blitz_3k" and "blitz_8k" at score 8000 or higher in blitz mode', () => {
      const result = evaluate([], {}, { mode: 'blitz', score: 8500, unlocked: {} });
      expect(result).toEqual(['blitz_3k', 'blitz_8k']);
    });

    it('does not unlock blitz score achievements if mode is classic or adventure', () => {
      const classicResult = evaluate([], {}, { mode: 'classic', score: 8500, unlocked: {} });
      expect(classicResult).not.toContain('blitz_3k');
      expect(classicResult).not.toContain('blitz_8k');
    });
  });

  describe('condition family: adventure levels (adv_10, adv_25, adv_50)', () => {
    it('does not unlock adventure achievements for levels below 10 or null', () => {
      expect(evaluate([], {}, { adventureLevel: null, unlocked: {} })).toEqual([]);
      expect(evaluate([], {}, { adventureLevel: 9, unlocked: {} })).toEqual([]);
    });

    it('unlocks "adv_10" when completing adventure level 10', () => {
      const result = evaluate([], {}, { adventureLevel: 10, unlocked: {} });
      expect(result).toEqual(['adv_10']);
    });

    it('unlocks "adv_10" and "adv_25" when completing adventure level 25', () => {
      const result = evaluate([], {}, { adventureLevel: 25, unlocked: {} });
      expect(result).toEqual(['adv_10', 'adv_25']);
    });

    it('unlocks "adv_10", "adv_25", and "adv_50" when completing adventure level 50', () => {
      const result = evaluate([], {}, { adventureLevel: 50, unlocked: {} });
      expect(result).toEqual(['adv_10', 'adv_25', 'adv_50']);
    });

    it('handles numeric string for adventureLevel', () => {
      const result = evaluate([], {}, { adventureLevel: '25', unlocked: { adv_10: 'date' } });
      expect(result).toEqual(['adv_25']);
    });
  });

  describe('condition family: total stars (stars_100)', () => {
    it('does not unlock "stars_100" below 100 stars', () => {
      expect(evaluate([], { stars: 99 }, { unlocked: {} })).toEqual([]);
      expect(evaluate([], { totalStars: 99 }, { unlocked: {} })).toEqual([]);
      expect(evaluate([], {}, { stars: 99, unlocked: {} })).toEqual([]);
    });

    it('unlocks "stars_100" when stats.stars is 100 or more', () => {
      const result = evaluate([], { stars: 100 }, { unlocked: {} });
      expect(result).toEqual(['stars_100']);
    });

    it('unlocks "stars_100" when stats.totalStars is 100 or more', () => {
      const result = evaluate([], { totalStars: 105 }, { unlocked: {} });
      expect(result).toEqual(['stars_100']);
    });

    it('unlocks "stars_100" when stars is an object of per-level stars summing to 100+', () => {
      const starsMap = {};
      for (let i = 1; i <= 34; i++) {
        starsMap[i] = 3; // 34 * 3 = 102 stars
      }
      const result = evaluate([], { stars: starsMap }, { unlocked: {} });
      expect(result).toEqual(['stars_100']);
    });

    it('unlocks "stars_100" from context.adventure.stars if not in stats', () => {
      const starsMap = {};
      for (let i = 1; i <= 35; i++) {
        starsMap[i] = 3;
      }
      const result = evaluate([], {}, { adventure: { stars: starsMap }, unlocked: {} });
      expect(result).toEqual(['stars_100']);
    });
  });

  describe('condition family: games played (games_10, games_100)', () => {
    it('does not unlock games achievements below 10 games', () => {
      const result = evaluate([], { gamesPlayed: { classic: 5, blitz: 4, adventure: 0 } }, { unlocked: {} });
      expect(result).toEqual([]);
    });

    it('unlocks "games_10" when total games played reaches 10 across all modes', () => {
      const result = evaluate([], { gamesPlayed: { classic: 6, blitz: 3, adventure: 1 } }, { unlocked: {} });
      expect(result).toEqual(['games_10']);
    });

    it('unlocks "games_10" at 99 games without unlocking games_100', () => {
      const result = evaluate([], { gamesPlayed: { classic: 50, blitz: 40, adventure: 9 } }, { unlocked: {} });
      expect(result).toEqual(['games_10']);
    });

    it('unlocks "games_10" and "games_100" at 100 games across all modes', () => {
      const result = evaluate([], { gamesPlayed: { classic: 50, blitz: 30, adventure: 20 } }, { unlocked: {} });
      expect(result).toEqual(['games_10', 'games_100']);
    });

    it('accepts gamesPlayed as a direct number', () => {
      expect(evaluate([], { gamesPlayed: 10 }, { unlocked: {} })).toEqual(['games_10']);
      expect(evaluate([], { gamesPlayed: 100 }, { unlocked: {} })).toEqual(['games_10', 'games_100']);
    });
  });

  describe('condition family: lines cleared (lines_1000)', () => {
    it('does not unlock "lines_1000" below 1000 total lines', () => {
      const result = evaluate([], { totalLinesCleared: 999 }, { unlocked: {} });
      expect(result).toEqual([]);
    });

    it('unlocks "lines_1000" when stats.totalLinesCleared reaches 1000', () => {
      const result = evaluate([], { totalLinesCleared: 1000 }, { unlocked: {} });
      expect(result).toEqual(['lines_1000']);
    });

    it('unlocks "lines_1000" when stats.totalLinesCleared exceeds 1000', () => {
      const result = evaluate([], { totalLinesCleared: 1450 }, { unlocked: {} });
      expect(result).toEqual(['lines_1000']);
    });
  });

  describe('condition family: holder (holder)', () => {
    it('does not unlock "holder" below 50 holds used', () => {
      const result = evaluate([], { holdsUsed: 49 }, { unlocked: {} });
      expect(result).toEqual([]);
    });

    it('unlocks "holder" when stats.holdsUsed reaches 50', () => {
      const result = evaluate([], { holdsUsed: 50 }, { unlocked: {} });
      expect(result).toEqual(['holder']);
    });

    it('unlocks "holder" when stats.holdsUsed exceeds 50', () => {
      const result = evaluate([], { holdsUsed: 75 }, { unlocked: {} });
      expect(result).toEqual(['holder']);
    });
  });

  describe('condition family: streak_7 (streak_7)', () => {
    it('does not unlock "streak_7" below 7 days streak', () => {
      const result = evaluate([], { currentStreak: 6, bestStreak: 6 }, { unlocked: {} });
      expect(result).toEqual([]);
    });

    it('unlocks "streak_7" when currentStreak is 7', () => {
      const result = evaluate([], { currentStreak: 7, bestStreak: 7 }, { unlocked: {} });
      expect(result).toEqual(['streak_7']);
    });

    it('unlocks "streak_7" when bestStreak is 7 even if currentStreak reset', () => {
      const result = evaluate([], { currentStreak: 1, bestStreak: 7 }, { unlocked: {} });
      expect(result).toEqual(['streak_7']);
    });

    it('unlocks "streak_7" when streak exceeds 7', () => {
      const result = evaluate([], { currentStreak: 14, bestStreak: 14 }, { unlocked: {} });
      expect(result).toEqual(['streak_7']);
    });
  });

  describe('already-unlocked ids are skipped', () => {
    it('does not re-return already unlocked IDs even if conditions are satisfied again', () => {
      const events = [
        { type: 'cleared', rows: [0], cols: [], cells: [], mono: ['row-0'], linesCount: 1 },
        { type: 'combo', count: 3, multiplier: 2.0 },
        { type: 'perfectClear' },
      ];
      const stats = {
        perfectClears: 5,
        monoLines: 10,
        holdsUsed: 50,
        totalLinesCleared: 1000,
        gamesPlayed: { classic: 10, blitz: 0, adventure: 0 },
        currentStreak: 7,
      };
      const unlocked = {
        first_clear: '2026-10-01T10:00:00Z',
        combo_3: '2026-10-01T10:01:00Z',
        perfect: '2026-10-01T10:02:00Z',
        perfect_5: '2026-10-01T10:03:00Z',
        mono: '2026-10-01T10:04:00Z',
        mono_10: '2026-10-01T10:05:00Z',
        classic_1k: '2026-10-01T10:06:00Z',
        games_10: '2026-10-01T10:07:00Z',
        lines_1000: '2026-10-01T10:08:00Z',
        holder: '2026-10-01T10:09:00Z',
        streak_7: '2026-10-01T10:10:00Z',
      };

      const result = evaluate(events, stats, {
        unlocked,
        mode: 'classic',
        score: 1500, // meets classic_1k, but classic_1k already unlocked
      });

      // All matching ones were already unlocked!
      expect(result).toEqual([]);
    });
  });
});
