import {
  createBlitzGame,
  tick,
  placeBlitz,
  blitzConfig,
  INITIAL_TIME_MS,
  MAX_TIME_MS,
  TIME_BONUS_PER_LINE_MS,
  SPEED_BONUS_WINDOW_MS,
  SPEED_BONUS_MULTIPLIER,
  serializeBlitzGame,
  restoreBlitzGame,
} from '../modes/blitz';
import { holdPiece, serializeGame, restoreGame } from '../game';
import { BOARD_SIZE, createBoard } from '../board';

describe('Blitz Mode Engine', () => {
  describe('Configuration & Initialization', () => {
    it('exports proper constants and frozen configuration', () => {
      expect(INITIAL_TIME_MS).toBe(90000);
      expect(MAX_TIME_MS).toBe(120000);
      expect(TIME_BONUS_PER_LINE_MS).toBe(2000);
      expect(SPEED_BONUS_WINDOW_MS).toBe(1500);
      expect(SPEED_BONUS_MULTIPLIER).toBe(0.5);

      expect(blitzConfig).toEqual({
        mode: 'blitz',
        hasTimer: true,
        hasMoveLimit: false,
        initialTimeMs: 90000,
        maxTimeMs: 120000,
        timeBonusPerLineMs: 2000,
        speedBonusWindowMs: 1500,
        speedBonusMultiplier: 0.5,
      });
      expect(Object.isFrozen(blitzConfig)).toBe(true);
    });

    it('creates a new Blitz game with initial 90s timer and null lastPlaceAtMs', () => {
      const game = createBlitzGame(42);

      expect(game.mode).toBe('blitz');
      expect(game.timeLeftMs).toBe(90000);
      expect(game.lastPlaceAtMs).toBeNull();
      expect(game.score).toBe(0);
      expect(game.combo).toBe(0);
      expect(game.missStreak).toBe(0);
      expect(game.placements).toBe(0);
      expect(game.over).toBe(false);
      expect(game.overReason).toBeNull();
      expect(game.tray).toHaveLength(3);
      expect(game.board).toHaveLength(64);
    });

    it('supports seed option object or numeric seed', () => {
      const g1 = createBlitzGame(12345);
      const g2 = createBlitzGame({ seed: 12345 });

      expect(g1.tray).toEqual(g2.tray);
      expect(g1.rngState).toEqual(g2.rngState);
      expect(g1.timeLeftMs).toBe(90000);
      expect(g2.timeLeftMs).toBe(90000);
    });
  });

  describe('Timer ticking (tick)', () => {
    it('subtracts elapsed time accurately and is pure (does not mutate)', () => {
      const initial = createBlitzGame(10);
      const freezeInitial = JSON.stringify(initial);

      const res1 = tick(initial, 1000);
      expect(JSON.stringify(initial)).toBe(freezeInitial); // Input state not mutated
      expect(res1.state.timeLeftMs).toBe(89000);
      expect(res1.state.over).toBe(false);
      expect(res1.events).toEqual([]);

      const res2 = tick(res1.state, 15500);
      expect(res2.state.timeLeftMs).toBe(73500);
      expect(res2.state.over).toBe(false);
      expect(res2.events).toEqual([]);
    });

    it('clamps elapsed time to 0 and never goes negative', () => {
      const initial = createBlitzGame(10);
      const res = tick(initial, 150000); // More than 90000ms

      expect(res.state.timeLeftMs).toBe(0);
      expect(res.state.over).toBe(true);
      expect(res.state.overReason).toBe('timeUp');
      expect(res.events).toEqual([{ type: 'gameOver', reason: 'timeUp' }]);
    });

    it('does not subtract negative elapsed time (clamps negative elapsed to 0)', () => {
      const initial = createBlitzGame(10);
      const res = tick(initial, -5000);

      expect(res.state.timeLeftMs).toBe(90000);
      expect(res.state.over).toBe(false);
      expect(res.events).toEqual([]);
    });

    it('ends the game with timeUp and emits a gameOver event exactly at 0ms', () => {
      const initial = createBlitzGame(10);
      const res = tick(initial, 90000);

      expect(res.state.timeLeftMs).toBe(0);
      expect(res.state.over).toBe(true);
      expect(res.state.overReason).toBe('timeUp');
      expect(res.events).toEqual([{ type: 'gameOver', reason: 'timeUp' }]);
    });

    it('does not re-emit gameOver when ticking an already-over game', () => {
      const initial = createBlitzGame(10);
      const ended = tick(initial, 90000);
      expect(ended.state.over).toBe(true);

      const nextTick = tick(ended.state, 1000);
      expect(nextTick.state.over).toBe(true);
      expect(nextTick.events).toEqual([]);
    });

    it('handles null/undefined state safely', () => {
      expect(tick(null, 1000)).toEqual({ state: null, events: [] });
      expect(tick(undefined, 1000)).toEqual({ state: undefined, events: [] });
    });
  });

  describe('Line clears and time bonus', () => {
    function setupRowNearClear() {
      // Row 0 has 7 filled cells, col 7 empty
      const board = createBoard();
      for (let c = 0; c < 7; c++) {
        board[c] = { color: 0, kind: 'normal', hp: 1 };
      }
      return board;
    }

    function setupTwoRowsNearClear() {
      // Rows 0 and 1 each have 7 filled cells, col 7 empty
      const board = createBoard();
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 7; c++) {
          board[r * BOARD_SIZE + c] = { color: 0, kind: 'normal', hp: 1 };
        }
      }
      return board;
    }

    it('does not add time if placement clears 0 lines', () => {
      const game = createBlitzGame({ seed: 1 });
      const piece = game.tray[0];
      expect(piece).not.toBeNull();

      const { state: nextState, events } = placeBlitz(game, 0, 0, 0, 1000);
      expect(events.some((e) => e.type === 'placed')).toBe(true);
      expect(events.some((e) => e.type === 'cleared')).toBe(false);
      expect(nextState.timeLeftMs).toBe(90000);
    });

    it('adds +2000ms (+2s) for 1 cleared line', () => {
      const board = setupRowNearClear();
      const customTray = [
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 1 },
      ];
      const initialGame = createBlitzGame({
        seed: 2,
        initial: { board, tray: customTray },
      });

      // Advance timer down to 60s
      const { state: ticked } = tick(initialGame, 30000);
      expect(ticked.timeLeftMs).toBe(60000);

      // Place 1x1 at row 0, col 7 to complete row 0
      const { state: placed, events } = placeBlitz(ticked, 0, 0, 7, 31000);
      const clearEvent = events.find((e) => e.type === 'cleared');
      expect(clearEvent).toBeDefined();
      expect(clearEvent.linesCount).toBe(1);

      // 60000 + 2000 = 62000ms
      expect(placed.timeLeftMs).toBe(62000);
    });

    it('adds +4000ms (+4s) for 2 cleared lines at once', () => {
      const board = setupTwoRowsNearClear();
      const customTray = [
        { id: 'line_2x1', color: 2 }, // 2 tall, 1 wide
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 1 },
      ];
      const initialGame = createBlitzGame({
        seed: 3,
        initial: { board, tray: customTray },
      });

      const { state: ticked } = tick(initialGame, 20000);
      expect(ticked.timeLeftMs).toBe(70000);

      // Place 2x1 at row 0, col 7 -> fills col 7 on row 0 and row 1, clearing 2 lines!
      const { state: placed, events } = placeBlitz(ticked, 0, 0, 7, 21000);
      const clearEvent = events.find((e) => e.type === 'cleared');
      expect(clearEvent).toBeDefined();
      expect(clearEvent.linesCount).toBe(2);

      // 70000 + 4000 = 74000ms
      expect(placed.timeLeftMs).toBe(74000);
    });

    it('caps timeLeftMs at 120000ms (120s max)', () => {
      const board = setupRowNearClear();
      const customTray = [
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 1 },
      ];
      const initialGame = createBlitzGame({
        seed: 4,
        initial: { board, tray: customTray },
      });

      // Set time to 119000ms (1s below cap)
      const nearCapState = { ...initialGame, timeLeftMs: 119000 };

      // Clearing 1 line (+2000ms) would reach 121000ms, but should be capped at 120000ms
      const { state: placed } = placeBlitz(nearCapState, 0, 0, 7, 1000);
      expect(placed.timeLeftMs).toBe(120000);

      // Subsequent clear at exactly 120000ms stays at 120000ms
      const board2 = setupRowNearClear();
      const atCapState = {
        ...placed,
        board: board2,
        tray: customTray,
      };
      const { state: placed2 } = placeBlitz(atCapState, 0, 0, 7, 2000);
      expect(placed2.timeLeftMs).toBe(120000);
    });
  });

  describe('Speed bonus (+50% for drops within 1500ms)', () => {
    it('does not give speed bonus on the first placement (lastPlaceAtMs is null)', () => {
      const customTray = [
        { id: 'square_2x2', color: 1 }, // 4 cells = 4 base score
        { id: 'line_1x1', color: 2 },
        { id: 'line_1x1', color: 3 },
      ];
      const game = createBlitzGame({
        seed: 5,
        initial: { board: createBoard(), tray: customTray },
      });

      const { state: p1, events: e1 } = placeBlitz(game, 0, 0, 0, 1000);
      expect(p1.lastPlaceAtMs).toBe(1000);
      expect(p1.score).toBe(4);

      const scoredEvent = e1.find((e) => e.type === 'scored');
      expect(scoredEvent).toBeDefined();
      expect(scoredEvent.delta).toBe(4);
      expect(scoredEvent.total).toBe(4);
    });

    it('applies 50% speed bonus when placed within 1500ms of previous placement', () => {
      const customTray = [
        { id: 'square_2x2', color: 1 }, // 4 cells = 4 pts
        { id: 'line_1x4', color: 2 },   // 4 cells = 4 pts
        { id: 'line_1x1', color: 3 },
      ];
      const game = createBlitzGame({
        seed: 6,
        initial: { board: createBoard(), tray: customTray },
      });

      // Move 1 at 1000ms: 4 pts, no bonus
      const { state: s1 } = placeBlitz(game, 0, 0, 0, 1000);
      expect(s1.score).toBe(4);
      expect(s1.lastPlaceAtMs).toBe(1000);

      // Move 2 at 2200ms (diff = 1200ms <= 1500ms):
      // Base delta = 4 pts. Speed bonus = Math.round(4 * 0.5) = 2 pts.
      // Total delta = 6 pts. Final total = 4 + 6 = 10 pts.
      const { state: s2, events: e2 } = placeBlitz(s1, 1, 3, 0, 2200);
      expect(s2.lastPlaceAtMs).toBe(2200);
      expect(s2.score).toBe(10);

      const scoredEvent = e2.find((e) => e.type === 'scored');
      expect(scoredEvent).toBeDefined();
      expect(scoredEvent.delta).toBe(6);
      expect(scoredEvent.total).toBe(10);
    });

    it('applies speed bonus at the exact 1500ms boundary', () => {
      const customTray = [
        { id: 'line_1x2', color: 1 }, // 2 cells
        { id: 'line_1x2', color: 2 }, // 2 cells
        { id: 'line_1x1', color: 3 },
      ];
      const game = createBlitzGame({
        seed: 7,
        initial: { board: createBoard(), tray: customTray },
      });

      const { state: s1 } = placeBlitz(game, 0, 0, 0, 2000);
      expect(s1.score).toBe(2);

      // Placed exactly 1500ms later at 3500ms (3500 - 2000 = 1500)
      // Base delta = 2. Speed bonus = Math.round(2 * 0.5) = 1. Final delta = 3.
      const { state: s2, events: e2 } = placeBlitz(s1, 1, 2, 0, 3500);
      expect(s2.lastPlaceAtMs).toBe(3500);
      expect(s2.score).toBe(5);

      const scoredEvent = e2.find((e) => e.type === 'scored');
      expect(scoredEvent.delta).toBe(3);
      expect(scoredEvent.total).toBe(5);
    });

    it('does NOT apply speed bonus if placement occurs after 1500ms (e.g. 1501ms)', () => {
      const customTray = [
        { id: 'line_1x2', color: 1 },
        { id: 'line_1x2', color: 2 },
        { id: 'line_1x1', color: 3 },
      ];
      const game = createBlitzGame({
        seed: 8,
        initial: { board: createBoard(), tray: customTray },
      });

      const { state: s1 } = placeBlitz(game, 0, 0, 0, 2000);
      expect(s1.score).toBe(2);

      // Placed 1501ms later at 3501ms (3501 - 2000 = 1501 > 1500)
      const { state: s2, events: e2 } = placeBlitz(s1, 1, 2, 0, 3501);
      expect(s2.lastPlaceAtMs).toBe(3501);
      expect(s2.score).toBe(4); // 2 + 2 = 4, no bonus

      const scoredEvent = e2.find((e) => e.type === 'scored');
      expect(scoredEvent.delta).toBe(2);
      expect(scoredEvent.total).toBe(4);
    });

    it('applies speed bonus to line clear score deltas as well', () => {
      // Set up row 0 near clear (7 cells)
      const board = createBoard();
      for (let c = 0; c < 7; c++) {
        board[c] = { color: 0, kind: 'normal', hp: 1 };
      }
      const customTray = [
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 2 },
        { id: 'line_1x1', color: 3 },
      ];
      const game = createBlitzGame({
        seed: 9,
        initial: { board, tray: customTray },
      });

      // Move 1 at 1000ms: place at row 7, col 7 (no clear, 1 pt)
      const { state: s1 } = placeBlitz(game, 0, 7, 7, 1000);
      expect(s1.score).toBe(1);

      // Move 2 at 2000ms (diff = 1000ms <= 1500ms):
      // Place at row 0, col 7 (clears row 0 -> 1 cell + 100 clear = 101 base delta)
      // Speed bonus = Math.round(101 * 0.5) = 51
      // Total delta = 101 + 51 = 152
      // Final score = 1 + 152 = 153
      const { state: s2, events: e2 } = placeBlitz(s1, 1, 0, 7, 2000);
      expect(s2.score).toBe(153);
      expect(s2.timeLeftMs).toBe(92000); // Also earned +2000ms time bonus!

      const scoredEvent = e2.find((e) => e.type === 'scored');
      expect(scoredEvent.delta).toBe(152);
      expect(scoredEvent.total).toBe(153);
    });

    it('does not update lastPlaceAtMs on invalid placement', () => {
      const customTray = [
        { id: 'square_2x2', color: 1 },
        { id: 'line_1x1', color: 2 },
        { id: 'line_1x1', color: 3 },
      ];
      const game = createBlitzGame({
        seed: 10,
        initial: { board: createBoard(), tray: customTray },
      });

      // Valid placement at 1000ms
      const { state: s1 } = placeBlitz(game, 0, 0, 0, 1000);
      expect(s1.lastPlaceAtMs).toBe(1000);

      // Invalid placement attempt at 1800ms (out of bounds)
      const invalidRes = placeBlitz(s1, 1, 99, 99, 1800);
      expect(invalidRes.events).toEqual([]);
      expect(invalidRes.state).toBe(s1);
      expect(invalidRes.state.lastPlaceAtMs).toBe(1000);

      // Valid placement at 2200ms (2200 - 1000 = 1200 <= 1500)
      // Since lastPlaceAtMs was not overwritten by the invalid attempt, speed bonus applies!
      const { state: s2 } = placeBlitz(s1, 1, 5, 5, 2200);
      expect(s2.lastPlaceAtMs).toBe(2200);
      expect(s2.score).toBe(4 + Math.round(1 * 1.5)); // 4 + 2 = 6
    });

    it('rejects placement when game is already over or timeLeftMs is 0', () => {
      const game = createBlitzGame(11);
      const { state: timedOut } = tick(game, 90000);
      expect(timedOut.over).toBe(true);

      const res = placeBlitz(timedOut, 0, 0, 0, 95000);
      expect(res.state).toBe(timedOut);
      expect(res.events).toEqual([]);
    });
  });

  describe('Determinism', () => {
    it('produces identical states and events for the same seed and sequence of actions', () => {
      const seed = 777;
      const gameA = createBlitzGame(seed);
      const gameB = createBlitzGame(seed);

      expect(gameA).toEqual(gameB);

      // Step 1: tick 5000ms
      const tickA1 = tick(gameA, 5000);
      const tickB1 = tick(gameB, 5000);
      expect(tickA1.state).toEqual(tickB1.state);
      expect(tickA1.events).toEqual(tickB1.events);

      // Step 2: place piece 0 at (0, 0) at nowMs 5000
      const placeA1 = placeBlitz(tickA1.state, 0, 0, 0, 5000);
      const placeB1 = placeBlitz(tickB1.state, 0, 0, 0, 5000);
      expect(placeA1.state).toEqual(placeB1.state);
      expect(placeA1.events).toEqual(placeB1.events);

      // Step 3: tick 800ms
      const tickA2 = tick(placeA1.state, 800);
      const tickB2 = tick(placeB1.state, 800);
      expect(tickA2.state).toEqual(tickB2.state);

      // Step 4: place piece 1 at (4, 4) at nowMs 5800 (within speed bonus window)
      const placeA2 = placeBlitz(tickA2.state, 1, 4, 4, 5800);
      const placeB2 = placeBlitz(tickB2.state, 1, 4, 4, 5800);
      expect(placeA2.state).toEqual(placeB2.state);
      expect(placeA2.events).toEqual(placeB2.events);
    });
  });

  describe('Serialization and Hold slot', () => {
    it('round-trips serialization with the new blitz fields (timeLeftMs, lastPlaceAtMs, mode)', () => {
      const game = createBlitzGame(88);
      const { state: s1 } = placeBlitz(game, 0, 0, 0, 2500);
      const { state: s2 } = tick(s1, 10000);

      expect(s2.mode).toBe('blitz');
      expect(s2.timeLeftMs).toBe(80000);
      expect(s2.lastPlaceAtMs).toBe(2500);

      // Serialize with serializeGame / serializeBlitzGame
      const json = serializeBlitzGame(s2);
      expect(typeof json).toBe('string');

      // Restore with restoreGame / restoreBlitzGame
      const restored = restoreBlitzGame(json);
      expect(restored).toEqual(s2);
      expect(restored.mode).toBe('blitz');
      expect(restored.timeLeftMs).toBe(80000);
      expect(restored.lastPlaceAtMs).toBe(2500);

      // Continuing play on original vs restored gives identical results
      const contOriginal = placeBlitz(s2, 1, 4, 4, 3500);
      const contRestored = placeBlitz(restored, 1, 4, 4, 3500);

      expect(contRestored.state).toEqual(contOriginal.state);
      expect(contRestored.events).toEqual(contOriginal.events);
    });

    it('works with holdPiece in Blitz mode and preserves blitz timing fields', () => {
      const game = createBlitzGame(99);
      const { state: s1 } = placeBlitz(game, 0, 0, 0, 1000);

      // Hold tray piece 1
      const { state: heldState, events: holdEvents } = holdPiece(s1, 1);
      expect(holdEvents).toHaveLength(1);
      expect(holdEvents[0].type).toBe('held');
      expect(heldState.hold).not.toBeNull();
      expect(heldState.timeLeftMs).toBe(90000);
      expect(heldState.lastPlaceAtMs).toBe(1000);

      // Place the held piece
      const { state: placedHeld, events: placeEvents } = placeBlitz(
        heldState,
        'hold',
        3,
        3,
        2200
      );
      expect(placeEvents.some((e) => e.type === 'placed')).toBe(true);
      expect(placedHeld.hold).toBeNull();
      expect(placedHeld.lastPlaceAtMs).toBe(2200);
      // Speed bonus applied since 2200 - 1000 = 1200 <= 1500
      const scored = placeEvents.find((e) => e.type === 'scored');
      expect(scored).toBeDefined();
    });
  });
});
