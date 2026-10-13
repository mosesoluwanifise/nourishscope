import { describe, expect, it } from 'vitest';
import { exactRoundHalfEven, preciseSum, roundHalfEven } from '../../src/lib/calc/rounding';

describe('roundHalfEven matches Python round()', () => {
  it.each([
    [0.125, 2, 0.12],
    [0.375, 2, 0.38],
    [2.675, 2, 2.67],
    [0.005, 2, 0.01],
    [0.015, 2, 0.01],
    [250.025, 2, 250.03],
    [25000.025, 2, 25000.03],
    [16666.666666666668, 2, 16666.67],
    [18.25, 1, 18.2],
    [22.45, 1, 22.4],
    [37.5, 1, 37.5],
    [0.5, 0, 0],
    [1.5, 0, 2],
    [2.5, 0, 2],
  ])('round(%s, %s) = %s', (x, digits, expected) => {
    expect(roundHalfEven(x, digits)).toBe(expected);
  });

  it('handles negatives symmetrically', () => {
    expect(roundHalfEven(-0.125, 2)).toBe(-0.12);
    expect(roundHalfEven(-5, 1)).toBe(-5);
  });

  it('returns integers and already-rounded values unchanged', () => {
    expect(roundHalfEven(50000, 2)).toBe(50000);
    expect(roundHalfEven(26427.28, 2)).toBe(26427.28);
  });
});

describe('the fast path agrees with the exact method', () => {
  // Deterministic pseudo-random values (mulberry32) so failures are reproducible.
  function random(seed: number) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it('over 200,000 values shaped like allocations, costs and percentages', () => {
    const next = random(20261012);
    for (let i = 0; i < 200_000; i++) {
      const digits = i % 3;
      const magnitude = [1, 100, 10_000, 1_000_000][i % 4];
      const base = next() * magnitude;
      // Every fifth value sits on or near a decimal tie, where the paths could disagree.
      const x = i % 5 === 0 ? Math.round(base * 10 ** digits) / 10 ** digits + 0.5 / 10 ** digits : base;
      const signed = i % 7 === 0 ? -x : x;
      expect(roundHalfEven(signed, digits)).toBe(exactRoundHalfEven(signed, digits));
    }
  });

  it('on allocation-style quotients', () => {
    for (let budget = 1; budget <= 3000; budget += 7) {
      for (const n of [3, 7, 9, 11, 13, 40]) {
        const x = (budget * 1000.05) / n;
        expect(roundHalfEven(x, 2)).toBe(exactRoundHalfEven(x, 2));
      }
    }
  });
});

describe('preciseSum matches Python sum() on floats', () => {
  it('compensates for rounding error', () => {
    expect(preciseSum([0.1, 0.2, 0.3])).toBe(0.6);
    expect(preciseSum([1e16, 1, -1e16])).toBe(1);
    expect(preciseSum([])).toBe(0);
  });
});
