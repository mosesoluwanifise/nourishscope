/**
 * Plain-language names and one-line explanations (plan U6).
 * Used by the app and the Methodology page so the wording stays the same.
 */
import type { Strategy } from './calc/types';

export const STRATEGY_COPY: Record<Strategy, { name: string; explain: string; anchor: string }> = {
  equal: {
    name: 'Equal split',
    explain: 'Every community gets the same amount.',
    anchor: 'strategy-equal',
  },
  proportional: {
    name: 'Share by unmet need',
    explain: 'Communities with more households still needing help get more.',
    anchor: 'strategy-proportional',
  },
  need_floor: {
    name: 'Share by need, with a minimum for all',
    explain: 'Every community gets a small guaranteed amount, and the rest follows unmet need.',
    anchor: 'strategy-need-floor',
  },
  health_weighted: {
    name: 'Share by need and health burden',
    explain: 'Like sharing by need, but communities with higher diabetes, obesity and blood-pressure rates get more.',
    anchor: 'strategy-health-weighted',
  },
  cost_effectiveness: {
    name: 'Lowest cost first',
    explain: 'Funds the communities where each household costs least, until the money runs out. Most useful when costs differ by community.',
    anchor: 'strategy-cost-effectiveness',
  },
};

export const TERM_COPY = {
  floorShare: {
    name: 'Minimum for every community',
    explain: 'The share of the budget split evenly before the rest follows need. Used by "Share by need, with a minimum for all".',
  },
  healthIndex: {
    name: 'Health burden score',
    explain: '1.0 is the Kentucky middle; above 1.0 means higher rates than most counties.',
  },
  unmet: {
    name: 'Households still needing help',
    explain: 'Households in need minus households already served.',
  },
  equityFlag: {
    name: 'Rural or distressed',
    explain: 'The county is nonmetro, or the Appalachian Regional Commission rates it Distressed or At-Risk.',
  },
  need: {
    name: 'Number of households in need',
    explain: 'For Kentucky county data this starts as the number of households receiving SNAP (Census ACS 2020–2024). You can replace it.',
  },
  served: {
    name: 'Number of households served',
    explain: 'Households your program already serves. Leave blank if you do not know; coverage will not be shown.',
  },
  cost: {
    name: 'Cost per household',
    explain: 'What your program spends to serve one household.',
  },
} as const;
