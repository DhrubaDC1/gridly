/**
 * Mulberry32 seeded 32-bit pseudo-random number generator.
 * Pure JS, deterministic, no side effects.
 *
 * @typedef {Object} Rng
 * @property {() => number} next - Returns a float in [0, 1).
 * @property {(maxExclusive: number) => number} int - Returns an integer in [0, maxExclusive).
 */

/**
 * Creates a mulberry32 seeded pseudo-random number generator.
 *
 * @param {number} seed - Integer seed value.
 * @returns {Rng}
 */
export function createRng(seed = 0) {
  let s = (seed >>> 0) || 1;

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

  return { next, int };
}
