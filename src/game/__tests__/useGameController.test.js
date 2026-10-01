import { createGameController } from '../useGameController';
import { useProgress } from '../../store/useProgress';
import { serializeGame, createGame } from '../../engine/game';

describe('createGameController', () => {
  beforeEach(() => {
    useProgress.getState().resetProgress();
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
});
