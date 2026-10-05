import {
  createGame,
  placePiece,
  holdPiece,
  isGameOver,
  serializeGame,
  restoreGame,
} from '../game';
import { createClassicGame, classicConfig } from '../modes/classic';
import { createBoard, placePiece as boardPlacePiece } from '../board';
import { getPiece } from '../pieces';

describe('Engine: Game Controller (src/engine/game.js)', () => {
  describe('createGame', () => {
    it('initializes game state with expected shape and generated tray', () => {
      const state = createGame({ seed: 42, mode: 'classic' });

      expect(state.mode).toBe('classic');
      expect(state.board).toHaveLength(64);
      expect(state.board.every((cell) => cell === null)).toBe(true);

      expect(state.tray).toHaveLength(3);
      state.tray.forEach((piece) => {
        expect(piece).not.toBeNull();
        expect(typeof piece.id).toBe('string');
        expect(typeof piece.color).toBe('number');
        expect(piece.color).toBeGreaterThanOrEqual(0);
        expect(piece.color).toBeLessThan(6);
      });

      expect(state.hold).toBeNull();
      expect(state.holdUsed).toBe(false);
      expect(state.score).toBe(0);
      expect(state.combo).toBe(0);
      expect(state.missStreak).toBe(0);
      expect(state.placements).toBe(0);
      expect(typeof state.rngState).toBe('number');
      expect(state.over).toBe(false);
      expect(state.overReason).toBeNull();

      expect(state.stats).toEqual({
        linesCleared: 0,
        bestCombo: 0,
        perfectClears: 0,
        monoLines: 0,
        holdsUsed: 0,
        piecesPlaced: 0,
      });
    });

    it('defaults to seed 0 and mode classic when no arguments provided', () => {
      const state = createGame();
      expect(state.mode).toBe('classic');
      expect(state.tray).toHaveLength(3);
    });

    it('uses provided initial board and tray instead of generating them', () => {
      const customBoard = createBoard();
      customBoard[0] = { color: 3, kind: 'normal', hp: 1 };
      const customTray = [
        { id: 'line_1x3', color: 2 },
        { id: 'square_2x2', color: 4 },
        null,
      ];

      const state = createGame({
        seed: 777,
        initial: { board: customBoard, tray: customTray },
      });

      expect(state.board[0]).toEqual({ color: 3, kind: 'normal', hp: 1 });
      expect(state.tray[0]).toEqual({ id: 'line_1x3', color: 2 });
      expect(state.tray[1]).toEqual({ id: 'square_2x2', color: 4 });
      expect(state.tray[2]).toBeNull();
      // Ensure seed was still initialized into rngState
      expect(typeof state.rngState).toBe('number');
    });
  });

  describe('Invalid placements and holds', () => {
    it('returns the same state and empty events on invalid placement', () => {
      const state = createGame({ seed: 10 });
      // Out of bounds placement
      const resultOob = placePiece(state, 0, 7, 7);
      if (getPiece(state.tray[0].id).cells.length > 1) {
        expect(resultOob.state).toBe(state);
        expect(resultOob.events).toEqual([]);
      }

      // Invalid tray source
      const resultBadSource = placePiece(state, 5, 0, 0);
      expect(resultBadSource.state).toBe(state);
      expect(resultBadSource.events).toEqual([]);

      // Place from empty hold
      const resultEmptyHold = placePiece(state, 'hold', 0, 0);
      expect(resultEmptyHold.state).toBe(state);
      expect(resultEmptyHold.events).toEqual([]);
    });

    it('returns the same state and empty events on invalid hold', () => {
      const state = createGame({ seed: 10 });
      // Invalid tray index
      const badHold = holdPiece(state, 3);
      expect(badHold.state).toBe(state);
      expect(badHold.events).toEqual([]);

      // Negative index
      const negHold = holdPiece(state, -1);
      expect(negHold.state).toBe(state);
      expect(negHold.events).toEqual([]);
    });

    it('disallows placement and hold when game is over', () => {
      const state = { ...createGame({ seed: 10 }), over: true, overReason: 'noMoves' };
      const placeRes = placePiece(state, 0, 0, 0);
      expect(placeRes.state).toBe(state);
      expect(placeRes.events).toEqual([]);

      const holdRes = holdPiece(state, 0);
      expect(holdRes.state).toBe(state);
      expect(holdRes.events).toEqual([]);
    });
  });

  describe('Full placement turn with events in order', () => {
    it('emits placed and scored in order for a normal placement with no clear', () => {
      const baseState = createGame({ seed: 1 });
      const piece = baseState.tray[0];
      const pDef = getPiece(piece.id);

      const { state, events } = placePiece(baseState, 0, 0, 0);

      expect(events.map((e) => e.type)).toEqual(['placed', 'scored']);

      expect(events[0]).toEqual({
        type: 'placed',
        pieceId: piece.id,
        cells: pDef.cells.map(([r, c]) => r * 8 + c),
        color: piece.color,
      });

      expect(events[1]).toEqual({
        type: 'scored',
        delta: pDef.cells.length,
        total: pDef.cells.length,
        breakdown: {
          cells: pDef.cells.length,
          lines: 0,
          mono: 0,
          comboMultiplier: 1,
          clears: 0,
          perfectClear: 0,
        },
      });

      expect(state.score).toBe(pDef.cells.length);
      expect(state.placements).toBe(1);
      expect(state.tray[0]).toBeNull();
      expect(state.stats.piecesPlaced).toBe(1);
      expect(state.missStreak).toBe(1);
    });

    it('emits placed, cleared, gemCollected, lockCracked, combo, scored in exact order', () => {
      let board = createBoard();
      const p1x1 = getPiece('line_1x1');

      // Put a cell at (5, 5) so clearing row 0 does not empty the whole board
      board = boardPlacePiece(board, p1x1, 5, 5, 0);

      // Fill row 0 cols 0 to 6 with normal, gem, and lock cells
      for (let c = 0; c < 5; c++) {
        board = boardPlacePiece(board, p1x1, 0, c, 1, 'normal', 1);
      }
      board = boardPlacePiece(board, p1x1, 0, 5, 2, 'gem', 1);
      board = boardPlacePiece(board, p1x1, 0, 6, 3, 'lock', 2);

      const testState = {
        ...createGame({ seed: 5 }),
        board,
        tray: [
          { id: 'line_1x1', color: 1 },
          { id: 'line_1x1', color: 2 },
          null,
        ],
      };

      // Place at (0, 7) completing row 0
      const { state, events } = placePiece(testState, 0, 0, 7);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toEqual([
        'placed',
        'cleared',
        'gemCollected',
        'lockCracked',
        'combo',
        'scored',
      ]);

      expect(events[0]).toMatchObject({ type: 'placed', pieceId: 'line_1x1' });
      expect(events[1]).toMatchObject({
        type: 'cleared',
        rows: [0],
        cols: [],
        linesCount: 1,
      });
      expect(events[2]).toEqual({ type: 'gemCollected', index: 5 });
      expect(events[3]).toEqual({ type: 'lockCracked', index: 6 });
      expect(events[4]).toEqual({ type: 'combo', count: 1, multiplier: 1 });
      expect(events[5]).toMatchObject({ type: 'scored', delta: 101 }); // 1 cell + 100 base

      // Lock at (0,6) had hp 2, so it stays on board with hp 1
      expect(state.board[6]).toEqual({ color: 3, kind: 'lock', hp: 1 });
      // Gem was cleared
      expect(state.board[5]).toBeNull();
    });

    it('emits trayRefilled when the tray becomes empty', () => {
      const baseState = createGame({ seed: 10 });
      // Empty tray slots 1 and 2
      const testState = {
        ...baseState,
        tray: [{ id: 'line_1x1', color: 0 }, null, null],
      };

      const { state, events } = placePiece(testState, 0, 0, 0);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toEqual(['placed', 'scored', 'trayRefilled']);

      expect(events[2].type).toBe('trayRefilled');
      expect(events[2].pieces).toHaveLength(3);
      expect(state.tray.every((p) => p !== null)).toBe(true);
    });
  });

  describe('Simultaneous row and column clear', () => {
    it('clears row and col simultaneously, counting intersection cell once in cleared.cells', () => {
      let board = createBoard();
      const p1x1 = getPiece('line_1x1');

      // Cell at (5, 5) ensures board is not completely empty after clears
      board = boardPlacePiece(board, p1x1, 5, 5, 0);

      // Fill row 0 from col 1 to 7
      for (let c = 1; c < 8; c++) {
        board = boardPlacePiece(board, p1x1, 0, c, 1);
      }
      // Fill col 0 from row 1 to 7
      for (let r = 1; r < 8; r++) {
        board = boardPlacePiece(board, p1x1, r, 0, 2);
      }

      const testState = {
        ...createGame({ seed: 20 }),
        board,
        tray: [{ id: 'line_1x1', color: 0 }, null, null],
      };

      // Place at intersection (0, 0)
      const { state, events } = placePiece(testState, 0, 0, 0);

      const clearedEvent = events.find((e) => e.type === 'cleared');
      expect(clearedEvent).toBeDefined();
      expect(clearedEvent.rows).toEqual([0]);
      expect(clearedEvent.cols).toEqual([0]);
      expect(clearedEvent.linesCount).toBe(2);
      // Row 0 has 8 cells, Col 0 has 8 cells, intersection (0,0) is shared -> 15 unique cells
      expect(clearedEvent.cells).toHaveLength(15);
      expect(clearedEvent.cells).toContain(0);

      // Score for 2 lines is 300 base points + 1 cell placed = 301
      const scoredEvent = events.find((e) => e.type === 'scored');
      expect(scoredEvent.delta).toBe(301);
      expect(scoredEvent.breakdown.lines).toBe(300);

      // Verify row 0 and col 0 are now completely clear
      for (let c = 0; c < 8; c++) {
        expect(state.board[c]).toBeNull();
      }
      for (let r = 0; r < 8; r++) {
        expect(state.board[r * 8]).toBeNull();
      }

      expect(state.stats.linesCleared).toBe(2);
    });
  });

  describe('Combo increments and resets after 3 misses', () => {
    it('increments combo on consecutive clears and resets to 0 after 3 consecutive misses', () => {
      let state = createGame({ seed: 30 });

      // Move 1: clear a line -> combo = 1
      let b1 = createBoard();
      for (let c = 1; c < 8; c++) {
        b1 = boardPlacePiece(b1, getPiece('line_1x1'), 0, c, 1);
      }
      state = { ...state, board: b1, tray: [{ id: 'line_1x1', color: 1 }, null, null] };
      const res1 = placePiece(state, 0, 0, 0);
      expect(res1.state.combo).toBe(1);
      expect(res1.state.missStreak).toBe(0);
      expect(res1.state.stats.bestCombo).toBe(1);

      // Move 2: clear another line -> combo = 2
      let b2 = res1.state.board;
      for (let c = 1; c < 8; c++) {
        b2 = boardPlacePiece(b2, getPiece('line_1x1'), 1, c, 1);
      }
      state = { ...res1.state, board: b2, tray: [{ id: 'line_1x1', color: 1 }, null, null] };
      const res2 = placePiece(state, 0, 1, 0);
      expect(res2.state.combo).toBe(2);
      expect(res2.state.missStreak).toBe(0);
      expect(res2.state.stats.bestCombo).toBe(2);

      // Move 3: miss 1 -> combo stays 2, missStreak = 1
      state = { ...res2.state, tray: [{ id: 'line_1x1', color: 1 }, null, null] };
      const res3 = placePiece(state, 0, 5, 5);
      expect(res3.state.combo).toBe(2);
      expect(res3.state.missStreak).toBe(1);

      // Move 4: miss 2 -> combo stays 2, missStreak = 2
      state = { ...res3.state, tray: [{ id: 'line_1x1', color: 1 }, null, null] };
      const res4 = placePiece(state, 0, 6, 6);
      expect(res4.state.combo).toBe(2);
      expect(res4.state.missStreak).toBe(2);

      // Move 5: miss 3 -> combo resets to 0, missStreak = 3
      state = { ...res4.state, tray: [{ id: 'line_1x1', color: 1 }, null, null] };
      const res5 = placePiece(state, 0, 7, 7);
      expect(res5.state.combo).toBe(0);
      expect(res5.state.missStreak).toBe(3);
      expect(res5.state.stats.bestCombo).toBe(2);

      // Move 6: clear after reset -> combo becomes 1, missStreak = 0
      let b6 = res5.state.board;
      for (let c = 1; c < 8; c++) {
        b6 = boardPlacePiece(b6, getPiece('line_1x1'), 2, c, 1);
      }
      state = { ...res5.state, board: b6, tray: [{ id: 'line_1x1', color: 1 }, null, null] };
      const res6 = placePiece(state, 0, 2, 0);
      expect(res6.state.combo).toBe(1);
      expect(res6.state.missStreak).toBe(0);
    });
  });

  describe('Mono bonus', () => {
    it('detects monochromatic row and awards +500 bonus per mono line', () => {
      let board = createBoard();
      const p1x1 = getPiece('line_1x1');
      // Cell at (5, 5) ensures board is not completely empty after clears
      board = boardPlacePiece(board, p1x1, 5, 5, 0);

      // Fill row 0 cols 0 to 6 with color 3
      for (let c = 0; c < 7; c++) {
        board = boardPlacePiece(board, p1x1, 0, c, 3);
      }

      const state = {
        ...createGame({ seed: 40 }),
        board,
        tray: [{ id: 'line_1x1', color: 3 }, null, null],
      };

      // Place color 3 at (0, 7) completing mono row 0
      const { events, state: nextState } = placePiece(state, 0, 0, 7);

      const cleared = events.find((e) => e.type === 'cleared');
      expect(cleared.mono).toEqual(['row-0']);

      const scored = events.find((e) => e.type === 'scored');
      // 1 cell (1) + lines (100) + mono (500) = 601
      expect(scored.breakdown.mono).toBe(500);
      expect(scored.delta).toBe(601);
      expect(nextState.stats.monoLines).toBe(1);
    });

    it('does not award mono bonus when line contains mixed colors', () => {
      let board = createBoard();
      const p1x1 = getPiece('line_1x1');
      // Cell at (5, 5) ensures board is not completely empty after clears
      board = boardPlacePiece(board, p1x1, 5, 5, 0);

      for (let c = 0; c < 7; c++) {
        board = boardPlacePiece(board, p1x1, 0, c, 3);
      }

      const state = {
        ...createGame({ seed: 40 }),
        board,
        tray: [{ id: 'line_1x1', color: 4 }, null, null], // Different color 4
      };

      const { events, state: nextState } = placePiece(state, 0, 0, 7);

      const cleared = events.find((e) => e.type === 'cleared');
      expect(cleared.mono).toEqual([]);

      const scored = events.find((e) => e.type === 'scored');
      expect(scored.breakdown.mono).toBe(0);
      expect(scored.delta).toBe(101); // 1 cell + 100 lines
      expect(nextState.stats.monoLines).toBe(0);
    });
  });

  describe('Perfect clear bonus', () => {
    it('detects perfect clear and adds +2000 not multiplied by combo', () => {
      let board = createBoard();
      for (let c = 0; c < 7; c++) {
        board = boardPlacePiece(board, getPiece('line_1x1'), 0, c, 2);
      }

      // Combo is already 2 (multiplier will become 2.0 when incremented to combo 3)
      const state = {
        ...createGame({ seed: 50 }),
        board,
        combo: 2,
        tray: [{ id: 'line_1x1', color: 0 }, null, null],
      };

      const { events, state: nextState } = placePiece(state, 0, 0, 7);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain('perfectClear');
      // perfectClear event is emitted between combo and scored
      const comboIdx = eventTypes.indexOf('combo');
      const pcIdx = eventTypes.indexOf('perfectClear');
      const scoredIdx = eventTypes.indexOf('scored');
      expect(comboIdx).toBeLessThan(pcIdx);
      expect(pcIdx).toBeLessThan(scoredIdx);

      const scored = events.find((e) => e.type === 'scored');
      // 1 line base: 100
      // combo 3 multiplier: 2.0 -> clears score = 100 * 2.0 = 200
      // perfect clear: +2000 (NOT multiplied)
      // cells: 1
      // total delta = 1 + 200 + 2000 = 2201
      expect(scored.breakdown.clears).toBe(200);
      expect(scored.breakdown.perfectClear).toBe(2000);
      expect(scored.delta).toBe(2201);
      expect(nextState.stats.perfectClears).toBe(1);
    });
  });

  describe('Hold slot mechanics', () => {
    it('refills the tray when holding its last piece into an empty slot', () => {
      const last = { id: 'line_1x3', color: 2 };
      const state = createGame({
        seed: 7,
        initial: { board: createBoard(), tray: [null, last, null] },
      });

      const { state: next, events } = holdPiece(state, 1);

      expect(next.hold).toEqual(last);
      expect(next.tray.every((p) => p !== null)).toBe(true);
      expect(events.map((e) => e.type)).toEqual(['held', 'trayRefilled']);
      expect(events[1].pieces).toEqual(next.tray);
      expect(next.rngState).not.toBe(state.rngState);
      expect(next.over).toBe(false);
      // input not mutated
      expect(state.tray).toEqual([null, last, null]);
    });

    it('does not refill on a swap that leaves a piece in the tray', () => {
      const a = { id: 'line_1x1', color: 0 };
      const b = { id: 'line_1x2', color: 1 };
      const state = {
        ...createGame({
          seed: 7,
          initial: { board: createBoard(), tray: [null, a, null] },
        }),
        hold: b,
      };
      const { state: next, events } = holdPiece(state, 1);
      expect(next.tray).toEqual([null, b, null]);
      expect(events.some((e) => e.type === 'trayRefilled')).toBe(false);
    });

    it('allows hold once per placement, supports swap, and held piece does not count toward refill', () => {
      const initialState = createGame({ seed: 60 });
      const [p0, p1, p2] = initialState.tray;

      // 1. Hold first piece
      const hold1 = holdPiece(initialState, 0);
      expect(hold1.events).toEqual([
        { type: 'held', piece: { id: p0.id, color: p0.color }, swappedOut: null },
      ]);
      expect(hold1.state.tray).toEqual([null, p1, p2]);
      expect(hold1.state.hold).toEqual({ id: p0.id, color: p0.color });
      expect(hold1.state.holdUsed).toBe(true);
      expect(hold1.state.stats.holdsUsed).toBe(1);

      // 2. Cannot hold again before placing
      const holdAgain = holdPiece(hold1.state, 1);
      expect(holdAgain.state).toBe(hold1.state);
      expect(holdAgain.events).toEqual([]);

      // 3. Place piece 1 onto board -> holdUsed resets to false
      const place1 = placePiece(hold1.state, 1, 0, 0);
      expect(place1.state.holdUsed).toBe(false);
      expect(place1.state.tray).toEqual([null, null, p2]);
      expect(place1.state.hold).toEqual({ id: p0.id, color: p0.color });

      // 4. Hold swap: hold piece 2, swapping p0 back into tray
      const swapRes = holdPiece(place1.state, 2);
      expect(swapRes.events).toEqual([
        {
          type: 'held',
          piece: { id: p2.id, color: p2.color },
          swappedOut: { id: p0.id, color: p0.color },
        },
      ]);
      expect(swapRes.state.tray).toEqual([null, null, { id: p0.id, color: p0.color }]);
      expect(swapRes.state.hold).toEqual({ id: p2.id, color: p2.color });
      expect(swapRes.state.holdUsed).toBe(true);

      // 5. Place p0 from tray: tray becomes empty, hold still has p2
      // The tray must refill even though hold is occupied!
      const placeTrayLast = placePiece(swapRes.state, 2, 4, 4);
      expect(placeTrayLast.state.tray.every((p) => p !== null)).toBe(true);
      expect(placeTrayLast.state.hold).toEqual({ id: p2.id, color: p2.color });
      const refilledEvent = placeTrayLast.events.find((e) => e.type === 'trayRefilled');
      expect(refilledEvent).toBeDefined();

      // 6. Place piece from hold (l_tetromino_90 fits at row 6, col 0)
      const placeFromHold = placePiece(placeTrayLast.state, 'hold', 6, 0);
      expect(placeFromHold.state.hold).toBeNull();
      // Tray does not refill because it was not empty
      expect(placeFromHold.events.some((e) => e.type === 'trayRefilled')).toBe(false);
    });
  });

  describe('Game over detection', () => {
    it('isGameOver returns true when no tray piece and no held piece fits', () => {
      let board = createBoard();
      const p1x1 = getPiece('line_1x1');
      // Fill entire board except cell 0
      for (let i = 1; i < 64; i++) {
        board = boardPlacePiece(board, p1x1, Math.floor(i / 8), i % 8, 1);
      }

      // Tray has square_2x2 which cannot fit in 1 cell
      const stateNoFit = {
        ...createGame({ seed: 70 }),
        board,
        tray: [{ id: 'square_2x2', color: 0 }, null, null],
        hold: null,
      };

      expect(isGameOver(stateNoFit)).toBe(true);

      // If hold has line_1x1, it can fit!
      const stateWithFitInHold = {
        ...stateNoFit,
        hold: { id: 'line_1x1', color: 2 },
      };
      expect(isGameOver(stateWithFitInHold)).toBe(false);

      // If hold also cannot fit (e.g. square_3x3), it's game over
      const stateHoldNoFit = {
        ...stateNoFit,
        hold: { id: 'square_3x3', color: 2 },
      };
      expect(isGameOver(stateHoldNoFit)).toBe(true);
    });

    it('emits gameOver event with reason noMoves when placement leaves no valid moves', () => {
      let board = createBoard();
      const p1x1 = getPiece('line_1x1');
      // Fill alternating cells in checkerboard pattern so no row/col clears, but no 2x2 fits
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 2 === 1) {
            board = boardPlacePiece(board, p1x1, r, c, 1);
          }
        }
      }

      // Piece 0 is line_1x1, piece 1 is square_2x2, hold is square_2x2
      const state = {
        ...createGame({ seed: 75 }),
        board,
        tray: [
          { id: 'line_1x1', color: 0 },
          { id: 'square_2x2', color: 1 },
          null,
        ],
        hold: { id: 'square_2x2', color: 2 },
      };

      // Place line_1x1 at cell (0, 0).
      // Remaining piece in tray is square_2x2, and hold has square_2x2. Neither fits!
      const { state: nextState, events } = placePiece(state, 0, 0, 0);

      expect(nextState.over).toBe(true);
      expect(nextState.overReason).toBe('noMoves');
      expect(events[events.length - 1]).toEqual({
        type: 'gameOver',
        reason: 'noMoves',
      });
    });
  });

  describe('Serialization and Determinism', () => {
    it('serializes and restores game state perfectly', () => {
      const g1 = createGame({ seed: 80 });
      const p1 = placePiece(g1, 0, 0, 0);
      const h1 = holdPiece(p1.state, 1);

      const serialized = serializeGame(h1.state);
      expect(typeof serialized).toBe('string');

      const restored = restoreGame(serialized);
      expect(restored).toEqual(h1.state);
    });

    it('continues gameplay with identical results after serialize/restore', () => {
      const g1 = createGame({ seed: 90 });
      const resA1 = placePiece(g1, 0, 0, 0);

      // Serialize and restore
      const json = serializeGame(resA1.state);
      const restored = restoreGame(json);

      // Continue on original vs restored
      const contA = placePiece(resA1.state, 1, 2, 2);
      const contB = placePiece(restored, 1, 2, 2);

      expect(contB.state).toEqual(contA.state);
      expect(contB.events).toEqual(contA.events);

      // Next placement triggers refill
      const refillA = placePiece(contA.state, 2, 4, 4);
      const refillB = placePiece(contB.state, 2, 4, 4);

      expect(refillB.state).toEqual(refillA.state);
      expect(refillB.events).toEqual(refillA.events);
      expect(refillB.state.tray).toEqual(refillA.state.tray);
    });

    it('ensures determinism: same seed and same moves give the same final state', () => {
      const game1 = createGame({ seed: 12345 });
      const game2 = createGame({ seed: 12345 });

      expect(game1).toEqual(game2);

      const r1a = placePiece(game1, 0, 0, 0);
      const r2a = placePiece(game2, 0, 0, 0);
      expect(r1a.state).toEqual(r2a.state);
      expect(r1a.events).toEqual(r2a.events);

      const r1b = placePiece(r1a.state, 1, 2, 2);
      const r2b = placePiece(r2a.state, 1, 2, 2);
      expect(r1b.state).toEqual(r2b.state);
      expect(r1b.events).toEqual(r2b.events);
    });
  });

  describe('Classic mode configuration and helper', () => {
    it('exports classicConfig and createClassicGame', () => {
      expect(classicConfig).toEqual({
        mode: 'classic',
        hasTimer: false,
        hasMoveLimit: false,
      });

      const game = createClassicGame(555);
      expect(game.mode).toBe('classic');
      expect(game.board).toHaveLength(64);
      expect(game.tray).toHaveLength(3);
    });
  });
});
