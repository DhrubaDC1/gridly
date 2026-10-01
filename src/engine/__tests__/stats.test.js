import { createStats, applyGameResult, getDayDifference } from '../stats';
import { createGame, placePiece } from '../game';
import { useProgress, INITIAL_STATS } from '../../store/useProgress';

/**
 * Deep freezes an object to strictly verify immutability.
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

describe('stats engine module', () => {
  describe('createStats()', () => {
    it('returns a zero-valued stats object with every field listed in AGENTS.md §7', () => {
      const stats = createStats();

      expect(stats).toEqual({
        gamesPlayed: {
          classic: 0,
          blitz: 0,
          adventure: 0,
        },
        bestScore: {
          classic: 0,
          blitz: 0,
          adventure: 0,
        },
        totalLinesCleared: 0,
        bestCombo: 0,
        perfectClears: 0,
        monoLines: 0,
        totalPiecesPlaced: 0,
        holdsUsed: 0,
        totalPlayTime: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastPlayedDay: null,
      });
    });

    it('returns distinct object references on each call', () => {
      const s1 = createStats();
      const s2 = createStats();

      expect(s1).not.toBe(s2);
      expect(s1.gamesPlayed).not.toBe(s2.gamesPlayed);
      expect(s1.bestScore).not.toBe(s2.bestScore);
    });
  });

  describe('getDayDifference() helper', () => {
    it('calculates 0 for identical days', () => {
      expect(getDayDifference('2026-10-01', '2026-10-01')).toBe(0);
    });

    it('calculates 1 for consecutive days', () => {
      expect(getDayDifference('2026-10-01', '2026-10-02')).toBe(1);
    });

    it('calculates positive differences for future days', () => {
      expect(getDayDifference('2026-10-01', '2026-10-05')).toBe(4);
    });

    it('calculates negative differences for past days', () => {
      expect(getDayDifference('2026-10-05', '2026-10-01')).toBe(-4);
    });

    it('calculates across month boundaries in standard months', () => {
      expect(getDayDifference('2026-01-31', '2026-02-01')).toBe(1);
      expect(getDayDifference('2026-04-30', '2026-05-01')).toBe(1);
    });

    it('calculates across February in non-leap year (2026)', () => {
      expect(getDayDifference('2026-02-28', '2026-03-01')).toBe(1);
    });

    it('calculates across February in leap year (2024)', () => {
      expect(getDayDifference('2024-02-28', '2024-02-29')).toBe(1);
      expect(getDayDifference('2024-02-29', '2024-03-01')).toBe(1);
      expect(getDayDifference('2024-02-28', '2024-03-01')).toBe(2);
    });

    it('calculates across year boundaries', () => {
      expect(getDayDifference('2026-12-31', '2027-01-01')).toBe(1);
      expect(getDayDifference('2024-12-31', '2025-01-01')).toBe(1);
      expect(getDayDifference('2026-12-31', '2028-01-01')).toBe(366);
    });
  });

  describe('applyGameResult() - Field updates', () => {
    it('increments gamesPlayed per mode', () => {
      let stats = createStats();

      stats = applyGameResult(stats, { mode: 'classic', score: 100 });
      expect(stats.gamesPlayed).toEqual({ classic: 1, blitz: 0, adventure: 0 });

      stats = applyGameResult(stats, { mode: 'classic', score: 200 });
      expect(stats.gamesPlayed).toEqual({ classic: 2, blitz: 0, adventure: 0 });

      stats = applyGameResult(stats, { mode: 'blitz', score: 300 });
      expect(stats.gamesPlayed).toEqual({ classic: 2, blitz: 1, adventure: 0 });

      stats = applyGameResult(stats, { mode: 'adventure', score: 400 });
      expect(stats.gamesPlayed).toEqual({ classic: 2, blitz: 1, adventure: 1 });
    });

    it('tracks bestScore per mode (updating on higher, preserving on lower)', () => {
      let stats = createStats();

      stats = applyGameResult(stats, { mode: 'classic', score: 1200 });
      expect(stats.bestScore.classic).toBe(1200);

      // Lower score does not overwrite best
      stats = applyGameResult(stats, { mode: 'classic', score: 800 });
      expect(stats.bestScore.classic).toBe(1200);

      // Higher score updates best
      stats = applyGameResult(stats, { mode: 'classic', score: 2500 });
      expect(stats.bestScore.classic).toBe(2500);

      // Blitz score updates independently
      stats = applyGameResult(stats, { mode: 'blitz', score: 1800 });
      expect(stats.bestScore.blitz).toBe(1800);
      expect(stats.bestScore.classic).toBe(2500);
    });

    it('accumulates totalLinesCleared across games', () => {
      let stats = createStats();

      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 100,
        game: { linesCleared: 3 },
      });
      expect(stats.totalLinesCleared).toBe(3);

      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 150,
        game: { linesCleared: 5 },
      });
      expect(stats.totalLinesCleared).toBe(8);
    });

    it('tracks bestCombo as max across games', () => {
      let stats = createStats();

      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 200,
        game: { bestCombo: 4 },
      });
      expect(stats.bestCombo).toBe(4);

      // Lower combo in next game does not lower all-time best
      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 100,
        game: { bestCombo: 2 },
      });
      expect(stats.bestCombo).toBe(4);

      // Higher combo updates it
      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 500,
        game: { bestCombo: 7 },
      });
      expect(stats.bestCombo).toBe(7);
    });

    it('accumulates perfectClears across games', () => {
      let stats = createStats();

      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 2000,
        game: { perfectClears: 1 },
      });
      expect(stats.perfectClears).toBe(1);

      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 4000,
        game: { perfectClears: 2 },
      });
      expect(stats.perfectClears).toBe(3);
    });

    it('accumulates monoLines across games', () => {
      let stats = createStats();

      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 500,
        game: { monoLines: 2 },
      });
      expect(stats.monoLines).toBe(2);

      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 500,
        game: { monoLines: 1 },
      });
      expect(stats.monoLines).toBe(3);
    });

    it('accumulates totalPiecesPlaced across games (supports piecesPlaced and totalPiecesPlaced)', () => {
      let stats = createStats();

      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 100,
        game: { piecesPlaced: 12 },
      });
      expect(stats.totalPiecesPlaced).toBe(12);

      stats = applyGameResult(stats, {
        mode: 'blitz',
        score: 100,
        game: { totalPiecesPlaced: 8 },
      });
      expect(stats.totalPiecesPlaced).toBe(20);
    });

    it('accumulates holdsUsed across games', () => {
      let stats = createStats();

      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 100,
        game: { holdsUsed: 3 },
      });
      expect(stats.holdsUsed).toBe(3);

      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 100,
        game: { holdsUsed: 2 },
      });
      expect(stats.holdsUsed).toBe(5);
    });

    it('accumulates totalPlayTime ms across games', () => {
      let stats = createStats();

      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 100,
        durationMs: 45000,
      });
      expect(stats.totalPlayTime).toBe(45000);

      stats = applyGameResult(stats, {
        mode: 'blitz',
        score: 200,
        durationMs: 90000,
      });
      expect(stats.totalPlayTime).toBe(135000);
    });

    it('handles empty / undefined stats or result gracefully', () => {
      const fromNullStats = applyGameResult(null, {
        mode: 'classic',
        score: 500,
        dayKey: '2026-10-01',
      });
      expect(fromNullStats.bestScore.classic).toBe(500);
      expect(fromNullStats.currentStreak).toBe(1);

      const fromNullResult = applyGameResult(createStats(), null);
      expect(fromNullResult).toEqual(createStats());
      expect(fromNullResult).not.toBe(createStats());
    });
  });

  describe('Streak transitions', () => {
    it('sets streak to 1 on first game played when lastPlayedDay is null', () => {
      const initial = createStats();
      const next = applyGameResult(initial, {
        mode: 'classic',
        score: 100,
        dayKey: '2026-10-01',
      });

      expect(next.currentStreak).toBe(1);
      expect(next.bestStreak).toBe(1);
      expect(next.lastPlayedDay).toBe('2026-10-01');
    });

    it('leaves streak unchanged when played on the same day', () => {
      let stats = createStats();

      // First game on 2026-10-01
      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 100,
        dayKey: '2026-10-01',
      });
      expect(stats.currentStreak).toBe(1);
      expect(stats.bestStreak).toBe(1);

      // Second game on 2026-10-01 (same day)
      stats = applyGameResult(stats, {
        mode: 'classic',
        score: 200,
        dayKey: '2026-10-01',
      });
      expect(stats.currentStreak).toBe(1);
      expect(stats.bestStreak).toBe(1);
      expect(stats.lastPlayedDay).toBe('2026-10-01');

      // Third game on 2026-10-01 (same day)
      stats = applyGameResult(stats, {
        mode: 'blitz',
        score: 300,
        dayKey: '2026-10-01',
      });
      expect(stats.currentStreak).toBe(1);
      expect(stats.bestStreak).toBe(1);
      expect(stats.lastPlayedDay).toBe('2026-10-01');
    });

    it('increments streak on the next calendar day and updates bestStreak', () => {
      let stats = createStats();

      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-10-01' });
      expect(stats.currentStreak).toBe(1);
      expect(stats.bestStreak).toBe(1);

      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-10-02' });
      expect(stats.currentStreak).toBe(2);
      expect(stats.bestStreak).toBe(2);
      expect(stats.lastPlayedDay).toBe('2026-10-02');

      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-10-03' });
      expect(stats.currentStreak).toBe(3);
      expect(stats.bestStreak).toBe(3);
      expect(stats.lastPlayedDay).toBe('2026-10-03');
    });

    it('resets streak to 1 on any gap (> 1 day) while preserving bestStreak as max', () => {
      let stats = createStats();

      // Build streak of 3
      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-10-01' });
      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-10-02' });
      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-10-03' });
      expect(stats.currentStreak).toBe(3);
      expect(stats.bestStreak).toBe(3);

      // Gap of 2 days: played on 2026-10-05 (missed 2026-10-04)
      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-10-05' });
      expect(stats.currentStreak).toBe(1);
      expect(stats.bestStreak).toBe(3);
      expect(stats.lastPlayedDay).toBe('2026-10-05');

      // Next calendar day resumes incrementing from 1
      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-10-06' });
      expect(stats.currentStreak).toBe(2);
      expect(stats.bestStreak).toBe(3);
      expect(stats.lastPlayedDay).toBe('2026-10-06');
    });

    it('handles month boundaries in standard 31-day and 30-day months', () => {
      let stats = createStats();

      // January 31 -> February 1
      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-01-31' });
      expect(stats.currentStreak).toBe(1);

      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-02-01' });
      expect(stats.currentStreak).toBe(2);
      expect(stats.lastPlayedDay).toBe('2026-02-01');

      // April 30 -> May 1
      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-04-30' });
      expect(stats.currentStreak).toBe(1); // Gap from Feb to Apr resets

      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-05-01' });
      expect(stats.currentStreak).toBe(2);
      expect(stats.lastPlayedDay).toBe('2026-05-01');
    });

    it('handles February in non-leap year (2026: Feb 28 -> Mar 1)', () => {
      let stats = createStats();

      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-02-28' });
      expect(stats.currentStreak).toBe(1);

      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-03-01' });
      expect(stats.currentStreak).toBe(2);
      expect(stats.lastPlayedDay).toBe('2026-03-01');
    });

    it('handles February leap year boundary (2024: Feb 28 -> Feb 29 -> Mar 1)', () => {
      let stats = createStats();

      // Feb 28 -> Feb 29 in leap year
      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2024-02-28' });
      expect(stats.currentStreak).toBe(1);

      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2024-02-29' });
      expect(stats.currentStreak).toBe(2);
      expect(stats.lastPlayedDay).toBe('2024-02-29');

      // Feb 29 -> Mar 1 in leap year
      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2024-03-01' });
      expect(stats.currentStreak).toBe(3);
      expect(stats.lastPlayedDay).toBe('2024-03-01');

      // In a leap year, skipping Feb 29 (Feb 28 -> Mar 1) is a 2-day gap, resetting to 1
      let leapSkipped = createStats();
      leapSkipped = applyGameResult(leapSkipped, { mode: 'classic', score: 100, dayKey: '2024-02-28' });
      expect(leapSkipped.currentStreak).toBe(1);
      leapSkipped = applyGameResult(leapSkipped, { mode: 'classic', score: 100, dayKey: '2024-03-01' });
      expect(leapSkipped.currentStreak).toBe(1);
    });

    it('handles year boundaries (Dec 31 -> Jan 1)', () => {
      let stats = createStats();

      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-12-31' });
      expect(stats.currentStreak).toBe(1);

      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2027-01-01' });
      expect(stats.currentStreak).toBe(2);
      expect(stats.lastPlayedDay).toBe('2027-01-01');

      // Across leap year boundary: Dec 31, 2024 -> Jan 1, 2025
      let leapYearStats = createStats();
      leapYearStats = applyGameResult(leapYearStats, { mode: 'classic', score: 100, dayKey: '2024-12-31' });
      leapYearStats = applyGameResult(leapYearStats, { mode: 'classic', score: 100, dayKey: '2025-01-01' });
      expect(leapYearStats.currentStreak).toBe(2);
      expect(leapYearStats.lastPlayedDay).toBe('2025-01-01');

      // Multi-year gap resets to 1
      const multiYearGap = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2029-01-01' });
      expect(multiYearGap.currentStreak).toBe(1);
      expect(multiYearGap.bestStreak).toBe(2);
    });

    it('resets streak to 1 on out-of-order or backwards date', () => {
      let stats = createStats();
      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-10-10' });
      expect(stats.currentStreak).toBe(1);

      // Game with earlier date
      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-10-08' });
      expect(stats.currentStreak).toBe(1);
      expect(stats.lastPlayedDay).toBe('2026-10-08');
    });

    it('leaves streak unchanged when dayKey is omitted or invalid', () => {
      let stats = createStats();
      stats = applyGameResult(stats, { mode: 'classic', score: 100, dayKey: '2026-10-01' });
      expect(stats.currentStreak).toBe(1);

      stats = applyGameResult(stats, { mode: 'classic', score: 200 });
      expect(stats.currentStreak).toBe(1);
      expect(stats.lastPlayedDay).toBe('2026-10-01');

      stats = applyGameResult(stats, { mode: 'classic', score: 300, dayKey: null });
      expect(stats.currentStreak).toBe(1);
      expect(stats.lastPlayedDay).toBe('2026-10-01');

      stats = applyGameResult(stats, { mode: 'classic', score: 300, dayKey: 'not-a-date' });
      expect(stats.currentStreak).toBe(1);
      expect(stats.lastPlayedDay).toBe('2026-10-01');
    });
  });

  describe('Purity and immutability', () => {
    it('never mutates input stats or result objects (verified with deepFreeze)', () => {
      const stats = deepFreeze(createStats());
      const result = deepFreeze({
        mode: 'classic',
        score: 500,
        durationMs: 12000,
        dayKey: '2026-10-01',
        game: deepFreeze({
          linesCleared: 2,
          bestCombo: 3,
          perfectClears: 1,
          monoLines: 1,
          holdsUsed: 2,
          piecesPlaced: 10,
        }),
      });

      let updated;
      expect(() => {
        updated = applyGameResult(stats, result);
      }).not.toThrow();

      expect(updated).not.toBe(stats);
      expect(updated.gamesPlayed).not.toBe(stats.gamesPlayed);
      expect(updated.bestScore).not.toBe(stats.bestScore);

      // Verify stats values were not mutated
      expect(stats.gamesPlayed.classic).toBe(0);
      expect(stats.bestScore.classic).toBe(0);
      expect(stats.totalLinesCleared).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.lastPlayedDay).toBeNull();

      // Verify updated has the new values
      expect(updated.gamesPlayed.classic).toBe(1);
      expect(updated.bestScore.classic).toBe(500);
      expect(updated.totalLinesCleared).toBe(2);
      expect(updated.bestCombo).toBe(3);
      expect(updated.perfectClears).toBe(1);
      expect(updated.monoLines).toBe(1);
      expect(updated.holdsUsed).toBe(2);
      expect(updated.totalPiecesPlaced).toBe(10);
      expect(updated.totalPlayTime).toBe(12000);
      expect(updated.currentStreak).toBe(1);
      expect(updated.bestStreak).toBe(1);
      expect(updated.lastPlayedDay).toBe('2026-10-01');
    });

    it('subsequent mutations on output object do not affect previous state', () => {
      const s0 = createStats();
      const s1 = applyGameResult(s0, { mode: 'classic', score: 100, dayKey: '2026-10-01' });
      s1.gamesPlayed.classic = 999;
      s1.bestScore.classic = 999;

      expect(s0.gamesPlayed.classic).toBe(0);
      expect(s0.bestScore.classic).toBe(0);
    });
  });

  describe('Integration with engine game.js', () => {
    it('seamlessly ingests state.stats produced by placePiece() in engine game', () => {
      // Create a game with deterministic seed
      const game = createGame({ seed: 42, mode: 'classic' });
      expect(game.stats).toEqual({
        linesCleared: 0,
        bestCombo: 0,
        perfectClears: 0,
        monoLines: 0,
        holdsUsed: 0,
        piecesPlaced: 0,
      });

      // Place first tray piece at (0, 0)
      const { state: placedState } = placePiece(game, 0, 0, 0);
      expect(placedState.stats.piecesPlaced).toBe(1);

      // Apply result with engine state stats
      const aggregate = applyGameResult(createStats(), {
        mode: placedState.mode,
        score: placedState.score,
        game: placedState.stats,
        durationMs: 3500,
        dayKey: '2026-10-01',
      });

      expect(aggregate.gamesPlayed.classic).toBe(1);
      expect(aggregate.totalPiecesPlaced).toBe(1);
      expect(aggregate.totalPlayTime).toBe(3500);
      expect(aggregate.currentStreak).toBe(1);
      expect(aggregate.bestScore.classic).toBe(placedState.score);
    });
  });

  describe('Integration with useProgress', () => {
    it('INITIAL_STATS in useProgress matches createStats()', () => {
      expect(INITIAL_STATS).toEqual(createStats());
    });

    it('useProgress initial stats matches createStats()', () => {
      const state = useProgress.getState();
      expect(state.stats).toEqual(createStats());
    });

    it('allows updating useProgress stats via applyGameResult', () => {
      const store = useProgress.getState();
      store.resetProgress();

      store.setStats((prev) =>
        applyGameResult(prev, {
          mode: 'classic',
          score: 1500,
          durationMs: 60000,
          dayKey: '2026-10-01',
          game: { linesCleared: 4, bestCombo: 2, piecesPlaced: 15 },
        })
      );

      const updated = useProgress.getState().stats;
      expect(updated.gamesPlayed.classic).toBe(1);
      expect(updated.bestScore.classic).toBe(1500);
      expect(updated.totalLinesCleared).toBe(4);
      expect(updated.bestCombo).toBe(2);
      expect(updated.totalPiecesPlaced).toBe(15);
      expect(updated.totalPlayTime).toBe(60000);
      expect(updated.currentStreak).toBe(1);
      expect(updated.lastPlayedDay).toBe('2026-10-01');

      // Reset restores clean state
      store.resetProgress();
      expect(useProgress.getState().stats).toEqual(createStats());
    });
  });
});
