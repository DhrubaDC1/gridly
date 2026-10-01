import { createBoard } from '../engine/board';

/**
 * Creates the scripted onboarding board:
 * Row 7 is filled except for the last 3 cells in that row (columns 5, 6, 7).
 *
 * @returns {Array<Object | null>}
 */
export function createOnboardingBoard() {
  const board = createBoard();
  for (let c = 0; c < 5; c++) {
    board[7 * 8 + c] = {
      color: c % 6,
      kind: 'normal',
      hp: 1,
    };
  }
  return board;
}

/**
 * Scripted tray containing a 1x3 horizontal line piece (slot 0)
 * plus two other small pieces that all fit somewhere.
 */
export const ONBOARDING_TRAY = Object.freeze([
  { id: 'line_1x3', color: 0 },
  { id: 'line_1x2', color: 1 },
  { id: 'line_1x1', color: 2 },
]);

/**
 * Scripted initial state for the first game onboarding.
 */
export const SCRIPTED_INITIAL_STATE = Object.freeze({
  board: createOnboardingBoard(),
  tray: ONBOARDING_TRAY,
});

export const onboardingInitialState = SCRIPTED_INITIAL_STATE;
export const ONBOARDING_INITIAL_STATE = SCRIPTED_INITIAL_STATE;

/**
 * Generates a fresh clone of the scripted initial state.
 *
 * @returns {{ board: Array<Object | null>, tray: Array<{ id: string, color: number }> }}
 */
export function getOnboardingInitialState() {
  return {
    board: createOnboardingBoard(),
    tray: ONBOARDING_TRAY.map((p) => ({ ...p })),
  };
}

export default SCRIPTED_INITIAL_STATE;
