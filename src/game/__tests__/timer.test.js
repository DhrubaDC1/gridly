import {
  calculateElapsed,
  calculateTimerRatio,
  getRemainingSeconds,
  formatRemainingSeconds,
  BLITZ_MAX_TIME_MS,
} from '../timer';

describe('Blitz timer math helpers (pure)', () => {
  describe('calculateElapsed', () => {
    test('calculates positive elapsed time correctly', () => {
      expect(calculateElapsed(1000, 1100)).toBe(100);
      expect(calculateElapsed(0, 50)).toBe(50);
      expect(calculateElapsed(15000, 15120)).toBe(120);
    });

    test('clamps to 0 if currentTime is before lastTime or equal', () => {
      expect(calculateElapsed(1100, 1000)).toBe(0);
      expect(calculateElapsed(1000, 1000)).toBe(0);
    });

    test('returns 0 for invalid or non-numeric inputs', () => {
      expect(calculateElapsed(null, 1000)).toBe(0);
      expect(calculateElapsed(1000, undefined)).toBe(0);
      expect(calculateElapsed(NaN, 1000)).toBe(0);
      expect(calculateElapsed('100', '200')).toBe(0);
    });
  });

  describe('calculateTimerRatio', () => {
    test('returns correct ratio relative to default 120000ms', () => {
      expect(BLITZ_MAX_TIME_MS).toBe(120000);
      expect(calculateTimerRatio(90000)).toBe(0.75);
      expect(calculateTimerRatio(60000)).toBe(0.5);
      expect(calculateTimerRatio(120000)).toBe(1);
    });

    test('clamps ratio between 0 and 1', () => {
      expect(calculateTimerRatio(0)).toBe(0);
      expect(calculateTimerRatio(-500)).toBe(0);
      expect(calculateTimerRatio(150000)).toBe(1);
    });

    test('supports custom maxTimeMs', () => {
      expect(calculateTimerRatio(30000, 60000)).toBe(0.5);
      expect(calculateTimerRatio(60000, 60000)).toBe(1);
      expect(calculateTimerRatio(70000, 60000)).toBe(1);
    });

    test('returns 0 for invalid inputs', () => {
      expect(calculateTimerRatio(NaN)).toBe(0);
      expect(calculateTimerRatio(null)).toBe(0);
      expect(calculateTimerRatio(90000, 0)).toBe(0);
      expect(calculateTimerRatio(90000, -100)).toBe(0);
    });
  });

  describe('getRemainingSeconds', () => {
    test('returns ceiling seconds remaining', () => {
      expect(getRemainingSeconds(90000)).toBe(90);
      expect(getRemainingSeconds(89100)).toBe(90);
      expect(getRemainingSeconds(89000)).toBe(89);
      expect(getRemainingSeconds(100)).toBe(1);
      expect(getRemainingSeconds(0)).toBe(0);
      expect(getRemainingSeconds(-1000)).toBe(0);
    });

    test('handles invalid inputs', () => {
      expect(getRemainingSeconds(null)).toBe(0);
      expect(getRemainingSeconds(undefined)).toBe(0);
      expect(getRemainingSeconds(NaN)).toBe(0);
    });
  });

  describe('formatRemainingSeconds', () => {
    test('formats as string with "s" suffix', () => {
      expect(formatRemainingSeconds(90000)).toBe('90s');
      expect(formatRemainingSeconds(89100)).toBe('90s');
      expect(formatRemainingSeconds(500)).toBe('1s');
      expect(formatRemainingSeconds(0)).toBe('0s');
      expect(formatRemainingSeconds(-100)).toBe('0s');
    });
  });
});
