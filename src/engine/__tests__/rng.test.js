import { createRng, createRngFromState } from '../rng';

describe('RNG (mulberry32)', () => {
  it('generates the same sequence for the same seed', () => {
    const rngA = createRng(12345);
    const rngB = createRng(12345);

    const seqA = [rngA.next(), rngA.next(), rngA.next(), rngA.int(10), rngA.int(100)];
    const seqB = [rngB.next(), rngB.next(), rngB.next(), rngB.int(10), rngB.int(100)];

    expect(seqA).toEqual(seqB);
  });

  it('generates different sequences for different seeds', () => {
    const rngA = createRng(12345);
    const rngB = createRng(54321);

    const seqA = [rngA.next(), rngA.next(), rngA.next()];
    const seqB = [rngB.next(), rngB.next(), rngB.next()];

    expect(seqA).not.toEqual(seqB);
  });

  it('produces floats in [0, 1)', () => {
    const rng = createRng(999);
    for (let i = 0; i < 500; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('produces integers in [0, maxExclusive)', () => {
    const rng = createRng(42);
    const max = 6;
    const counts = new Array(max).fill(0);

    for (let i = 0; i < 600; i++) {
      const val = rng.int(max);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(max);
      counts[val]++;
    }

    // Every bucket from 0 to 5 should be visited
    for (let i = 0; i < max; i++) {
      expect(counts[i]).toBeGreaterThan(0);
    }
  });

  it('handles edge case seeds like 0', () => {
    const rng = createRng(0);
    const val = rng.next();
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });

  it('handles maxExclusive <= 0 safely', () => {
    const rng = createRng(100);
    expect(rng.int(0)).toBe(0);
    expect(rng.int(-5)).toBe(0);
  });

  it('saves state and restores identical subsequent sequence', () => {
    const rng1 = createRng(777);
    // Draw several values
    rng1.next();
    rng1.int(10);
    rng1.next();

    const savedState = rng1.getState();
    const rng2 = createRngFromState(savedState);

    const seq1 = [rng1.next(), rng1.int(50), rng1.next()];
    const seq2 = [rng2.next(), rng2.int(50), rng2.next()];

    expect(seq1).toEqual(seq2);
    expect(rng1.getState()).toBe(rng2.getState());
  });
});
