import {
  buildGoalChipText,
  calculateNextStars,
  calculateNextUnlocked,
  calculateNextBest,
  calculateAdventureProgress,
  canOpenLevel,
} from '../adventureProgress';

describe('Adventure Progress Pure Helpers', () => {
  describe('buildGoalChipText', () => {
    test('returns empty string for null, undefined, or non-object', () => {
      expect(buildGoalChipText(null)).toBe('');
      expect(buildGoalChipText(undefined)).toBe('');
      expect(buildGoalChipText('invalid')).toBe('');
      expect(buildGoalChipText(123)).toBe('');
    });

    test('builds gems goal chip text at start, in progress, and on completion', () => {
      // Multiple gems at start
      expect(
        buildGoalChipText({ type: 'gems', target: 3, current: 0 })
      ).toBe('Collect 3 gems');

      // Singular gem at start
      expect(
        buildGoalChipText({ type: 'gems', target: 1, current: 0 })
      ).toBe('Collect 1 gem');

      // In progress
      expect(
        buildGoalChipText({ type: 'gems', target: 3, current: 1 })
      ).toBe('Collect 3 gems (1/3)');

      expect(
        buildGoalChipText({ type: 'gems', target: 3, current: 2 })
      ).toBe('Collect 3 gems (2/3)');

      // Completed with flag
      expect(
        buildGoalChipText({
          type: 'gems',
          target: 3,
          current: 3,
          completed: true,
        })
      ).toBe('Collect 3 gems ✓');

      // Completed via current >= target
      expect(
        buildGoalChipText({ type: 'gems', target: 3, current: 3 })
      ).toBe('Collect 3 gems ✓');

      // alwaysShowProgress option
      expect(
        buildGoalChipText(
          { type: 'gems', target: 3, current: 0 },
          { alwaysShowProgress: true }
        )
      ).toBe('Collect 3 gems (0/3)');
    });

    test('builds score goal chip text at start, in progress, and on completion', () => {
      // At start (score = 0)
      expect(
        buildGoalChipText({ type: 'score', target: 1500, current: 0 })
      ).toBe('Reach 1500');

      // In progress
      expect(
        buildGoalChipText({ type: 'score', target: 1500, current: 750 })
      ).toBe('Reach 1500 (750/1500)');

      // Completed
      expect(
        buildGoalChipText({
          type: 'score',
          target: 1500,
          current: 1600,
          completed: true,
        })
      ).toBe('Reach 1500 ✓');
    });

    test('builds lines goal chip text at start, in progress, and on completion', () => {
      // Multiple lines at start
      expect(
        buildGoalChipText({ type: 'lines', target: 4, current: 0 })
      ).toBe('Clear 4 lines');

      // Single line at start
      expect(
        buildGoalChipText({ type: 'lines', target: 1, current: 0 })
      ).toBe('Clear 1 line');

      // In progress
      expect(
        buildGoalChipText({ type: 'lines', target: 4, current: 2 })
      ).toBe('Clear 4 lines (2/4)');

      // Completed
      expect(
        buildGoalChipText({
          type: 'lines',
          target: 4,
          current: 4,
          completed: true,
        })
      ).toBe('Clear 4 lines ✓');
    });

    test('supports goal.value fallback when target is not set', () => {
      expect(buildGoalChipText({ type: 'score', value: 1000 })).toBe(
        'Reach 1000'
      );
      expect(buildGoalChipText({ type: 'lines', value: 2 })).toBe(
        'Clear 2 lines'
      );
    });

    test('handles unknown goal types with fallback format', () => {
      expect(
        buildGoalChipText({ type: 'locks', target: 2, current: 0 })
      ).toBe('locks: 2');
      expect(
        buildGoalChipText({
          type: 'locks',
          target: 2,
          current: 2,
          completed: true,
        })
      ).toBe('locks: 2 ✓');
    });
  });

  describe('calculateNextStars (star saving rule keeping max)', () => {
    test('saves stars on first completion', () => {
      const result = calculateNextStars({}, 1, 2);
      expect(result).toEqual({ 1: 2 });
    });

    test('upgrades stars when higher count is earned', () => {
      const initial = { 1: 1, 2: 2 };
      const result = calculateNextStars(initial, 1, 3);
      expect(result).toEqual({ 1: 3, 2: 2 });
    });

    test('preserves existing stars when replayed with fewer stars', () => {
      const initial = { 1: 3, 2: 2 };
      const result = calculateNextStars(initial, 1, 1);
      expect(result).toEqual({ 1: 3, 2: 2 });
    });

    test('preserves existing stars when replayed with same stars', () => {
      const initial = { 1: 2 };
      const result = calculateNextStars(initial, 1, 2);
      expect(result).toEqual({ 1: 2 });
    });

    test('never mutates input stars map', () => {
      const initial = Object.freeze({ 1: 2 });
      const result = calculateNextStars(initial, 1, 3);
      expect(result[1]).toBe(3);
      expect(initial[1]).toBe(2);
    });

    test('clamps stars between 0 and 3', () => {
      expect(calculateNextStars({}, 1, 5)[1]).toBe(3);
      expect(calculateNextStars({}, 1, -1)[1]).toBe(0);
    });

    test('handles null or undefined currentStars safely', () => {
      expect(calculateNextStars(null, 3, 2)).toEqual({ 3: 2 });
      expect(calculateNextStars(undefined, 3, 2)).toEqual({ 3: 2 });
    });
  });

  describe('calculateNextUnlocked (unlock rule)', () => {
    test('completing current max unlocked level unlocks the next level', () => {
      // Completed level 1 with unlocked = 1 -> unlocks level 2
      expect(calculateNextUnlocked(1, 1)).toBe(2);

      // Completed level 5 with unlocked = 5 -> unlocks level 6
      expect(calculateNextUnlocked(5, 5)).toBe(6);
    });

    test('replaying an earlier level never decreases unlocked level', () => {
      // Currently at level 8, replaying level 2 -> still 8
      expect(calculateNextUnlocked(8, 2)).toBe(8);

      // Currently at level 3, replaying level 1 -> still 3
      expect(calculateNextUnlocked(3, 1)).toBe(3);
    });

    test('defaults safely to 1 when unlocked is null or undefined', () => {
      expect(calculateNextUnlocked(null, 1)).toBe(2);
      expect(calculateNextUnlocked(undefined, 3)).toBe(4);
    });
  });

  describe('calculateNextBest', () => {
    test('updates best score when new score is higher', () => {
      const initial = { 1: 1000 };
      const result = calculateNextBest(initial, 1, 1800);
      expect(result).toEqual({ 1: 1800 });
    });

    test('keeps existing best score when new score is lower', () => {
      const initial = { 1: 2500 };
      const result = calculateNextBest(initial, 1, 1200);
      expect(result).toEqual({ 1: 2500 });
    });

    test('never mutates input best map', () => {
      const initial = Object.freeze({ 1: 2000 });
      const result = calculateNextBest(initial, 1, 3000);
      expect(result[1]).toBe(3000);
      expect(initial[1]).toBe(2000);
    });
  });

  describe('calculateAdventureProgress', () => {
    test('updates unlocked, stars, and best together on level complete', () => {
      const initial = {
        unlocked: 1,
        stars: {},
        best: {},
      };

      const result = calculateAdventureProgress(initial, {
        levelId: 1,
        stars: 3,
        score: 3200,
      });

      expect(result).toEqual({
        unlocked: 2,
        stars: { 1: 3 },
        best: { 1: 3200 },
      });
    });

    test('replaying earlier level updates stars/best while keeping max unlocked', () => {
      const initial = {
        unlocked: 5,
        stars: { 1: 2, 2: 3, 3: 2, 4: 1 },
        best: { 1: 1200, 2: 2400, 3: 1500, 4: 800 },
      };

      // Replaying level 1: better stars (3) and score (1900)
      const result = calculateAdventureProgress(initial, {
        levelId: 1,
        stars: 3,
        score: 1900,
      });

      expect(result.unlocked).toBe(5); // Unlocked remains 5
      expect(result.stars[1]).toBe(3); // Stars upgraded to 3
      expect(result.best[1]).toBe(1900); // Best score upgraded
      expect(result.stars[2]).toBe(3); // Other levels preserved
    });

    test('respects explicit unlocked value if provided in update', () => {
      const initial = {
        unlocked: 2,
        stars: { 1: 3 },
        best: { 1: 2500 },
      };

      const result = calculateAdventureProgress(initial, {
        unlocked: 4,
        levelId: 2,
        stars: 2,
        score: 1800,
      });

      expect(result.unlocked).toBe(4);
      expect(result.stars[2]).toBe(2);
      expect(result.best[2]).toBe(1800);
    });
  });

  describe('canOpenLevel (deep link & level guard pure function)', () => {
    test('returns true for unlocked levels within total level bounds', () => {
      expect(canOpenLevel(1, 1, 50)).toBe(true);
      expect(canOpenLevel(5, 5, 50)).toBe(true);
      expect(canOpenLevel(3, 5, 50)).toBe(true);
      expect(canOpenLevel(50, 50, 50)).toBe(true);
    });

    test('supports string level representations and trimmed whitespace', () => {
      expect(canOpenLevel('1', 1, 50)).toBe(true);
      expect(canOpenLevel('5', 10, 50)).toBe(true);
      expect(canOpenLevel('  12  ', 15, 50)).toBe(true);
    });

    test('returns false for locked levels (levelId > unlocked)', () => {
      expect(canOpenLevel(2, 1, 50)).toBe(false);
      expect(canOpenLevel(10, 5, 50)).toBe(false);
      expect(canOpenLevel('15', 10, 50)).toBe(false);
      expect(canOpenLevel(50, 49, 50)).toBe(false);
    });

    test('returns false for nonexistent levels exceeding total levels', () => {
      expect(canOpenLevel(51, 51, 50)).toBe(false);
      expect(canOpenLevel(100, 100, 50)).toBe(false);
      expect(canOpenLevel(51, 100, 50)).toBe(false);
      // Defaults to levelsData.length (50)
      expect(canOpenLevel(51, 100)).toBe(false);
    });

    test('returns false for non-positive or non-integer level IDs', () => {
      expect(canOpenLevel(0, 10, 50)).toBe(false);
      expect(canOpenLevel(-1, 10, 50)).toBe(false);
      expect(canOpenLevel(1.5, 10, 50)).toBe(false);
      expect(canOpenLevel('1.5', 10, 50)).toBe(false);
      expect(canOpenLevel('0', 10, 50)).toBe(false);
      expect(canOpenLevel('-5', 10, 50)).toBe(false);
    });

    test('returns false for invalid non-numeric inputs', () => {
      expect(canOpenLevel('invalid', 10, 50)).toBe(false);
      expect(canOpenLevel('', 10, 50)).toBe(false);
      expect(canOpenLevel(null, 10, 50)).toBe(false);
      expect(canOpenLevel(undefined, 10, 50)).toBe(false);
      expect(canOpenLevel(NaN, 10, 50)).toBe(false);
      expect(canOpenLevel({}, 10, 50)).toBe(false);
    });

    test('handles custom totalLevels as array of level objects', () => {
      const customLevels = [{ id: 1 }, { id: 2 }, { id: 5 }];
      expect(canOpenLevel(1, 2, customLevels)).toBe(true);
      expect(canOpenLevel(2, 2, customLevels)).toBe(true);
      expect(canOpenLevel(3, 5, customLevels)).toBe(false); // not in array
      expect(canOpenLevel(5, 2, customLevels)).toBe(false); // locked
      expect(canOpenLevel(5, 5, customLevels)).toBe(true);
    });

    test('handles default totalLevels and unlocked parameter fallbacks', () => {
      // Default totalLevels = levelsData.length, default unlocked = 1
      expect(canOpenLevel(1)).toBe(true);
      expect(canOpenLevel(2)).toBe(false);
      expect(canOpenLevel(1, undefined, 50)).toBe(true);
      expect(canOpenLevel(2, undefined, 50)).toBe(false);
      expect(canOpenLevel(1, 0, 50)).toBe(false);
    });
  });
});
