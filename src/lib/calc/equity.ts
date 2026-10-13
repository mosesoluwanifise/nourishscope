import { roundHalfEven } from './rounding';
import type { Community, StrategyResult } from './types';

const DISTRESSED_STATUSES = new Set(['Distressed', 'At-Risk']);

/** Spec step 6: rural (nonmetro) or ARC Distressed / At-Risk. */
export function isFlagged(county: { arc_status: unknown; metro_nonmetro: number }): boolean {
  return (typeof county.arc_status === 'string' && DISTRESSED_STATUSES.has(county.arc_status))
    || county.metro_nonmetro === 0;
}

export interface EquityShares {
  flaggedCount: number;
  /** Share of the budget allocated to flagged communities, in percent. */
  budgetPct: number;
  /** Share of households reached that are in flagged communities, in percent. */
  reachedPct: number;
}

export function equityShares(
  communities: readonly Community[],
  result: StrategyResult,
  budget: number,
): EquityShares {
  let budgetFlagged = 0;
  let reachedFlagged = 0;
  communities.forEach((c, i) => {
    if (!c.flagged) return;
    budgetFlagged += result.rows[i].allocation;
    reachedFlagged += result.rows[i].reached;
  });
  const reachedTotal = result.totals.reached;
  return {
    flaggedCount: communities.filter((c) => c.flagged).length,
    budgetPct: budget > 0 ? roundHalfEven((100 * budgetFlagged) / budget, 1) : 0,
    reachedPct: reachedTotal > 0 ? roundHalfEven((100 * reachedFlagged) / reachedTotal, 1) : 0,
  };
}
