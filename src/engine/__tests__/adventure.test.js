import {
  parseLevel,
  createAdventureGame,
  placeAdventure,
  validateLevel,
  calculateStars,
  adventureConfig,
  serializeAdventureGame,
  restoreAdventureGame,
  holdPiece,
} from '../modes/adventure';
import { createBoard, BOARD_SIZE } from '../board';
import { createRng } from '../rng';
import levelsData from '../../../assets/levels/levels.json';

describe('Adventure Mode Engine', () => {
  describe('Configuration', () => {
    it('exports frozen adventure configuration', () => {
      expect(adventureConfig).toEqual({
        mode: 'adventure',
        hasTimer: false,
        hasMoveLimit: true,
      });
      expect(Object.isFrozen(adventureConfig)).toBe(true);
    });
  });

  describe('parseLevel', () => {
    it('parses each character correctly (., X, G, L)', () => {
      const level = {
        id: 1,
        seed: 42,
        board: [
          ".XGL....",
          "........",
          "........",
          "........",
          "........",
          "........",
          "........",
          "........",
        ],
      };

      const board = parseLevel(level);
      expect(board).toHaveLength(64);

      // '.' -> null
      expect(board[0]).toBeNull();

      // 'X' -> normal block with hp 1 and seed-generated color (0-5)
      expect(board[1]).toEqual({
        color: expect.any(Number),
        kind: 'normal',
        hp: 1,
      });
      expect(board[1].color).toBeGreaterThanOrEqual(0);
      expect(board[1].color).toBeLessThan(6);

      // 'G' -> gem block with hp 1
      expect(board[2]).toEqual({
        color: expect.any(Number),
        kind: 'gem',
        hp: 1,
      });

      // 'L' -> lock block with hp 2
      expect(board[3]).toEqual({
        color: expect.any(Number),
        kind: 'lock',
        hp: 2,
      });

      // Rest are null
      for (let i = 4; i < 64; i++) {
        expect(board[i]).toBeNull();
      }
    });

    it('assigns deterministic colors to X using the level seed', () => {
      const levelA = {
        seed: 9999,
        board: [
          "XXXX....",
          "........",
          "........",
          "........",
          "........",
          "........",
          "........",
          "........",
        ],
      };
      const levelB = {
        seed: 9999,
        board: [
          "XXXX....",
          "........",
          "........",
          "........",
          "........",
          "........",
          "........",
          "........",
        ],
      };

      const boardA = parseLevel(levelA);
      const boardB = parseLevel(levelB);

      expect(boardA[0]).toEqual(boardB[0]);
      expect(boardA[1]).toEqual(boardB[1]);
      expect(boardA[2]).toEqual(boardB[2]);
      expect(boardA[3]).toEqual(boardB[3]);

      // Check against rng directly
      const rng = createRng(9999);
      expect(boardA[0].color).toBe(rng.int(6));
      expect(boardA[1].color).toBe(rng.int(6));
    });

    it('handles empty or missing level safely', () => {
      const b1 = parseLevel(null);
      expect(b1).toHaveLength(64);
      expect(b1.every((c) => c === null)).toBe(true);

      const b2 = parseLevel({});
      expect(b2).toHaveLength(64);
      expect(b2.every((c) => c === null)).toBe(true);
    });
  });

  describe('createAdventureGame', () => {
    it('creates game state with adventure mode, levelId, goals progress, and movesLeft', () => {
      const level = {
        id: 7,
        seed: 1234,
        board: [
          "........",
          "........",
          "........",
          "....G...",
          "....L...",
          "........",
          "........",
          "........",
        ],
        goals: [{ type: 'gems' }, { type: 'score', value: 1000 }],
        moves: 15,
        stars: [1000, 2000, 3000],
      };

      const game = createAdventureGame(level);

      expect(game.mode).toBe('adventure');
      expect(game.levelId).toBe(7);
      expect(game.level).toBe(7);
      expect(game.movesLeft).toBe(15);
      expect(game.starsThresholds).toEqual([1000, 2000, 3000]);
      expect(game.over).toBe(false);
      expect(game.completed).toBe(false);
      expect(game.stars).toBe(0);

      // Goals initialized
      expect(game.goals).toHaveLength(2);
      expect(game.goals[0]).toEqual({
        type: 'gems',
        target: 1, // 1 gem on board
        current: 0,
        completed: false,
      });
      expect(game.goals[1]).toEqual({
        type: 'score',
        target: 1000,
        current: 0,
        completed: false,
        value: 1000,
      });
    });

    it('sets movesLeft to null when level has no move limit', () => {
      const level = {
        id: 1,
        seed: 55,
        board: Array(8).fill("........"),
        goals: [{ type: 'lines', value: 1 }],
        stars: [100, 200, 300],
      };

      const game = createAdventureGame(level);
      expect(game.movesLeft).toBeNull();
    });
  });

  describe('Goal progress tracking', () => {
    it('tracks gems goal progress upon collecting gems', () => {
      // Row 0 has 7 filled cells, col 3 has a gem
      const board = createBoard();
      for (let c = 0; c < 7; c++) {
        if (c === 3) {
          board[c] = { color: 1, kind: 'gem', hp: 1 };
        } else {
          board[c] = { color: 0, kind: 'normal', hp: 1 };
        }
      }

      const level = {
        id: 5,
        seed: 10,
        board: Array(8).fill("........"),
        goals: [{ type: 'gems' }],
        stars: [200, 400, 600],
      };

      // Create game with initial row near clear
      const customTray = [
        { id: 'line_1x1', color: 2 },
        { id: 'line_1x1', color: 2 },
        { id: 'line_1x1', color: 2 },
      ];
      const game = createAdventureGame(level, {
        initial: { board, tray: customTray },
      });

      expect(game.goals[0].target).toBe(1);
      expect(game.goals[0].current).toBe(0);
      expect(game.goals[0].completed).toBe(false);

      // Place 1x1 at (0, 7) to clear row 0 containing the gem
      const { state: nextState, events } = placeAdventure(game, 0, 0, 7);

      expect(events.some((e) => e.type === 'gemCollected')).toBe(true);
      expect(events.some((e) => e.type === 'levelComplete')).toBe(true);
      expect(nextState.goals[0].current).toBe(1);
      expect(nextState.goals[0].completed).toBe(true);
      expect(nextState.completed).toBe(true);
      expect(nextState.over).toBe(true);
    });

    it('tracks lines goal progress upon clearing single and multiple lines', () => {
      // Setup rows 0 and 1 with 7 cells filled each
      const board = createBoard();
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 7; c++) {
          board[r * BOARD_SIZE + c] = { color: 0, kind: 'normal', hp: 1 };
        }
      }

      const level = {
        id: 2,
        seed: 20,
        board: Array(8).fill("........"),
        goals: [{ type: 'lines', value: 2 }],
        stars: [300, 600, 1000],
      };

      const customTray = [
        { id: 'line_2x1', color: 1 }, // 2 tall, 1 wide -> fills col 7 on rows 0 and 1
        { id: 'line_1x1', color: 2 },
        { id: 'line_1x1', color: 2 },
      ];

      const game = createAdventureGame(level, {
        initial: { board, tray: customTray },
      });

      expect(game.goals[0].current).toBe(0);
      expect(game.goals[0].target).toBe(2);

      // Place 2x1 at (0, 7) -> clears 2 lines simultaneously!
      const { state: nextState, events } = placeAdventure(game, 0, 0, 7);

      const clearEvent = events.find((e) => e.type === 'cleared');
      expect(clearEvent).toBeDefined();
      expect(clearEvent.linesCount).toBe(2);

      expect(nextState.goals[0].current).toBe(2);
      expect(nextState.goals[0].completed).toBe(true);
      expect(nextState.completed).toBe(true);
      expect(events.some((e) => e.type === 'levelComplete')).toBe(true);
    });

    it('tracks score goal progress as score increases', () => {
      const board = createBoard();
      const level = {
        id: 3,
        seed: 30,
        board: Array(8).fill("........"),
        goals: [{ type: 'score', value: 10 }],
        stars: [10, 20, 30],
      };

      const customTray = [
        { id: 'square_2x2', color: 1 }, // 4 cells = 4 points
        { id: 'square_2x2', color: 2 }, // 4 cells = 4 points
        { id: 'square_2x2', color: 3 }, // 4 cells = 4 points
      ];

      const game = createAdventureGame(level, {
        initial: { board, tray: customTray },
      });

      // Move 1: +4 points (total = 4, target = 10 -> not met)
      const res1 = placeAdventure(game, 0, 0, 0);
      expect(res1.state.score).toBe(4);
      expect(res1.state.goals[0].current).toBe(4);
      expect(res1.state.goals[0].completed).toBe(false);
      expect(res1.state.completed).toBe(false);

      // Move 2: +4 points (total = 8 -> not met)
      const res2 = placeAdventure(res1.state, 1, 0, 2);
      expect(res2.state.score).toBe(8);
      expect(res2.state.goals[0].current).toBe(8);
      expect(res2.state.goals[0].completed).toBe(false);

      // Move 3: +4 points (total = 12 >= 10 -> met!)
      const res3 = placeAdventure(res2.state, 2, 0, 4);
      expect(res3.state.score).toBe(12);
      expect(res3.state.goals[0].current).toBe(12);
      expect(res3.state.goals[0].completed).toBe(true);
      expect(res3.state.completed).toBe(true);
      expect(res3.events.some((e) => e.type === 'levelComplete')).toBe(true);
    });

    it('requires ALL goals to be completed for dual-goal levels', () => {
      const board = createBoard();
      // Cell at (5, 5) ensures board is not completely empty after row 0 clears (no Perfect Clear)
      board[5 * BOARD_SIZE + 5] = { color: 0, kind: 'normal', hp: 1 };

      for (let c = 0; c < 7; c++) {
        if (c === 0) {
          board[c] = { color: 1, kind: 'gem', hp: 1 };
        } else {
          board[c] = { color: 0, kind: 'normal', hp: 1 };
        }
      }

      const level = {
        id: 7,
        seed: 70,
        board: Array(8).fill("........"),
        goals: [{ type: 'gems' }, { type: 'score', value: 500 }],
        stars: [500, 1000, 1500],
      };

      const customTray = [
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 2 },
        { id: 'line_1x1', color: 3 },
      ];

      const game = createAdventureGame(level, {
        initial: { board, tray: customTray },
      });

      // Clear row 0: collects 1 gem, earns 101 points (1 cell + 100 clear)
      // Gems goal is met (1/1), but score goal is not (101 < 500)
      const res1 = placeAdventure(game, 0, 0, 7);
      expect(res1.state.score).toBe(101);
      expect(res1.state.goals[0].completed).toBe(true);
      expect(res1.state.goals[1].completed).toBe(false);
      expect(res1.state.completed).toBe(false);
      expect(res1.events.some((e) => e.type === 'levelComplete')).toBe(false);
    });
  });

  describe('Stars calculation and thresholds', () => {
    it('calculates stars accurately against thresholds with minimum 1 star', () => {
      const thresholds = [1000, 2000, 3000];

      // Below star 1 threshold -> minimum 1 star
      expect(calculateStars(0, thresholds)).toBe(1);
      expect(calculateStars(500, thresholds)).toBe(1);
      expect(calculateStars(999, thresholds)).toBe(1);

      // Star 1 threshold reached
      expect(calculateStars(1000, thresholds)).toBe(1);
      expect(calculateStars(1500, thresholds)).toBe(1);
      expect(calculateStars(1999, thresholds)).toBe(1);

      // Star 2 threshold reached
      expect(calculateStars(2000, thresholds)).toBe(2);
      expect(calculateStars(2500, thresholds)).toBe(2);
      expect(calculateStars(2999, thresholds)).toBe(2);

      // Star 3 threshold reached
      expect(calculateStars(3000, thresholds)).toBe(3);
      expect(calculateStars(50000, thresholds)).toBe(3);
    });

    it('emits levelComplete with awarded star count', () => {
      const board = createBoard();
      // Cell at (5, 5) ensures board is not completely empty after row 0 clears (no Perfect Clear)
      board[5 * BOARD_SIZE + 5] = { color: 0, kind: 'normal', hp: 1 };

      for (let c = 0; c < 7; c++) {
        board[c] = { color: 0, kind: 'normal', hp: 1 };
      }

      const level = {
        id: 1,
        seed: 1,
        board: Array(8).fill("........"),
        goals: [{ type: 'lines', value: 1 }],
        stars: [100, 200, 300],
      };

      const customTray = [
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 1 },
      ];

      const game = createAdventureGame(level, {
        initial: { board, tray: customTray },
      });

      // Clear row 0 -> 101 points (1 cell + 100 clear) >= 100 and < 200 -> 1 star
      const res = placeAdventure(game, 0, 0, 7);
      expect(res.state.score).toBe(101);
      const completeEvent = res.events.find((e) => e.type === 'levelComplete');
      expect(completeEvent).toBeDefined();
      expect(completeEvent.stars).toBe(1);
      expect(res.state.stars).toBe(1);
    });
  });

  describe('Move limit failure (outOfMoves)', () => {
    it('decrements movesLeft on each valid placement', () => {
      const level = {
        id: 12,
        seed: 12,
        board: Array(8).fill("........"),
        goals: [{ type: 'score', value: 1000 }],
        moves: 5,
        stars: [1000, 2000, 3000],
      };

      const game = createAdventureGame(level);
      expect(game.movesLeft).toBe(5);

      const res1 = placeAdventure(game, 0, 0, 0);
      expect(res1.state.movesLeft).toBe(4);

      // Invalid placement does NOT decrement movesLeft
      const invalid = placeAdventure(res1.state, 1, 99, 99);
      expect(invalid.state.movesLeft).toBe(4);
    });

    it('emits gameOver with outOfMoves when move limit is reached and goals are not met', () => {
      const level = {
        id: 12,
        seed: 12,
        board: Array(8).fill("........"),
        goals: [{ type: 'score', value: 5000 }],
        moves: 2,
        stars: [5000, 10000, 15000],
      };

      const customTray = [
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 1 },
      ];

      const game = createAdventureGame(level, {
        initial: { board: createBoard(), tray: customTray },
      });

      // Move 1 (movesLeft -> 1)
      const res1 = placeAdventure(game, 0, 0, 0);
      expect(res1.state.movesLeft).toBe(1);
      expect(res1.state.over).toBe(false);

      // Move 2 (movesLeft -> 0, score = 2 < 5000)
      const res2 = placeAdventure(res1.state, 1, 1, 1);
      expect(res2.state.movesLeft).toBe(0);
      expect(res2.state.over).toBe(true);
      expect(res2.state.overReason).toBe('outOfMoves');
      expect(res2.state.completed).toBe(false);

      const gameOverEvent = res2.events.find((e) => e.type === 'gameOver');
      expect(gameOverEvent).toBeDefined();
      expect(gameOverEvent.reason).toBe('outOfMoves');
    });

    it('awards levelComplete instead of outOfMoves if goals are met on the final move', () => {
      const board = createBoard();
      for (let c = 0; c < 7; c++) {
        board[c] = { color: 0, kind: 'normal', hp: 1 };
      }

      const level = {
        id: 12,
        seed: 12,
        board: Array(8).fill("........"),
        goals: [{ type: 'lines', value: 1 }],
        moves: 1, // Only 1 move allowed!
        stars: [100, 200, 300],
      };

      const customTray = [
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 1 },
        { id: 'line_1x1', color: 1 },
      ];

      const game = createAdventureGame(level, {
        initial: { board, tray: customTray },
      });

      // Move 1: clears row 0 on the very last move!
      const res = placeAdventure(game, 0, 0, 7);
      expect(res.state.movesLeft).toBe(0);
      expect(res.state.completed).toBe(true);
      expect(res.state.over).toBe(true);
      expect(res.state.overReason).toBe('levelComplete');

      expect(res.events.some((e) => e.type === 'levelComplete')).toBe(true);
      expect(res.events.some((e) => e.type === 'gameOver')).toBe(false);
    });
  });

  describe('Board blocked failure (noMoves)', () => {
    it('emits gameOver with noMoves when no pieces fit and goals are not met', () => {
      let board = createBoard();
      // Fill alternating cells in checkerboard pattern so no row/col clears, but no 2x2 fits
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if ((r + c) % 2 === 1) {
            board[r * BOARD_SIZE + c] = { color: 1, kind: 'normal', hp: 1 };
          }
        }
      }

      const level = {
        id: 9,
        seed: 9,
        board: Array(8).fill("........"),
        goals: [{ type: 'score', value: 100000 }],
        stars: [100000, 200000, 300000],
      };

      // Piece 0 is line_1x1, piece 1 is square_2x2, hold is square_2x2
      const customTray = [
        { id: 'line_1x1', color: 0 },
        { id: 'square_2x2', color: 1 },
        null,
      ];

      const game = createAdventureGame(level, {
        initial: { board, tray: customTray },
      });
      game.hold = { id: 'square_2x2', color: 2 };

      // Place line_1x1 at cell (0, 0).
      // Remaining piece in tray is square_2x2, and hold has square_2x2. Neither fits!
      const res = placeAdventure(game, 0, 0, 0);

      expect(res.state.over).toBe(true);
      expect(res.state.overReason).toBe('noMoves');
      expect(res.state.completed).toBe(false);

      const gameOverEvent = res.events.find((e) => e.type === 'gameOver');
      expect(gameOverEvent).toBeDefined();
      expect(gameOverEvent.reason).toBe('noMoves');
    });
  });

  describe('validateLevel', () => {
    it('returns problems for bad dimensions', () => {
      const badRows = {
        id: 1,
        seed: 1,
        board: ["........", "........"], // only 2 rows
        goals: [{ type: 'lines', value: 1 }],
        stars: [100, 200, 300],
      };
      const p1 = validateLevel(badRows);
      expect(p1.some((e) => e.includes('array of 8 rows'))).toBe(true);

      const badCols = {
        id: 1,
        seed: 1,
        board: Array(8).fill("...."), // only 4 chars
        goals: [{ type: 'lines', value: 1 }],
        stars: [100, 200, 300],
      };
      const p2 = validateLevel(badCols);
      expect(p2.some((e) => e.includes('8 characters'))).toBe(true);
    });

    it('returns problems for unknown characters', () => {
      const level = {
        id: 1,
        seed: 1,
        board: [
          ".XGL?...",
          "........",
          "........",
          "........",
          "........",
          "........",
          "........",
          "........",
        ],
        goals: [{ type: 'gems' }],
        stars: [100, 200, 300],
      };
      const p = validateLevel(level);
      expect(p.some((e) => e.includes('unknown character "?"'))).toBe(true);
    });

    it('returns problems for gems goal with no gems on board', () => {
      const level = {
        id: 1,
        seed: 1,
        board: Array(8).fill("........"), // no 'G'
        goals: [{ type: 'gems' }],
        stars: [100, 200, 300],
      };
      const p = validateLevel(level);
      expect(p.some((e) => e.includes('goal of gems specified but no gems'))).toBe(true);
    });

    it('returns problems for non-ascending stars', () => {
      const level1 = {
        id: 1,
        seed: 1,
        board: Array(8).fill("........"),
        goals: [{ type: 'lines', value: 1 }],
        stars: [500, 300, 1000], // not ascending
      };
      expect(validateLevel(level1).some((e) => e.includes('strictly ascending'))).toBe(true);

      const level2 = {
        id: 1,
        seed: 1,
        board: Array(8).fill("........"),
        goals: [{ type: 'lines', value: 1 }],
        stars: [500, 500, 1000], // duplicate
      };
      expect(validateLevel(level2).some((e) => e.includes('strictly ascending'))).toBe(true);
    });

    it('returns empty problems array for a valid level', () => {
      const validLevel = {
        id: 1,
        seed: 100,
        board: [
          "..G.....",
          "XXX.XX..",
          "....L...",
          "........",
          "........",
          "........",
          "........",
          "........",
        ],
        goals: [{ type: 'gems' }, { type: 'score', value: 1500 }],
        moves: 20,
        stars: [1500, 2500, 3500],
      };
      expect(validateLevel(validLevel)).toEqual([]);
    });
  });

  describe('Validation of levels in levels.json', () => {
    it('has at least 12 levels (50 at launch)', () => {
      expect(Array.isArray(levelsData)).toBe(true);
      expect(levelsData.length).toBeGreaterThanOrEqual(12);
    });

    it('ensures all 12 levels pass validateLevel with zero problems', () => {
      levelsData.forEach((level, index) => {
        const problems = validateLevel(level);
        expect(problems).toEqual([]);
        expect(level.id).toBe(index + 1);
      });
    });

    it('satisfies progression rules (1-4 basic/lines/score, 5-8 gems, 9-12 locks & move limit)', () => {
      // Levels 1-4: score or lines goal
      for (let i = 0; i < 4; i++) {
        const lvl = levelsData[i];
        expect(
          lvl.goals.some((g) => g.type === 'score' || g.type === 'lines')
        ).toBe(true);
        // No gems or locks in 1-4
        const boardStr = lvl.board.join('');
        expect(boardStr.includes('G')).toBe(false);
        expect(boardStr.includes('L')).toBe(false);
      }

      // Levels 5-8: add gems
      for (let i = 4; i < 8; i++) {
        const lvl = levelsData[i];
        const boardStr = lvl.board.join('');
        expect(boardStr.includes('G')).toBe(true);
        expect(lvl.goals.some((g) => g.type === 'gems')).toBe(true);
      }

      // Levels 9-12: add locks and one move limit
      const levels9to12 = levelsData.slice(8, 12);
      expect(
        levels9to12.some((lvl) => lvl.board.join('').includes('L'))
      ).toBe(true);

      const moveLimitedLevels = levels9to12.filter(
        (lvl) => typeof lvl.moves === 'number'
      );
      expect(moveLimitedLevels).toHaveLength(1);
      expect(moveLimitedLevels[0].moves).toBeGreaterThan(0);
    });
  });

  describe('Serialization and Hold slot in Adventure mode', () => {
    it('supports holdPiece in adventure mode preserving adventure properties', () => {
      const level = {
        id: 4,
        seed: 44,
        board: Array(8).fill("........"),
        goals: [{ type: 'lines', value: 3 }],
        moves: 10,
        stars: [500, 1000, 1500],
      };

      const game = createAdventureGame(level);
      const { state: heldState, events: holdEvents } = holdPiece(game, 0);

      expect(holdEvents[0].type).toBe('held');
      expect(heldState.mode).toBe('adventure');
      expect(heldState.levelId).toBe(4);
      expect(heldState.movesLeft).toBe(10);
      expect(heldState.goals).toHaveLength(1);
    });

    it('round-trips adventure game state serialization', () => {
      const level = {
        id: 7,
        seed: 77,
        board: Array(8).fill("........"),
        goals: [{ type: 'gems' }, { type: 'score', value: 800 }],
        moves: 12,
        stars: [800, 1400, 2000],
      };

      const game = createAdventureGame(level);
      const json = serializeAdventureGame(game);
      expect(typeof json).toBe('string');

      const restored = restoreAdventureGame(json);
      expect(restored.mode).toBe('adventure');
      expect(restored.levelId).toBe(7);
      expect(restored.level).toBe(7);
      expect(restored.movesLeft).toBe(12);
      expect(restored.starsThresholds).toEqual([800, 1400, 2000]);
      expect(restored.goals).toEqual(game.goals);
      expect(restored.completed).toBe(false);
      expect(restored.stars).toBe(0);
    });
  });
});
