import { preciseSum } from './rounding';
import { HEALTH_MEASURES, type HealthValues, type StateMedians } from './types';

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * State medians of each health measure across ALL counties in the dataset.
 * They are a fixed reference: never computed from the selected communities.
 */
export function stateMedians(counties: readonly HealthValues[]): StateMedians {
  const result = {} as StateMedians;
  for (const measure of HEALTH_MEASURES) {
    const values = counties.map((c) => c[measure]).filter(isFiniteNumber);
    result[measure] = median(values);
  }
  return result;
}

/** H = average of (county rate / State median) over available measures; 1.0 if none. */
export function healthIndex(health: HealthValues, medians: StateMedians): number {
  const ratios = HEALTH_MEASURES
    .map((m) => {
      const v = health[m];
      return isFiniteNumber(v) ? v / medians[m] : null;
    })
    .filter((r): r is number => r !== null);
  return ratios.length ? preciseSum(ratios) / ratios.length : 1.0;
}
