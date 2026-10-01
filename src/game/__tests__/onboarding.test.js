import {
  SCRIPTED_INITIAL_STATE,
  createOnboardingBoard,
  ONBOARDING_TRAY,
} from '../onboarding';
import { createGame, placePiece } from '../../engine/game';
import { canPlace } from '../../engine/board';
import { getPiece } from '../../engine/pieces';

describe('src/game/onboarding.js', () => {
  it('creates a board where row 7 is filled except for the last 3 cells', () => {
    const board = createOnboardingBoard();
    expect(board).toHaveLength(64);

    // Rows 0-6 must all be empty
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 8; c++) {
        expect(board[r * 8 + c]).toBeNull();
      }
    }

    // In row 7, columns 0-4 are filled
    for (let c = 0; c < 5; c++) {
      const cell = board[7 * 8 + c];
      expect(cell).not.toBeNull();
      expect(cell.kind).toBe('normal');
      expect(typeof cell.color).toBe('number');
    }

    // In row 7, the last 3 cells (columns 5, 6, 7) are empty
    for (let c = 5; c < 8; c++) {
      expect(board[7 * 8 + c]).toBeNull();
    }
  });

  it('provides a tray containing a 1x3 horizontal line piece and two small fitting pieces', () => {
    expect(ONBOARDING_TRAY).toHaveLength(3);
    expect(ONBOARDING_TRAY[0].id).toBe('line_1x3');

    // All 3 pieces fit somewhere on the onboarding board
    const board = createOnboardingBoard();
    ONBOARDING_TRAY.forEach((pieceRef) => {
      const piece = getPiece(pieceRef.id);
      expect(piece).not.toBeNull();

      let fits = false;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (canPlace(board, piece, r, c)) {
            fits = true;
            break;
          }
        }
        if (fits) break;
      }
      expect(fits).toBe(true);
    });
  });

  it('clears row 7 when placing the 1x3 piece in the right spot (row 7, col 5)', () => {
    const game = createGame({
      seed: 42,
      initial: SCRIPTED_INITIAL_STATE,
    });

    // Verify initial tray slot 0 is line_1x3
    expect(game.tray[0].id).toBe('line_1x3');

    // Place the 1x3 piece at row 7, col 5
    const { state, events } = placePiece(game, 0, 7, 5);

    // Must emit a cleared event for row 7
    const clearedEvent = events.find((e) => e.type === 'cleared');
    expect(clearedEvent).toBeDefined();
    expect(clearedEvent.rows).toContain(7);
    expect(clearedEvent.linesCount).toBe(1);

    // Row 7 is now completely empty
    for (let c = 0; c < 8; c++) {
      expect(state.board[7 * 8 + c]).toBeNull();
    }

    // Score increased
    expect(state.score).toBeGreaterThan(0);
    expect(state.stats.linesCleared).toBe(1);
  });
});
