/**
 * Mulberry32 seeded 32-bit pseudo-random number generator.
 * Pure JS, deterministic, no side effects.
 *
 * @typedef {Object} Rng
 * @property {() => number} next - Returns a float in [0, 1).
 * @property {(maxExclusive: number) => number} int - Returns an integer in [0, maxExclusive).
 */

/**
 * Creates a mulberry32 seeded pseudo-random number generator from a saved internal state.
 *
 * @param {number} savedState - Internal 32-bit state.
 * @returns {Rng & { getState: () => number }}
 */
export function createRngFromState(savedState) {
  let s = savedState !== undefined ? (savedState >>> 0) : 1;

  function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(maxExclusive) {
    if (maxExclusive <= 0) {
      return 0;
    }
    return Math.floor(next() * maxExclusive);
  }

  function getState() {
    return s;
  }

  return { next, int, getState };
}

/**
 * Creates a mulberry32 seeded pseudo-random number generator.
 *
 * @param {number} seed - Integer seed value.
 * @returns {Rng & { getState: () => number }}
 */
export function createRng(seed = 0) {
  return createRngFromState((seed >>> 0) || 1);
}

