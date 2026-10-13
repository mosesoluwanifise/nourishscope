export const STRATEGIES = [
  'equal',
  'proportional',
  'need_floor',
  'health_weighted',
  'cost_effectiveness',
] as const;

export type Strategy = (typeof STRATEGIES)[number];

export const HEALTH_MEASURES = ['diabetes_pct', 'obesity_pct', 'high_bp_pct'] as const;
export type HealthMeasure = (typeof HEALTH_MEASURES)[number];
export type HealthValues = Partial<Record<HealthMeasure, number | null>>;
export type StateMedians = Record<HealthMeasure, number>;

/** What the app hands the engine for one community. */
export interface CommunityInput {
  id: string;
  name: string;
  /** Number of households in need. */
  need: number;
  /** Number of households served, or null when not entered (need-only mode). */
  served: number | null;
  /** Cost per household, in dollars. */
  cost: number;
  health: HealthValues;
  /** Rural or economically distressed (spec step 6). */
  flagged: boolean;
}

/** A community after spec step 2 (core measures). */
export interface Community extends CommunityInput {
  unmet: number;
  servedKnown: boolean;
  /** Health index H. */
  H: number;
}

export interface ResultRow {
  id: string;
  name: string;
  allocation: number;
  reached: number;
  spend: number;
}

export interface ResultTotals {
  reached: number;
  spend: number;
  unspent: number;
  /** Null in need-only mode (served not entered for every community). */
  coverageBefore: number | null;
  coverageAfter: number | null;
}

export interface StrategyResult {
  strategy: Strategy;
  rows: ResultRow[];
  totals: ResultTotals;
}
