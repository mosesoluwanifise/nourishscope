import { describe, expect, it } from 'vitest';
import counties from '../../src/generated/counties.json';
import type { County } from '../../src/lib/data/types';
import {
  equityShares,
  evaluate,
  isFlagged,
  prepareCommunities,
  runStrategy,
  stateMedians,
  STRATEGIES,
  type CommunityInput,
} from '../../src/lib/calc';

const COUNTIES = counties as County[];
const medians = stateMedians(COUNTIES);

function community(partial: Partial<CommunityInput> & { id: string }): CommunityInput {
  return { name: partial.id, need: 100, served: null, cost: 100, health: {}, flagged: false, ...partial };
}

describe('core measures', () => {
  it('caps unmet need at 0 when served exceeds need', () => {
    const [c] = prepareCommunities([community({ id: 'a', need: 100, served: 150 })], medians);
    expect(c.unmet).toBe(0);
  });

  it('uses a health index of 1.0 when no health measures are available', () => {
    const [c] = prepareCommunities([community({ id: 'a' })], medians);
    expect(c.H).toBe(1);
  });

  it('averages only the available health measures', () => {
    const [c] = prepareCommunities([community({ id: 'a', health: { diabetes_pct: 24.6 } })], medians);
    expect(c.H).toBe(2);
  });
});

describe('allocation edge cases', () => {
  it('falls back to equal allocation when total unmet need is 0', () => {
    const inputs = [community({ id: 'a', need: 10, served: 10 }), community({ id: 'b', need: 5, served: 9 })];
    const prepared = prepareCommunities(inputs, medians);
    for (const strategy of ['proportional', 'need_floor', 'health_weighted'] as const) {
      expect(runStrategy(prepared, 1000, strategy).rows.map((r) => r.allocation)).toEqual([500, 500]);
    }
  });

  it('gives a single community the whole budget, with reach capped at unmet need', () => {
    const prepared = prepareCommunities([community({ id: 'a', need: 30 })], medians);
    for (const strategy of STRATEGIES) {
      const result = runStrategy(prepared, 10000, strategy);
      expect(result.rows[0].reached).toBe(30);
      expect(result.totals.unspent).toBe(7000);
    }
    expect(runStrategy(prepared, 10000, 'equal').rows[0].allocation).toBe(10000);
    expect(runStrategy(prepared, 10000, 'cost_effectiveness').rows[0].allocation).toBe(3000);
  });

  it('cost-effectiveness funds the cheapest community first', () => {
    const prepared = prepareCommunities(
      [community({ id: 'pricey', need: 100, cost: 200 }), community({ id: 'cheap', need: 100, cost: 50 })],
      medians,
    );
    const result = runStrategy(prepared, 10000, 'cost_effectiveness');
    expect(result.rows.map((r) => r.allocation)).toEqual([5000, 5000]);
    expect(result.rows.map((r) => r.reached)).toEqual([25, 100]);
  });

  it('cost-effectiveness breaks cost ties by higher health index, then higher unmet need', () => {
    const prepared = prepareCommunities(
      [
        community({ id: 'low-h-big', need: 500, health: { diabetes_pct: 12.3 } }),
        community({ id: 'high-h', need: 100, health: { diabetes_pct: 24.6 } }),
        community({ id: 'low-h-small', need: 50, health: { diabetes_pct: 12.3 } }),
      ],
      medians,
    );
    const result = runStrategy(prepared, 15000, 'cost_effectiveness');
    expect(result.rows.map((r) => r.allocation)).toEqual([5000, 10000, 0]);
  });

  it('never counts a partly funded household', () => {
    const prepared = prepareCommunities([community({ id: 'a', need: 10, cost: 30 })], medians);
    const result = runStrategy(prepared, 100, 'equal');
    expect(result.rows[0].reached).toBe(3);
    expect(result.rows[0].spend).toBe(90);
    expect(result.totals.unspent).toBe(10);
  });

  it('shows coverage only when served is entered for every community', () => {
    const prepared = prepareCommunities(
      [community({ id: 'a', need: 100, served: 20 }), community({ id: 'b', need: 100 })],
      medians,
    );
    expect(runStrategy(prepared, 1000, 'equal').totals.coverageBefore).toBeNull();
  });
});

describe('equity flags', () => {
  it('flags Distressed, At-Risk and nonmetro counties only', () => {
    const byName = (n: string) => COUNTIES.find((c) => c.county_name === n)!;
    expect(isFlagged(byName('Owsley County'))).toBe(true); // Distressed
    expect(isFlagged(byName('Adair County'))).toBe(true); // At-Risk
    expect(isFlagged(byName('Fayette County'))).toBe(false); // metro, not Appalachian
    expect(COUNTIES.filter(isFlagged)).toHaveLength(86);
  });

  it('reports budget and reached shares going to flagged communities', () => {
    const pick = ['Owsley County', 'Wolfe County', 'Fayette County'].map(
      (n) => COUNTIES.find((c) => c.county_name === n)!,
    );
    const prepared = prepareCommunities(
      pick.map((c) => ({
        id: c.fips,
        name: c.county_name,
        need: c.snap_households,
        served: null,
        cost: 100,
        health: { diabetes_pct: c.diabetes_pct, obesity_pct: c.obesity_pct, high_bp_pct: c.high_bp_pct },
        flagged: isFlagged(c),
      })),
      medians,
    );
    const result = runStrategy(prepared, 50000, 'proportional');
    const shares = equityShares(prepared, result, 50000);
    const flaggedBudget = result.rows[0].allocation + result.rows[1].allocation;
    const flaggedReached = result.rows[0].reached + result.rows[1].reached;
    expect(shares.budgetPct).toBeCloseTo((100 * flaggedBudget) / 50000, 1);
    expect(shares.reachedPct).toBeCloseTo((100 * flaggedReached) / result.totals.reached, 1);
    expect(shares.flaggedCount).toBe(2);
  });
});

describe('evaluation module', () => {
  it('matches the spec example', () => {
    expect(evaluate({ prePct: 30, postPct: 55, participants: 73, programCost: 2500 })).toEqual({
      changePts: 25,
      participantsImproving: 18.2,
      costPerParticipantImproving: 136.99,
    });
  });

  it('gives no cost per participant improving when change is 0 or negative', () => {
    expect(evaluate({ prePct: 55, postPct: 50, participants: 73, programCost: 2500 })).toEqual({
      changePts: -5,
      participantsImproving: -3.6,
      costPerParticipantImproving: null,
    });
  });

  it('gives no cost per participant improving when there are no participants', () => {
    expect(evaluate({ prePct: 30, postPct: 55, participants: 0, programCost: 2500 }).costPerParticipantImproving).toBeNull();
  });
});
