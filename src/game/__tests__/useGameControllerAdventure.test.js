import { createGameController } from '../useGameController';
import { useProgress } from '../../store/useProgress';
import { useSettings } from '../../store/useSettings';
import { useToast } from '../../store/useToast';
import { createBoard } from '../../engine/board';

describe('useGameController Adventure Mode', () => {
  beforeEach(() => {
    useProgress.getState().resetProgress();
    useSettings.getState().resetSettings();
    useToast.getState().clearAll();
  });

  test('initializes with level 1 from levels.json when mode is adventure', () => {
    const controller = createGameController({
      mode: 'adventure',
      level: 1,
    });

    const state = controller.state;
    expect(state.mode).toBe('adventure');
    expect(state.levelId).toBe(1);
    expect(state.level).toBe(1);
    expect(state.goals).toBeDefined();
    expect(state.goals.length).toBeGreaterThan(0);
    expect(state.completed).toBe(false);
    expect(state.over).toBe(false);

    // Adventure does not save inProgress
    expect(useProgress.getState().inProgress.adventure).toBeUndefined();
  });

  test('valid placement decrements movesLeft on levels with move limits', () => {
    const customLevel = {
      id: 99,
      seed: 99,
      board: Array(8).fill('........'),
      goals: [{ type: 'score', value: 5000 }],
      moves: 10,
      stars: [5000, 10000, 15000],
    };

    const controller = createGameController({
      mode: 'adventure',
      level: customLevel,
    });

    expect(controller.state.movesLeft).toBe(10);
    const placed = controller.place(0, 0, 0);
    expect(placed).toBe(true);
    expect(controller.state.movesLeft).toBe(9);
  });

  test('completing a level saves stars, best score, unlocks next level, and evaluates achievements', () => {
    // Row 0 has 7 cells filled, col 7 is empty
    const board = createBoard();
    for (let c = 0; c < 7; c++) {
      board[c] = { color: 0, kind: 'normal', hp: 1 };
    }

    const customLevel = {
      id: 10,
      seed: 10,
      board: Array(8).fill('........'),
      goals: [{ type: 'lines', value: 1 }],
      moves: 5,
      stars: [100, 200, 300],
    };

    const customTray = [
      { id: 'line_1x1', color: 1 },
      { id: 'line_1x1', color: 2 },
      { id: 'line_1x1', color: 3 },
    ];

    const controller = createGameController({
      mode: 'adventure',
      level: customLevel,
      initial: { board, tray: customTray },
    });

    expect(useProgress.getState().adventure.unlocked).toBe(1);
    expect(useProgress.getState().adventure.stars[10]).toBeUndefined();

    // Place line_1x1 at (0, 7) to clear row 0
    const placed = controller.place(0, 0, 7);
    expect(placed).toBe(true);

    const finalState = controller.state;
    expect(finalState.over).toBe(true);
    expect(finalState.completed).toBe(true);
    expect(finalState.overReason).toBe('levelComplete');
    expect(finalState.stars).toBeGreaterThanOrEqual(1);

    // 1. Stars saved to useProgress
    const adventure = useProgress.getState().adventure;
    expect(adventure.stars[10]).toBe(finalState.stars);

    // 2. Best score saved
    expect(adventure.best[10]).toBe(finalState.score);

    // 3. Next level unlocked (level 10 complete -> level 11 unlocked)
    expect(adventure.unlocked).toBe(11);

    // 4. Achievement adv_10 unlocked!
    expect(useProgress.getState().achievements.adv_10).toBeDefined();

    // 5. In-progress game is not saved
    expect(useProgress.getState().inProgress.adventure).toBeUndefined();
  });

  test('replaying a completed level keeps the maximum stars and unlocked level', () => {
    // Initial state: level 1 already has 3 stars, and level 5 is unlocked
    useProgress.getState().setAdventureProgress({
      unlocked: 5,
      levelId: 1,
      stars: 3,
      score: 5000,
    });

    const board = createBoard();
    board[5 * 8 + 5] = { color: 0, kind: 'normal', hp: 1 };
    for (let c = 0; c < 7; c++) {
      board[c] = { color: 0, kind: 'normal', hp: 1 };
    }

    const customLevel = {
      id: 1,
      seed: 1,
      board: Array(8).fill('........'),
      goals: [{ type: 'lines', value: 1 }],
      moves: 5,
      stars: [100, 200, 300],
    };

    const customTray = [
      { id: 'line_1x1', color: 1 },
      { id: 'line_1x1', color: 2 },
      { id: 'line_1x1', color: 3 },
    ];

    const controller = createGameController({
      mode: 'adventure',
      level: customLevel,
      initial: { board, tray: customTray },
    });

    // Complete level 1 again with lower score (101 pts -> 1 star)
    controller.place(0, 0, 7);
    expect(controller.state.completed).toBe(true);
    expect(controller.state.stars).toBe(1);

    // Should still have 3 stars (kept maximum!) and unlocked remains 5
    const adventure = useProgress.getState().adventure;
    expect(adventure.stars[1]).toBe(3);
    expect(adventure.best[1]).toBe(5000);
    expect(adventure.unlocked).toBe(5);
  });

  test('fails with outOfMoves when moves limit is reached without completing goals', () => {
    const customLevel = {
      id: 12,
      seed: 12,
      board: Array(8).fill('........'),
      goals: [{ type: 'score', value: 5000 }],
      moves: 1,
      stars: [5000, 10000, 15000],
    };

    const customTray = [
      { id: 'line_1x1', color: 1 },
      { id: 'line_1x1', color: 2 },
      { id: 'line_1x1', color: 3 },
    ];

    const controller = createGameController({
      mode: 'adventure',
      level: customLevel,
      initial: { board: createBoard(), tray: customTray },
    });

    // Place 1 piece: score becomes 1 (< 5000), movesLeft becomes 0
    controller.place(0, 0, 0);

    expect(controller.state.over).toBe(true);
    expect(controller.state.overReason).toBe('outOfMoves');
    expect(controller.state.completed).toBe(false);

    // Did not unlock next level or award stars
    expect(useProgress.getState().adventure.stars[12]).toBeUndefined();
  });

  test('restart resets goals and board for that level', () => {
    const customLevel = {
      id: 3,
      seed: 3,
      board: Array(8).fill('........'),
      goals: [{ type: 'score', value: 500 }],
      moves: 5,
      stars: [500, 1000, 1500],
    };

    const controller = createGameController({
      mode: 'adventure',
      level: customLevel,
    });

    controller.place(0, 0, 0);
    expect(controller.state.movesLeft).toBe(4);
    expect(controller.state.score).toBeGreaterThan(0);

    controller.restart();
    expect(controller.state.movesLeft).toBe(5);
    expect(controller.state.score).toBe(0);
    expect(controller.state.goals[0].current).toBe(0);
  });
});
