import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { derive, hasUnsavedWork, INITIAL_STATE, withCost, withSource, type PlanState } from '../../src/components/app/state';
import { parseUpload } from '../../src/lib/data/parse-upload';
import { COUNTIES } from '../../src/lib/data/load';

const SAMPLE_ROWS = parseUpload(readFileSync('data/sample/nourishscope_sample_communities.csv', 'utf8')).rows;
const fipsOf = (n: string) => COUNTIES.find((c) => c.county_name === n)!.fips;
const kentucky = (overrides: Partial<PlanState> = {}): PlanState => ({
  ...withSource(INITIAL_STATE, 'kentucky'),
  selectedFips: ['Magoffin County', 'Owsley County', 'Wolfe County'].map(fipsOf),
  budgetText: '50000',
  ...overrides,
});

describe('derive: empty states', () => {
  it('asks the user to choose data first', () => {
    expect(derive(INITIAL_STATE, SAMPLE_ROWS).emptyMessage).toBe('Choose your data to get started.');
  });

  it('asks for a county when none is selected', () => {
    expect(derive(kentucky({ selectedFips: [] }), SAMPLE_ROWS).emptyMessage).toBe('Select at least one county to see results.');
  });

  it('asks for a budget when it is empty', () => {
    expect(derive(kentucky({ budgetText: '' }), SAMPLE_ROWS).emptyMessage).toBe('Enter your total budget to see results.');
  });

  it('blocks results on an invalid budget, with an inline error', () => {
    const d = derive(kentucky({ budgetText: '0' }), SAMPLE_ROWS);
    expect(d.errors.budget).toBe('Enter a budget of more than $0.');
    expect(d.results).toBeNull();
  });

  it('reports when no uploaded rows match', () => {
    const parsed = parseUpload('community_name,county,number_of_households_in_need\nA,Springfield,10\nB,Narnia,5\nC,Gotham,3\n');
    const state: PlanState = { ...withSource(INITIAL_STATE, 'upload'), budgetText: '1000', upload: { fileName: 'x.csv', parsed, countyFixes: {}, continued: false } };
    const d = derive(state, SAMPLE_ROWS);
    expect(d.communities).toHaveLength(0);
    expect(d.flagged).toHaveLength(3);
    expect(d.emptyMessage).toMatch(/None of your rows matched/);
  });

  it('waits for the user to fix or continue when some rows are flagged', () => {
    const parsed = parseUpload('community_name,county,number_of_households_in_need\nA,Adair,10\nB,Springfield,5\n');
    const base: PlanState = { ...withSource(INITIAL_STATE, 'upload'), budgetText: '1000', upload: { fileName: 'x.csv', parsed, countyFixes: {}, continued: false } };
    expect(derive(base, SAMPLE_ROWS).emptyMessage).toMatch(/Some rows need attention/);
    const continued = derive({ ...base, upload: { ...base.upload!, continued: true } }, SAMPLE_ROWS);
    expect(continued.emptyMessage).toBeNull();
    expect(continued.communities).toHaveLength(1);
  });
});

describe('derive: results', () => {
  it('computes all five strategies for the worked example in need-only mode', () => {
    const d = derive(kentucky(), SAMPLE_ROWS);
    expect(d.emptyMessage).toBeNull();
    expect(d.results!.map((r) => r.totals.reached)).toEqual([498, 499, 498, 498, 500]);
    expect(d.needOnly).toBe(true);
    expect(d.costConfirmed).toBe(false);
    expect(d.sensitivity!.map((s) => s.reached)).toEqual([624, 499, 416]);
    expect(d.needDefinition).toMatch(/^SNAP households/);
  });

  it('switches to served mode once served is entered for every county', () => {
    const [m, o, w] = ['Magoffin County', 'Owsley County', 'Wolfe County'].map(fipsOf);
    const d = derive(kentucky({ servedText: { [m]: '400', [o]: '150', [w]: '200' } }), SAMPLE_ROWS);
    expect(d.needOnly).toBe(false);
    expect(d.results![1].totals.coverageBefore).toBe(22.5);
    expect(d.results![1].totals.coverageAfter).toBe(37.5);
  });

  it('warns when served exceeds need and validates served as a whole number', () => {
    const m = fipsOf('Magoffin County');
    expect(derive(kentucky({ servedText: { [m]: '5000' } }), SAMPLE_ROWS).warnings[m]).toMatch(/more than households in need/);
    expect(derive(kentucky({ servedText: { [m]: '-1' } }), SAMPLE_ROWS).errors.served[m]).toBeDefined();
  });

  it('lets the user replace need for a county and reports a mixed need definition', () => {
    const m = fipsOf('Magoffin County');
    const d = derive(kentucky({ needText: { [m]: '2000' } }), SAMPLE_ROWS);
    expect(d.communities[0].input.need).toBe(2000);
    expect(d.needSources[m]).toBe('user');
    expect(d.needDefinition).toMatch(/^Mixed/);
  });

  it('validates the floor share', () => {
    expect(derive(kentucky({ floorPctText: '150' }), SAMPLE_ROWS).errors.floor).toMatch(/between 0 and 100/);
  });
});

describe('cost confirmation', () => {
  it('counts editing the cost as confirming it', () => {
    const state = withCost(kentucky(), '110');
    expect(derive(state, SAMPLE_ROWS).costConfirmed).toBe(true);
  });

  it('counts uploaded costs for every community as confirmed', () => {
    const d = derive({ ...withSource(INITIAL_STATE, 'sample'), budgetText: '50000' }, SAMPLE_ROWS);
    expect(d.communities).toHaveLength(6);
    expect(d.costConfirmed).toBe(true);
  });
});

describe('data source switching and unsaved work', () => {
  it('keeps budget and cost but clears the selection', () => {
    const switched = withSource(withCost(kentucky(), '120'), 'sample');
    expect(switched.selectedFips).toEqual([]);
    expect(switched.budgetText).toBe('50000');
    expect(switched.costText).toBe('120');
  });

  it('detects unsaved work', () => {
    expect(hasUnsavedWork(INITIAL_STATE)).toBe(false);
    expect(hasUnsavedWork(kentucky())).toBe(true);
  });
});
