import { allocate, DEFAULT_FLOOR_SHARE } from './allocate';
import { roundHalfEven } from './rounding';
import type { Community, ResultRow, Strategy, StrategyResult } from './types';

/**
 * Spec steps 3–4 for one strategy: allocate, then count households reached,
 * spend and unspent. Unspent money is reported, not redistributed.
 */
export function runStrategy(
  communities: readonly Community[],
  budget: number,
  strategy: Strategy,
  options: { floorShare?: number; costFactor?: number } = {},
): StrategyResult {
  const costFactor = options.costFactor ?? 1;
  const scaled = communities.map((c) => ({ ...c, cost: c.cost * costFactor }));
  const A = allocate(scaled, budget, strategy, options.floorShare ?? DEFAULT_FLOOR_SHARE);

  let spendTotal = 0;
  let reachedTotal = 0;
  const rows: ResultRow[] = scaled.map((c, i) => {
    const reached = c.cost > 0 ? Math.min(Math.floor(A[i] / c.cost), c.unmet) : 0;
    const spend = roundHalfEven(reached * c.cost, 2);
    spendTotal += spend;
    reachedTotal += reached;
    return { id: c.id, name: c.name, allocation: A[i], reached, spend };
  });

  let coverageBefore: number | null = null;
  let coverageAfter: number | null = null;
  if (communities.length && communities.every((c) => c.servedKnown)) {
    const N = communities.reduce((sum, c) => sum + c.need, 0);
    const S = communities.reduce((sum, c) => sum + (c.served ?? 0), 0);
    if (N > 0) {
      coverageBefore = roundHalfEven((100 * S) / N, 1);
      coverageAfter = roundHalfEven((100 * (S + reachedTotal)) / N, 1);
    }
  }

  return {
    strategy,
    rows,
    totals: {
      reached: reachedTotal,
      spend: roundHalfEven(spendTotal, 2),
      unspent: roundHalfEven(budget - spendTotal, 2),
      coverageBefore,
      coverageAfter,
    },
  };
}
