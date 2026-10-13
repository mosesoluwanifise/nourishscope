import { describe, expect, it } from 'vitest';
import { roundHalfEven, preciseSum } from '../../src/lib/calc/rounding';

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

describe('preciseSum matches Python sum() on floats', () => {
  it('compensates for rounding error', () => {
    expect(preciseSum([0.1, 0.2, 0.3])).toBe(0.6);
    expect(preciseSum([1e16, 1, -1e16])).toBe(1);
    expect(preciseSum([])).toBe(0);
  });
});
