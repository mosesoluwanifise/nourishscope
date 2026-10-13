import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { derive, INITIAL_STATE, withSource, type PlanState } from '../../src/components/app/state';
import { parseUpload } from '../../src/lib/data/parse-upload';
import { COUNTIES } from '../../src/lib/data/load';
import { STRATEGIES, type Strategy } from '../../src/lib/calc';
import { allocationLines, distribution, summarise } from '../../src/lib/results-view';

const SAMPLE_ROWS = parseUpload(readFileSync('data/sample/nourishscope_sample_communities.csv', 'utf8')).rows;
const fipsOf = (n: string) => COUNTIES.find((c) => c.county_name === n)!.fips;

function results(counties = ['Magoffin County', 'Owsley County', 'Wolfe County']) {
  const state: PlanState = { ...withSource(INITIAL_STATE, 'kentucky'), selectedFips: counties.map(fipsOf), budgetText: '50000' };
  return derive(state, SAMPLE_ROWS).results!;
}
const of = (strategy: Strategy, counties?: string[]) => results(counties).find((r) => r.strategy === strategy)!;

describe('summarise', () => {
  it('reports the worked example under Share by unmet need', () => {
    const s = summarise(of('proportional'));
    expect(s).toMatchObject({ reached: 499, unspent: 100, coverageAfter: null });
    expect(s.largest).toEqual({ amount: 26427.28, names: ['Magoffin County'] });
    expect(s.smallest).toEqual({ amount: 8909.25, names: ['Owsley County'] });
    expect(allocationLines(s)).toEqual(['Most: Magoffin County gets $26,427.28', 'Least: Owsley County gets $8,909.25']);
  });

  it('names every community when all get the same amount (Equal split)', () => {
    const s = summarise(of('equal'));
    expect(s.largest.names).toEqual(['Magoffin County', 'Owsley County', 'Wolfe County']);
    expect(s.smallest.names).toEqual(s.largest.names);
    expect(allocationLines(s)).toEqual(['All 3 communities get $16,666.67']);
  });

  it('names every community tied at the smallest amount (Lowest cost first)', () => {
    const s = summarise(of('cost_effectiveness'));
    expect(s.largest).toEqual({ amount: 50000, names: ['Wolfe County'] });
    expect(s.smallest).toEqual({ amount: 0, names: ['Magoffin County', 'Owsley County'] });
    expect(allocationLines(s)).toEqual([
      'Most: Wolfe County gets $50,000.00',
      'Least: 2 communities get $0.00: Magoffin County, Owsley County',
    ]);
  });

  it('says so in one line when a single community is both largest and smallest', () => {
    expect(allocationLines(summarise(of('proportional', ['Adair County'])))).toEqual([
      'Adair County gets $50,000.00, the whole allocation',
    ]);
  });
});

describe('distribution', () => {
  const view = distribution(results(), 'proportional');
  const row = (name: string) => view.rows.find((r) => r.name === name)!;

  it('lists each community under all five strategies in strategy order', () => {
    expect(row('Magoffin County').cells.map((c) => c.allocation)).toEqual([16666.67, 26427.28, 25939.25, 26475.74, 0]);
    expect(row('Magoffin County').cells.map((c) => c.strategy)).toEqual([...STRATEGIES]);
    expect(row('Wolfe County').cells[4]).toMatchObject({ allocation: 50000, reached: 500 });
  });

  it('marks the strategy that gives each community the most', () => {
    const most = (name: string) => row(name).cells.filter((c) => c.most).map((c) => c.strategy);
    expect(most('Wolfe County')).toEqual(['cost_effectiveness']);
    expect(most('Magoffin County')).toEqual(['health_weighted']);
  });

  it('marks every tied strategy, and none when a community gets nothing anywhere', () => {
    const single = distribution(results(['Adair County']), 'proportional');
    expect(single.rows[0].cells.every((c) => c.most)).toBe(true);
    const zero = distribution(results().map((r) => ({ ...r, rows: r.rows.map((x) => ({ ...x, allocation: 0 })) })), 'equal');
    expect(zero.rows.every((r) => r.cells.every((c) => !c.most))).toBe(true);
  });

  it('orders rows by the selected strategy, highest first', () => {
    expect(view.rows.map((r) => r.name)).toEqual(['Magoffin County', 'Wolfe County', 'Owsley County']);
    expect(distribution(results(), 'cost_effectiveness').rows.map((r) => r.name)).toEqual(['Wolfe County', 'Magoffin County', 'Owsley County']);
  });

  it('totals each strategy', () => {
    expect(view.totals.map((t) => t.reached)).toEqual([498, 499, 498, 498, 500]);
    expect(view.totals[4].allocation).toBe(50000);
  });
});
