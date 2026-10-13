import { preciseSum, roundHalfEven } from './rounding';
import type { Community, Strategy } from './types';

export const DEFAULT_FLOOR_SHARE = 0.05;

/** Spec step 3: split budget B across communities. Each allocation is rounded to the cent. */
export function allocate(
  communities: readonly Community[],
  budget: number,
  strategy: Strategy,
  floorShare: number = DEFAULT_FLOOR_SHARE,
): number[] {
  const n = communities.length;
  if (n === 0) return [];
  const U = communities.map((c) => c.unmet);
  const totalU = U.reduce((a, b) => a + b, 0);
  let A: number[];

  switch (strategy) {
    case 'equal':
      A = U.map(() => budget / n);
      break;
    case 'proportional':
      A = U.map((u) => (totalU ? (budget * u) / totalU : budget / n));
      break;
    case 'need_floor': {
      const floor = (floorShare * budget) / n;
      const rest = budget - floor * n;
      A = U.map((u) => floor + (totalU ? (rest * u) / totalU : rest / n));
      break;
    }
    case 'health_weighted': {
      const W = communities.map((c) => c.unmet * c.H);
      const totalW = preciseSum(W);
      A = W.map((w) => (totalW ? (budget * w) / totalW : budget / n));
      break;
    }
    case 'cost_effectiveness': {
      // Cheapest cost per household first; ties broken by higher H, then higher unmet need.
      const order = communities
        .map((_, i) => i)
        .sort((i, j) =>
          communities[i].cost - communities[j].cost
          || communities[j].H - communities[i].H
          || communities[j].unmet - communities[i].unmet);
      A = new Array<number>(n).fill(0);
      let left = budget;
      for (const i of order) {
        const needDollars = communities[i].unmet * communities[i].cost;
        A[i] = Math.min(left, needDollars);
        left -= A[i];
        if (left <= 0) break;
      }
      break;
    }
  }
  return A.map((a) => roundHalfEven(a, 2));
}
