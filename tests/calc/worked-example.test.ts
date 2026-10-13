/**
 * Golden tests: the worked example in the NourishScope Calculation
 * Specification (Methodology v1.0), section 4.
 */
import { describe, expect, it } from 'vitest';
import counties from '../../src/generated/counties.json';
import type { County } from '../../src/lib/data/types';
import {
  prepareCommunities,
  runStrategy,
  sensitivity,
  stateMedians,
  STRATEGIES,
  type CommunityInput,
} from '../../src/lib/calc';

const COUNTIES = counties as County[];
const medians = stateMedians(COUNTIES);

function input(name: string, served: number | null = null): CommunityInput {
  const c = COUNTIES.find((x) => x.county_name === name)!;
  return {
    id: c.fips,
    name: c.county_name,
    need: c.snap_households,
    served,
    cost: 100,
    health: { diabetes_pct: c.diabetes_pct, obesity_pct: c.obesity_pct, high_bp_pct: c.high_bp_pct },
    flagged: false,
  };
}

const NAMES = ['Magoffin County', 'Owsley County', 'Wolfe County'];
const B = 50000;

describe('state medians', () => {
  it('match the spec values from all 120 counties', () => {
    expect(medians).toEqual({ diabetes_pct: 12.3, obesity_pct: 40.3, high_bp_pct: 36.7 });
  });
});

describe('worked example: Magoffin, Owsley and Wolfe, need-only mode', () => {
  const communities = prepareCommunities(NAMES.map((n) => input(n)), medians);

  it('uses SNAP households as need and computes the health index', () => {
    expect(communities.map((c) => c.need)).toEqual([1759, 593, 976]);
    expect(communities.map((c) => Number(c.H.toFixed(3)))).toEqual([1.147, 1.066, 1.188]);
    expect(communities.every((c) => c.servedKnown === false)).toBe(true);
  });

  it.each([
    ['equal', [16666.67, 16666.67, 16666.67], [166, 166, 166], 200],
    ['proportional', [26427.28, 8909.25, 14663.46], [264, 89, 146], 100],
    ['need_floor', [25939.25, 9297.13, 14763.62], [259, 92, 147], 200],
    ['health_weighted', [26475.74, 8299.53, 15224.74], [264, 82, 152], 200],
    ['cost_effectiveness', [0, 0, 50000], [0, 0, 500], 0],
  ] as const)('%s strategy', (strategy, allocations, reached, unspent) => {
    const result = runStrategy(communities, B, strategy);
    expect(result.rows.map((r) => r.allocation)).toEqual(allocations);
    expect(result.rows.map((r) => r.reached)).toEqual(reached);
    expect(result.totals.reached).toBe(reached.reduce<number>((a, b) => a + b, 0));
    expect(result.totals.unspent).toBe(unspent);
    expect(result.totals.coverageBefore).toBeNull();
    expect(result.totals.coverageAfter).toBeNull();
  });

  it('lists all five strategies in spec order', () => {
    expect(STRATEGIES).toEqual(['equal', 'proportional', 'need_floor', 'health_weighted', 'cost_effectiveness']);
  });

  it('proportional sensitivity reaches 624 / 499 / 416', () => {
    const levels = sensitivity(communities, B, 'proportional');
    expect(levels.map((l) => l.factor)).toEqual([0.8, 1, 1.2]);
    expect(levels.map((l) => l.reached)).toEqual([624, 499, 416]);
  });
});

describe('worked example: served mode', () => {
  it('proportional coverage rises from 22.5% to 37.5%', () => {
    const served = [400, 150, 200];
    const communities = prepareCommunities(NAMES.map((n, i) => input(n, served[i])), medians);
    const result = runStrategy(communities, B, 'proportional');
    expect(result.totals.coverageBefore).toBe(22.5);
    expect(result.totals.coverageAfter).toBe(37.5);
  });
});
