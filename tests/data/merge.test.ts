import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { COUNTIES } from '../../src/lib/data/load';
import { parseUpload } from '../../src/lib/data/parse-upload';
import { assembleFromCounties, assembleFromUpload, EXAMPLE_COST } from '../../src/lib/data/merge';

const TEMPLATE = readFileSync('public/downloads/nourishscope_upload_template.csv', 'utf8');
const SAMPLE = readFileSync('data/sample/nourishscope_sample_communities.csv', 'utf8');
const HEADER = 'community_name,county,fips,number_of_households_in_need,number_of_households_served,cost_per_household';
const byName = (n: string) => COUNTIES.find((c) => c.county_name === n)!;

describe('built-in Kentucky data', () => {
  it('defaults need to SNAP households, served to blank and cost to the $100 example', () => {
    const [magoffin] = assembleFromCounties([byName('Magoffin County').fips], COUNTIES, EXAMPLE_COST);
    expect(magoffin.input).toMatchObject({ need: 1759, served: null, cost: 100 });
    expect(magoffin.source).toBe('kentucky');
    expect(magoffin.needSource).toBe('snap');
    expect(magoffin.costFromUpload).toBe(false);
  });

  it('carries the county flag and health measures', () => {
    const [owsley] = assembleFromCounties([byName('Owsley County').fips], COUNTIES, EXAMPLE_COST);
    expect(owsley.input.flagged).toBe(true);
    expect(owsley.input.health).toEqual({ diabetes_pct: 13.7, obesity_pct: 41.2, high_bp_pct: 39 });
  });
});

describe('uploaded data', () => {
  it('builds a community from the template example row', () => {
    const { communities, flagged } = assembleFromUpload(parseUpload(TEMPLATE).rows, COUNTIES, EXAMPLE_COST, 'upload');
    expect(flagged).toEqual([]);
    expect(communities).toHaveLength(1);
    expect(communities[0].input).toMatchObject({ name: 'Example Community', need: 1200, served: 450, cost: 110 });
    expect(communities[0].costFromUpload).toBe(true);
    expect(communities[0].needSource).toBe('upload');
    expect(communities[0].county.county_name).toBe('Adair County');
  });

  it('replaces public values only for fields the user filled in', () => {
    const text = `${HEADER},diabetes_pct\nA,Adair,,10,,,15.5\n`;
    const [c] = assembleFromUpload(parseUpload(text).rows, COUNTIES, EXAMPLE_COST, 'upload').communities;
    const adair = byName('Adair County');
    expect(c.input.health).toEqual({ diabetes_pct: 15.5, obesity_pct: adair.obesity_pct, high_bp_pct: adair.high_bp_pct });
    expect(c.overrides).toEqual(['diabetes_pct']);
  });

  it('uses the global cost when the upload leaves cost blank', () => {
    const text = `${HEADER}\nA,Adair,,10,,\n`;
    const [c] = assembleFromUpload(parseUpload(text).rows, COUNTIES, 125, 'upload').communities;
    expect(c.input.cost).toBe(125);
    expect(c.costFromUpload).toBe(false);
  });

  it('lets two communities in the same county share its public figures', () => {
    const text = `${HEADER}\nA,Adair,,10,,\nB,Adair County,,20,,\n`;
    const { communities } = assembleFromUpload(parseUpload(text).rows, COUNTIES, EXAMPLE_COST, 'upload');
    expect(communities.map((c) => c.county.fips)).toEqual(['21001', '21001']);
    expect(communities.map((c) => c.input.id)).toEqual(['row-2', 'row-3']);
  });

  it('flags blank need instead of inheriting the county SNAP count', () => {
    const text = `${HEADER}\nA,Adair,,,,\nB,Adair,,,,\n`;
    const { communities, flagged } = assembleFromUpload(parseUpload(text).rows, COUNTIES, EXAMPLE_COST, 'upload');
    expect(communities).toEqual([]);
    expect(flagged.map((f) => f.row.rowNumber)).toEqual([2, 3]);
    expect(flagged[0].problems.join(' ')).toMatch(/households in need/i);
  });

  it('flags unmatched and conflicting rows and never drops them', () => {
    const text = `${HEADER}\nA,Springfield,,10,,\nB,Allen,21001,10,,\nC,Bell,,10,,\n`;
    const { communities, flagged } = assembleFromUpload(parseUpload(text).rows, COUNTIES, EXAMPLE_COST, 'upload');
    expect(communities.map((c) => c.input.name)).toEqual(['C']);
    expect(flagged.map((f) => [f.row.rowNumber, f.match.status === 'flagged' ? f.match.reason : null])).toEqual([
      [2, 'county_not_recognised'],
      [3, 'fips_name_disagree'],
    ]);
  });

  it('resolves a flagged row once the user picks a county', () => {
    const text = `${HEADER}\nA,Springfield,,10,,\n`;
    const rows = parseUpload(text).rows;
    const fixed = assembleFromUpload(rows, COUNTIES, EXAMPLE_COST, 'upload', { 2: '21001' });
    expect(fixed.flagged).toEqual([]);
    expect(fixed.communities[0].county.fips).toBe('21001');
  });
});

describe('sample data', () => {
  it('loads six fictional communities through the upload path, tagged as sample', () => {
    const { communities, flagged } = assembleFromUpload(parseUpload(SAMPLE).rows, COUNTIES, EXAMPLE_COST, 'sample');
    expect(flagged).toEqual([]);
    expect(communities).toHaveLength(6);
    expect(communities.every((c) => c.source === 'sample' && c.input.name.includes('(fictional)'))).toBe(true);
  });
});
