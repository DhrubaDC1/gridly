import {
  formatPlayTime,
  formatDate,
  formatUnlockDate,
  formatNumber,
  formatAverageClassicScore,
  formatCombo,
  getTotalGamesPlayed,
} from '../format';

describe('format helpers', () => {
  describe('formatPlayTime()', () => {
    test('formats 0 and non-positive or invalid ms as 0m', () => {
      expect(formatPlayTime(0)).toBe('0m');
      expect(formatPlayTime(-5000)).toBe('0m');
      expect(formatPlayTime(null)).toBe('0m');
      expect(formatPlayTime(undefined)).toBe('0m');
      expect(formatPlayTime(NaN)).toBe('0m');
      expect(formatPlayTime(Infinity)).toBe('0m');
      expect(formatPlayTime(45000)).toBe('0m'); // under 1 min
    });

    test('formats minutes only when under 1 hour', () => {
      expect(formatPlayTime(60000)).toBe('1m');
      expect(formatPlayTime(720000)).toBe('12m');
      expect(formatPlayTime(59 * 60000)).toBe('59m');
    });

    test('formats hours and minutes like "3h 12m"', () => {
      const ms = 3 * 3600000 + 12 * 60000;
      expect(formatPlayTime(ms)).toBe('3h 12m');

      const msExactHour = 1 * 3600000;
      expect(formatPlayTime(msExactHour)).toBe('1h 0m');

      const msLarge = 25 * 3600000 + 5 * 60000;
      expect(formatPlayTime(msLarge)).toBe('25h 5m');
    });
  });

  describe('formatDate() & formatUnlockDate()', () => {
    test('returns empty string for null, undefined, or invalid date inputs', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('')).toBe('');
      expect(formatDate('invalid-date')).toBe('');
      expect(formatUnlockDate(null)).toBe('');
      expect(formatUnlockDate('invalid')).toBe('');
    });

    test('formats YYYY-MM-DD calendar strings correctly', () => {
      expect(formatDate('2026-10-01')).toBe('Oct 1, 2026');
      expect(formatDate('2025-01-15')).toBe('Jan 15, 2025');
      expect(formatDate('2024-12-31')).toBe('Dec 31, 2024');
    });

    test('formats Date objects and ISO timestamps', () => {
      const d = new Date(2026, 9, 5); // Oct 5, 2026 in local time
      expect(formatDate(d)).toBe('Oct 5, 2026');

      expect(formatUnlockDate('2026-10-01')).toBe('Unlocked Oct 1, 2026');
    });
  });

  describe('formatNumber()', () => {
    test('formats valid numbers with commas', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(100)).toBe('100');
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(12480)).toBe('12,480');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    test('handles null, undefined, NaN gracefully as 0', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
      expect(formatNumber(NaN)).toBe('0');
    });
  });

  describe('formatAverageClassicScore()', () => {
    test('returns a dash when there are no games', () => {
      expect(formatAverageClassicScore(null)).toBe('—');
      expect(formatAverageClassicScore({})).toBe('—');
      expect(formatAverageClassicScore({ gamesPlayed: { classic: 0 } })).toBe('—');
      expect(formatAverageClassicScore({ gamesPlayed: { classic: -1 } })).toBe('—');
    });

    test('returns a dash when games > 0 but no score total is recorded', () => {
      expect(formatAverageClassicScore({ gamesPlayed: { classic: 3 } })).toBe('—');
      expect(
        formatAverageClassicScore({
          gamesPlayed: { classic: 3 },
          scoreTotals: { classic: null },
        })
      ).toBe('—');
    });

    test('computes rounded average score when games and score totals exist', () => {
      expect(
        formatAverageClassicScore({
          gamesPlayed: { classic: 2 },
          scoreTotals: { classic: 5000 },
        })
      ).toBe('2,500');

      expect(
        formatAverageClassicScore({
          gamesPlayed: { classic: 3 },
          scoreTotals: { classic: 1000 },
        })
      ).toBe('333');

      expect(
        formatAverageClassicScore({
          gamesPlayed: { classic: 1 },
          scoreTotals: { classic: 0 },
        })
      ).toBe('0');
    });

    test('supports totalScore or classicScoreTotal properties', () => {
      expect(
        formatAverageClassicScore({
          gamesPlayed: { classic: 4 },
          totalScore: { classic: 8000 },
        })
      ).toBe('2,000');

      expect(
        formatAverageClassicScore({
          gamesPlayed: { classic: 2 },
          classicScoreTotal: 3000,
        })
      ).toBe('1,500');
    });
  });

  describe('formatCombo()', () => {
    test('formats positive combo with multiplication sign', () => {
      expect(formatCombo(1)).toBe('×1');
      expect(formatCombo(5)).toBe('×5');
      expect(formatCombo(10)).toBe('×10');
    });

    test('returns dash for 0 or non-positive combos', () => {
      expect(formatCombo(0)).toBe('—');
      expect(formatCombo(-1)).toBe('—');
      expect(formatCombo(null)).toBe('—');
      expect(formatCombo(undefined)).toBe('—');
    });
  });

  describe('getTotalGamesPlayed()', () => {
    test('sums games across classic, blitz, and adventure', () => {
      expect(
        getTotalGamesPlayed({
          gamesPlayed: { classic: 5, blitz: 3, adventure: 2 },
        })
      ).toBe(10);
    });

    test('returns 0 for empty or missing gamesPlayed', () => {
      expect(getTotalGamesPlayed(null)).toBe(0);
      expect(getTotalGamesPlayed({})).toBe(0);
      expect(getTotalGamesPlayed({ gamesPlayed: {} })).toBe(0);
    });

    test('handles numeric gamesPlayed directly if present', () => {
      expect(getTotalGamesPlayed({ gamesPlayed: 7 })).toBe(7);
    });
  });
});
