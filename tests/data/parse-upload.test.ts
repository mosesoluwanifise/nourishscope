import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_ROWS, parseUpload } from '../../src/lib/data/parse-upload';

const TEMPLATE = readFileSync('public/downloads/nourishscope_upload_template.csv', 'utf8');
const HEADER = 'community_name,county,fips,number_of_households_in_need,number_of_households_served,cost_per_household';

describe('parseUpload', () => {
  it('reads the template example row', () => {
    const result = parseUpload(TEMPLATE);
    expect(result.fileErrors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      communityName: 'Example Community',
      county: 'Adair County',
      fips: '21001',
      need: 1200,
      served: 450,
      cost: 110,
      health: {},
      issues: [],
    });
  });

  it('accepts the spec header spellings and ignores case and spaces', () => {
    const text = ' Community_Name , COUNTY, households_in_need ,Households_Served\nA,Adair,10,2\n';
    const result = parseUpload(text);
    expect(result.fileErrors).toEqual([]);
    expect(result.rows[0]).toMatchObject({ need: 10, served: 2, cost: null });
  });

  it('keeps only recognised columns', () => {
    const text = `${HEADER},participant_names\nA,Adair,,10,,,"Jane Doe"\n`;
    const row = parseUpload(text).rows[0] as unknown as Record<string, unknown>;
    expect(JSON.stringify(row)).not.toContain('Jane Doe');
  });

  it('reports a missing households-in-need column as a file error', () => {
    const result = parseUpload('community_name,county\nA,Adair\n');
    expect(result.fileErrors.join(' ')).toMatch(/Number of households in need/);
    expect(result.rows).toEqual([]);
  });

  it('reports a missing county and FIPS column as a file error', () => {
    const result = parseUpload('community_name,number_of_households_in_need\nA,10\n');
    expect(result.fileErrors.join(' ')).toMatch(/county/i);
  });

  it('reports an empty file', () => {
    expect(parseUpload('').fileErrors).toEqual(['The file is empty.']);
    expect(parseUpload(`${HEADER}\n`).fileErrors).toEqual(['The file has a header row but no communities.']);
  });

  it('rejects files over the size or row limits before parsing', () => {
    expect(parseUpload(TEMPLATE, MAX_UPLOAD_BYTES + 1).fileErrors[0]).toMatch(/larger than 1 MB/);
    const many = `${HEADER}\n${'A,Adair,,10,,\n'.repeat(MAX_UPLOAD_ROWS + 1)}`;
    expect(parseUpload(many).fileErrors[0]).toMatch(/more than 2,000 rows/);
  });

  it('lists invalid values with their row number and field', () => {
    const text = `${HEADER}\nA,Adair,,-5,,\nB,Bell,,10,,abc\nC,Pike,,,,\nD,Clay,,10.5,,\n`;
    const issues = parseUpload(text).rows.map((r) => r.issues.map((i) => `${r.rowNumber}:${i.field}`));
    expect(issues).toEqual([['2:need'], ['3:cost'], ['4:need'], ['5:need']]);
  });

  it('treats -9999 and "Not reported" in optional fields as missing', () => {
    const text = `${HEADER},diabetes_pct,obesity_pct\nA,Adair,,10,-9999,,Not reported,38.1\n`;
    const row = parseUpload(text).rows[0];
    expect(row.served).toBeNull();
    expect(row.health).toEqual({ obesity_pct: 38.1 });
    expect(row.issues).toEqual([]);
  });

  it('keeps FIPS codes as text', () => {
    const row = parseUpload(`${HEADER}\nA,,001,10,,\n`).rows[0];
    expect(row.fips).toBe('001');
  });
});
