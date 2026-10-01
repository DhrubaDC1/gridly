import { buildGameResult, getLocalDayKey } from '../gameResult';
import { applyGameResult, createStats } from '../../engine/stats';

describe('gameResult helpers', () => {
  describe('getLocalDayKey', () => {
    test('formats a date as YYYY-MM-DD in local time', () => {
      const date = new Date(2026, 9, 1); // Month is 0-indexed: 9 = October
      expect(getLocalDayKey(date)).toBe('2026-10-01');
    });

    test('pads single digit month and day with zeros', () => {
      const date = new Date(2026, 0, 5); // January 5
      expect(getLocalDayKey(date)).toBe('2026-01-05');
    });

    test('handles end of year boundary', () => {
      const date = new Date(2025, 11, 31); // December 31
      expect(getLocalDayKey(date)).toBe('2025-12-31');
    });

    test('defaults to today when no argument provided', () => {
      const todayKey = getLocalDayKey();
      expect(todayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('buildGameResult', () => {
    test('builds GameResult object from full game state', () => {
      const state = {
        mode: 'classic',
        score: 3450,
        stats: {
          linesCleared: 8,
          bestCombo: 4,
          perfectClears: 1,
          monoLines: 2,
          holdsUsed: 3,
          piecesPlaced: 15,
        },
      };

      const result = buildGameResult(state, {
        durationMs: 45000,
        dayKey: '2026-10-01',
      });

      expect(result).toEqual({
        mode: 'classic',
        score: 3450,
        game: {
          linesCleared: 8,
          bestCombo: 4,
          perfectClears: 1,
          monoLines: 2,
          holdsUsed: 3,
          piecesPlaced: 15,
        },
        durationMs: 45000,
        dayKey: '2026-10-01',
      });
    });

    test('accepts durationMs and dayKey as positional arguments', () => {
      const state = {
        mode: 'blitz',
        score: 8200,
        stats: { linesCleared: 12 },
      };

      const result = buildGameResult(state, 60000, '2026-10-02');

      expect(result).toEqual({
        mode: 'blitz',
        score: 8200,
        game: { linesCleared: 12 },
        durationMs: 60000,
        dayKey: '2026-10-02',
      });
    });

    test('defaults gracefully when state or stats are empty or missing', () => {
      const result = buildGameResult(null);

      expect(result).toEqual({
        mode: 'classic',
        score: 0,
        game: {},
        durationMs: 0,
        dayKey: null,
      });
    });

    test('ignores non-positive durationMs', () => {
      const state = { score: 100 };
      const resultNeg = buildGameResult(state, { durationMs: -500 });
      expect(resultNeg.durationMs).toBe(0);

      const resultNaN = buildGameResult(state, { durationMs: NaN });
      expect(resultNaN.durationMs).toBe(0);
    });

    test('integrates cleanly with applyGameResult', () => {
      const initialStats = createStats();
      const state = {
        mode: 'classic',
        score: 2500,
        stats: {
          linesCleared: 6,
          bestCombo: 3,
          perfectClears: 0,
          monoLines: 1,
          holdsUsed: 2,
          piecesPlaced: 10,
        },
      };

      const gameResult = buildGameResult(state, {
        durationMs: 30000,
        dayKey: '2026-10-01',
      });

      const updated = applyGameResult(initialStats, gameResult);

      expect(updated.gamesPlayed.classic).toBe(1);
      expect(updated.bestScore.classic).toBe(2500);
      expect(updated.totalLinesCleared).toBe(6);
      expect(updated.bestCombo).toBe(3);
      expect(updated.monoLines).toBe(1);
      expect(updated.holdsUsed).toBe(2);
      expect(updated.totalPiecesPlaced).toBe(10);
      expect(updated.totalPlayTime).toBe(30000);
      expect(updated.currentStreak).toBe(1);
      expect(updated.bestStreak).toBe(1);
      expect(updated.lastPlayedDay).toBe('2026-10-01');
    });
  });
});
