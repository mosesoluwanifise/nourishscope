import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import { derive, INITIAL_STATE, withSource, type PlanState } from '../../src/components/app/state';
import { buildBrief } from '../../src/lib/export/brief-model';
import { briefToCsv, csvCell } from '../../src/lib/export/csv';
import { parseUpload } from '../../src/lib/data/parse-upload';
import { COUNTIES } from '../../src/lib/data/load';

const SAMPLE_ROWS = parseUpload(readFileSync('data/sample/nourishscope_sample_communities.csv', 'utf8')).rows;
const fipsOf = (n: string) => COUNTIES.find((c) => c.county_name === n)!.fips;
const NOW = new Date('2026-10-12T12:00:00Z');

function workedExample(): PlanState {
  return {
    ...withSource(INITIAL_STATE, 'kentucky'),
    selectedFips: ['Magoffin County', 'Owsley County', 'Wolfe County'].map(fipsOf),
    budgetText: '50000',
  };
}

describe('brief model', () => {
  it('contains everything spec step 7 lists for the worked example', () => {
    const state = workedExample();
    const brief = buildBrief(state, derive(state, SAMPLE_ROWS), NOW)!;
    expect(brief.generatedOn).toBe('2026-10-12');
    expect(brief.toolVersion).toBe('1.0.0');
    expect(brief.methodologyVersion).toBe('1.0');
    expect(brief.dataMode).toBe('Kentucky public data');
    expect(brief.needDefinition).toMatch(/^SNAP households/);
    expect(brief.inputs).toEqual({ budget: 50000, cost: 100, floorSharePct: 5, costConfirmed: false });
    expect(brief.rows.map((r) => [r.community, r.allocation, r.reached])).toEqual([
      ['Magoffin County', 26427.28, 264],
      ['Owsley County', 8909.25, 89],
      ['Wolfe County', 14663.46, 146],
    ]);
    expect(brief.rows.map((r) => r.flag)).toEqual(['Rural or distressed', 'Rural or distressed', 'Rural or distressed']);
    expect(brief.totals.reached).toBe(499);
    expect(brief.comparison).toHaveLength(5);
    expect(brief.sensitivity.map((s) => [s.label, s.reached])).toEqual([
      ['Cost −20%', 624],
      ['Cost as entered', 499],
      ['Cost +20%', 416],
    ]);
    expect(brief.dataSources.map((s) => s.source)).toContain('CDC PLACES');
    expect(brief.assumptions.length).toBeGreaterThan(3);
  });

  it('is null until results exist', () => {
    const state = { ...workedExample(), budgetText: '' };
    expect(buildBrief(state, derive(state, SAMPLE_ROWS), NOW)).toBeNull();
  });

  it('labels sample data in the brief and the CSV', () => {
    const state: PlanState = { ...withSource(INITIAL_STATE, 'sample'), budgetText: '50000' };
    const brief = buildBrief(state, derive(state, SAMPLE_ROWS), NOW)!;
    expect(brief.isSample).toBe(true);
    expect(brief.dataMode).toMatch(/Sample data/);
    expect(briefToCsv(brief)).toMatch(/Sample data \(fictional communities\)/);
  });
});

describe('CSV export', () => {
  it('has a per-community table whose values match the model', () => {
    const state = workedExample();
    const brief = buildBrief(state, derive(state, SAMPLE_ROWS), NOW)!;
    const rows = Papa.parse<string[]>(briefToCsv(brief)).data;
    const headerIndex = rows.findIndex((r) => r[0] === 'Community');
    expect(rows[headerIndex]).toContain('Households reached');
    const magoffin = rows[headerIndex + 1];
    expect(magoffin[0]).toBe('Magoffin County');
    expect(magoffin[9]).toBe('26427.28');
    expect(magoffin[10]).toBe('264');
    expect(rows.find((r) => r[0] === 'Tool version')![1]).toBe('1.0.0');
  });

  it.each([
    ['=HYPERLINK("http://x")', `"'=HYPERLINK(""http://x"")"`],
    ['+1', "'+1"],
    ['-cmd', "'-cmd"],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['\tTAB', `"'\tTAB"`],
    ['\rCR', `"'\rCR"`],
  ])('neutralises formula-leading text %j', (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  it('leaves numbers, including negatives, unprefixed', () => {
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell(26427.28)).toBe('26427.28');
    expect(csvCell('Plain name')).toBe('Plain name');
    expect(csvCell(null)).toBe('');
  });

  it('protects an uploaded community name end to end', () => {
    const parsed = parseUpload('community_name,county,number_of_households_in_need,cost_per_household\n=1+1,Adair,10,100\n');
    const state: PlanState = {
      ...withSource(INITIAL_STATE, 'upload'),
      budgetText: '1000',
      upload: { fileName: 'x.csv', parsed, countyFixes: {}, continued: false },
    };
    const brief = buildBrief(state, derive(state, SAMPLE_ROWS), NOW)!;
    expect(briefToCsv(brief)).toContain("'=1+1,Adair County");
  });
});
