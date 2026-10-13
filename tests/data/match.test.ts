import { describe, expect, it } from 'vitest';
import { COUNTIES } from '../../src/lib/data/load';
import { countyNameKey, matchCounty, normaliseFips } from '../../src/lib/data/match';

const match = (county: string | null, fips: string | null) => matchCounty({ county, fips }, COUNTIES);

describe('county name matching with leeway', () => {
  it.each(['Adair', 'adair county', 'ADAIR CO.', ' Adair County ', 'Adair Co'])('"%s" matches Adair (21001)', (name) => {
    expect(match(name, null)).toEqual({ status: 'matched', fips: '21001' });
  });

  it('tolerates spacing differences in multi-part names', () => {
    expect(match('Mc Lean', null)).toEqual({ status: 'matched', fips: COUNTIES.find((c) => c.county_name === 'McLean County')!.fips });
    expect(match('La Rue', null)).toEqual({ status: 'matched', fips: COUNTIES.find((c) => c.county_name === 'Larue County')!.fips });
  });

  it('gives every Kentucky county a unique key', () => {
    const keys = new Set(COUNTIES.map((c) => countyNameKey(c.county_name)));
    expect(keys.size).toBe(120);
  });

  it('flags an unrecognised county name', () => {
    expect(match('Springfield', null)).toMatchObject({ status: 'flagged', reason: 'county_not_recognised' });
  });

  it('flags a row with neither county nor FIPS', () => {
    expect(match('', '')).toMatchObject({ status: 'flagged', reason: 'no_county' });
    expect(match(null, null)).toMatchObject({ status: 'flagged', reason: 'no_county' });
  });
});

describe('FIPS matching', () => {
  it.each(['21001', '001', '1', '21001.0'])('"%s" matches Adair', (fips) => {
    expect(match(null, fips)).toEqual({ status: 'matched', fips: '21001' });
  });

  it('normalises short codes by zero-padding and prefixing 21', () => {
    expect(normaliseFips('1')).toBe('21001');
    expect(normaliseFips('47')).toBe('21047');
    expect(normaliseFips('21047')).toBe('21047');
  });

  it('flags a FIPS code that is not in Kentucky', () => {
    expect(match(null, '47001')).toMatchObject({ status: 'flagged', reason: 'fips_not_found' });
    expect(match(null, 'abc')).toMatchObject({ status: 'flagged', reason: 'fips_not_found' });
  });

  it('flags, and does not match, a FIPS code that disagrees with the county name', () => {
    expect(match('Allen', '21001')).toMatchObject({ status: 'flagged', reason: 'fips_name_disagree' });
  });

  it('matches when FIPS and county name agree', () => {
    expect(match('Adair County', '21001')).toEqual({ status: 'matched', fips: '21001' });
  });
});
