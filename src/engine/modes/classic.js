import { createGame } from '../game';

/**
 * Configuration for Classic mode (endless with core rules and no limits).
 */
export const classicConfig = Object.freeze({
  mode: 'classic',
  hasTimer: false,
  hasMoveLimit: false,
});

/**
 * Creates a new Classic game instance.
 *
 * @param {number} [seed=0]
 * @returns {import('../game').GameState}
 */
export function createClassicGame(seed = 0) {
  return createGame({ seed, mode: 'classic' });
}
