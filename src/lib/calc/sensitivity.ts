import { runStrategy } from './results';
import type { Community, Strategy } from './types';

export const SENSITIVITY_FACTORS = [0.8, 1, 1.2] as const;

export interface SensitivityLevel {
  factor: number;
  reached: number;
  unspent: number;
}

/** Spec step 5: repeat steps 3–4 with every cost × 0.8 and × 1.2. */
export function sensitivity(
  communities: readonly Community[],
  budget: number,
  strategy: Strategy,
  floorShare?: number,
): SensitivityLevel[] {
  return SENSITIVITY_FACTORS.map((factor) => {
    const { totals } = runStrategy(communities, budget, strategy, { costFactor: factor, floorShare });
    return { factor, reached: totals.reached, unspent: totals.unspent };
  });
}
