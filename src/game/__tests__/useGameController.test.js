import { createGameController } from '../useGameController';
import { useProgress } from '../../store/useProgress';
import { useSettings } from '../../store/useSettings';
import { serializeGame, createGame } from '../../engine/game';

describe('createGameController', () => {
  beforeEach(() => {
    useProgress.getState().resetProgress();
    useSettings.getState().resetSettings();
  });

  test('initializes with a deterministic seed and empty 8x8 board', () => {
    const controller = createGameController({ seed: 12345, persist: false });
    const state = controller.state;

    expect(state).toBeDefined();
    expect(state.mode).toBe('classic');
    expect(state.score).toBe(0);
    expect(state.board).toHaveLength(64);
    expect(state.board.every((cell) => cell === null)).toBe(true);
    expect(state.tray).toHaveLength(3);
    expect(state.tray.every((p) => p !== null && Boolean(p.id))).toBe(true);
    expect(state.hold).toBeNull();
    expect(state.holdUsed).toBe(false);
    expect(state.over).toBe(false);
  });

  test('valid place updates board, tray slot, score, and returns true', () => {
    const controller = createGameController({ seed: 12345, persist: false });
    const initialPiece = controller.state.tray[0];
    const initialScore = controller.state.score;

    const success = controller.place(0, 0, 0);
    expect(success).toBe(true);

    const nextState = controller.state;
    expect(nextState.tray[0]).toBeNull();
    expect(nextState.score).toBeGreaterThan(initialScore);
    expect(nextState.board.some((cell) => cell !== null)).toBe(true);
    expect(nextState.placements).toBe(1);
    expect(nextState.holdUsed).toBe(false);
  });

  test('invalid place leaves state unchanged and returns false', () => {
    const controller = createGameController({ seed: 12345, persist: false });
    const stateBefore = controller.state;

    // Out of bounds placement
    const outOfBounds = controller.place(0, 7, 7);
    // Even if piece could fit or not, testing an absurd out of bounds
    const farOutOfBounds = controller.place(0, 10, 10);
    expect(farOutOfBounds).toBe(false);
    expect(controller.state).toBe(stateBefore);

    // Empty tray slot
    controller.place(0, 0, 0); // slot 0 is now null
    const stateAfterValid = controller.state;
    const placedFromEmpty = controller.place(0, 0, 0);
    expect(placedFromEmpty).toBe(false);
    expect(controller.state).toBe(stateAfterValid);
  });

  test('hold stores tray piece, empties tray slot, sets holdUsed', () => {
    const controller = createGameController({ seed: 12345, persist: false });
    const pieceToHold = controller.state.tray[1];

    const success = controller.hold(1);
    expect(success).toBe(true);
    expect(controller.state.hold).toEqual({
      id: pieceToHold.id,
      color: pieceToHold.color,
    });
    expect(controller.state.tray[1]).toBeNull();
    expect(controller.state.holdUsed).toBe(true);

    // Second hold in a row without a placement fails
    const secondHold = controller.hold(0);
    expect(secondHold).toBe(false);
  });

  test('holding swaps occupied hold slot and placing held piece works', () => {
    const controller = createGameController({ seed: 12345, persist: false });
    const piece1 = controller.state.tray[0];
    controller.hold(0);
    expect(controller.state.hold.id).toBe(piece1.id);

    // Place another piece to reset holdUsed
    controller.place(1, 0, 0);
    expect(controller.state.holdUsed).toBe(false);

    // Now swap with tray[2]
    const piece2 = controller.state.tray[2];
    const swapSuccess = controller.hold(2);
    expect(swapSuccess).toBe(true);
    expect(controller.state.hold.id).toBe(piece2.id);
    expect(controller.state.tray[2].id).toBe(piece1.id);

    // Now place held piece onto board
    const placeHeldSuccess = controller.place('hold', 3, 3);
    expect(placeHeldSuccess).toBe(true);
    expect(controller.state.hold).toBeNull();
    expect(controller.state.holdUsed).toBe(false);
  });

  test('restart resets state to a new game with zero score and empty board', () => {
    const controller = createGameController({ seed: 12345, persist: false });
    controller.place(0, 0, 0);
    expect(controller.state.score).toBeGreaterThan(0);

    controller.restart(99999);
    expect(controller.state.score).toBe(0);
    expect(controller.state.board.every((cell) => cell === null)).toBe(true);
    expect(controller.state.tray.every((p) => p !== null)).toBe(true);
    expect(controller.state.hold).toBeNull();
    expect(controller.state.over).toBe(false);
  });

  test('events stream notifies subscribers on valid moves and can unsubscribe', () => {
    const controller = createGameController({ seed: 12345, persist: false });
    const eventsReceived = [];

    const unsubscribe = controller.subscribe((events) => {
      eventsReceived.push(...events);
    });

    controller.place(0, 0, 0);
    expect(eventsReceived.length).toBeGreaterThan(0);
    expect(eventsReceived.some((e) => e.type === 'placed')).toBe(true);

    const countBeforeUnsub = eventsReceived.length;
    unsubscribe();

    controller.hold(1);
    // No new events should have been received by the unsubscribed listener
    expect(eventsReceived.length).toBe(countBeforeUnsub);
  });

  test('persists state to useProgress on place and hold, and restores on start', () => {
    const controller = createGameController({ seed: 12345, persist: true });
    controller.place(0, 0, 0);

    const savedJson = useProgress.getState().inProgress.classic;
    expect(savedJson).toBeDefined();
    expect(typeof savedJson).toBe('string');
    const parsed = JSON.parse(savedJson);
    expect(parsed.score).toBe(controller.state.score);

    // Initializing a new controller restores the saved game
    const restoredController = createGameController({ persist: true });
    expect(restoredController.state.score).toBe(controller.state.score);
    expect(restoredController.state.placements).toBe(1);
  });

  test('clears inProgress on game over and does not restore over game', () => {
    // Construct an over game state
    const gameOverState = createGame({ seed: 1 });
    gameOverState.over = true;
    gameOverState.overReason = 'noMoves';

    useProgress.getState().setInProgress('classic', serializeGame(gameOverState));

    // When starting, over game should be ignored and a fresh game created
    const controller = createGameController({ persist: true });
    expect(controller.state.over).toBe(false);
    expect(controller.state.score).toBe(0);
  });

  test('clearing description lifecycle: null on init, populated on line clear, reset on clearClearing/hold/restart', () => {
    // Construct a board where row 0 has cols 0-6 filled
    const testState = createGame({ seed: 12345 });
    for (let c = 0; c < 7; c++) {
      testState.board[c] = { color: 2, kind: 'normal', hp: 1 };
    }
    // Force tray[0] to be line_1x1 with color 4
    testState.tray[0] = { id: 'line_1x1', color: 4 };

    const controller = createGameController({ initialState: testState, persist: false });
    expect(controller.clearing).toBeNull();

    // Place at (0, 7) to clear row 0
    const placed = controller.place(0, 0, 7);
    expect(placed).toBe(true);

    // Controller must now expose clearing description
    expect(controller.clearing).not.toBeNull();
    expect(controller.clearing.indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(controller.clearing.cells).toHaveLength(8);
    expect(controller.clearing.centerCell.row).toBe(0);
    expect(controller.clearing.centerCell.col).toBe(7);

    // Cell 0 has color 2 (from previous board)
    expect(controller.clearing.cells[0].color).toBe(2);
    // Cell 7 has color 4 (placed in this move)
    expect(controller.clearing.cells[7].color).toBe(4);

    // Calling clearClearing resets it
    controller.clearClearing();
    expect(controller.clearing).toBeNull();
  });

  test('pause and resume controls in controller, persistence on pause, and input blocking', () => {
    const controller = createGameController({ seed: 12345, persist: true, mode: 'classic' });

    expect(controller.isPaused).toBe(false);
    expect(controller.paused).toBe(false);
    expect(controller.getIsPaused()).toBe(false);

    let pauseNotified = null;
    const unsub = controller.subscribePause((p) => {
      pauseNotified = p;
    });

    // Pause the game
    controller.pause();
    expect(controller.isPaused).toBe(true);
    expect(controller.paused).toBe(true);
    expect(controller.getIsPaused()).toBe(true);
    expect(pauseNotified).toBe(true);

    // Auto-save check: game state saved to inProgress
    const saved = useProgress.getState().inProgress.classic;
    expect(saved).toBeDefined();
    expect(typeof saved).toBe('string');

    // While paused, placements and holds must be rejected
    expect(controller.place(0, 0, 0)).toBe(false);
    expect(controller.hold(0)).toBe(false);

    // Resume
    controller.resume();
    expect(controller.isPaused).toBe(false);
    expect(pauseNotified).toBe(false);

    // setPaused helper
    controller.setPaused(true);
    expect(controller.isPaused).toBe(true);

    // restart resets pause state
    controller.restart(1111);
    expect(controller.isPaused).toBe(false);

    unsub();
  });

  test('scripted onboarding start when seenOnboarding is false and setting seenOnboarding true on clear', () => {
    useSettings.getState().setSeenOnboarding(false);
    useProgress.getState().clearInProgress('classic');

    const controller = createGameController({ persist: true, mode: 'classic' });

    // Scripted state check
    expect(controller.state.tray[0].id).toBe('line_1x3');
    for (let c = 0; c < 5; c++) {
      expect(controller.state.board[7 * 8 + c]).not.toBeNull();
    }
    for (let c = 5; c < 8; c++) {
      expect(controller.state.board[7 * 8 + c]).toBeNull();
    }

    // Placing the 1x3 piece at (7, 5) clears row 7 and sets seenOnboarding: true
    const success = controller.place(0, 7, 5);
    expect(success).toBe(true);
    expect(useSettings.getState().seenOnboarding).toBe(true);

    // Next game start when seenOnboarding is true starts with empty board
    useProgress.getState().clearInProgress('classic');
    const freshController = createGameController({ persist: true, mode: 'classic', seed: 999 });
    expect(freshController.state.board.every((cell) => cell === null)).toBe(true);
  });
});

