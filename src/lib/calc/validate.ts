import type { CommunityInput } from './types';

export interface InputIssue {
  /** Community id, or null for plan-wide inputs such as the budget. */
  community: string | null;
  field: 'budget' | 'need' | 'served' | 'cost';
  message: string;
}

export interface ValidationResult {
  errors: InputIssue[];
  warnings: InputIssue[];
}

export const isWholeNonNegative = (v: number) => Number.isInteger(v) && v >= 0;
export const isPositive = (v: number) => Number.isFinite(v) && v > 0;

/** Spec step 1 for the engine's inputs. Results should not compute while errors remain. */
export function validateInputs(communities: readonly CommunityInput[], budget: number): ValidationResult {
  const errors: InputIssue[] = [];
  const warnings: InputIssue[] = [];

  if (!isPositive(budget)) {
    errors.push({ community: null, field: 'budget', message: 'Budget must be more than $0.' });
  }

  for (const c of communities) {
    if (!isWholeNonNegative(c.need)) {
      errors.push({ community: c.id, field: 'need', message: 'Number of households in need must be a whole number of 0 or more.' });
    }
    if (c.served !== null && !isWholeNonNegative(c.served)) {
      errors.push({ community: c.id, field: 'served', message: 'Number of households served must be a whole number of 0 or more.' });
    }
    if (!isPositive(c.cost)) {
      errors.push({ community: c.id, field: 'cost', message: 'Cost per household must be more than $0.' });
    }
    if (c.served !== null && isWholeNonNegative(c.served) && isWholeNonNegative(c.need) && c.served > c.need) {
      warnings.push({
        community: c.id,
        field: 'served',
        message: `Households served (${c.served}) is more than households in need (${c.need}), so unmet need is 0.`,
      });
    }
  }
  return { errors, warnings };
}
