import { describe, expect, it } from 'vitest';
import readExcelFile from 'read-excel-file/node';
import { buildDataset, DatasetError } from '../../scripts/build-data';

const WORKBOOK = 'data/NourishScope_Kentucky_County_Dataset_v1.0.xlsx';

async function readWorkbook() {
  const sheets = await readExcelFile(WORKBOOK);
  const sheet = (name: string) => sheets.find((s) => s.sheet === name)!.data as unknown[][];
  return { counties: sheet('Kentucky_Counties'), dictionary: sheet('Data_Dictionary') };
}

// --- Small in-memory fixtures -------------------------------------------------

const DICT_HEADER = ['field', 'pillar', 'description', 'source', 'status', 'key', 'source_label', 'data_year'];
const dictRow = (field: string, key: string, pillar: string, label: string, year: string | null) => [
  field, pillar, `${field} description`, 'source', 'Filled', key, label, year,
];

function fixtureDictionary(overrides: Record<string, unknown[]> = {}) {
  const rows: Record<string, unknown[]> = {
    county_name: dictRow('county_name', 'county_name', 'Identifiers', 'U.S. Census Bureau', null),
    fips: dictRow('fips', 'fips', 'Identifiers', 'U.S. Census Bureau', null),
    state: dictRow('state', 'state', 'Identifiers', 'U.S. Census Bureau', null),
    appalachian: dictRow('appalachian', 'appalachian', 'Identifiers', 'ARC', 'FY2027'),
    arc_status_fy2027: dictRow('arc_status_fy2027', 'arc_status', 'Identifiers', 'ARC', 'FY2027'),
    diabetes_pct: dictRow('diabetes_pct', 'diabetes_pct', 'Community health', 'CDC PLACES', '2022'),
    grocery_stores_per_1000: dictRow('grocery_stores_per_1000', 'grocery_stores_per_1000', 'Food system', 'USDA ERS Food Environment Atlas', '2020'),
    households_served: dictRow('households_served', 'households_served', 'User-entered', 'User-entered', null),
    ...overrides,
  };
  return [DICT_HEADER, ...Object.values(rows)];
}

const COUNTY_HEADER = ['county_name', 'fips', 'state', 'appalachian', 'arc_status_fy2027', 'diabetes_pct', 'grocery_stores_per_1000', 'households_served'];

function fixtureCounties(count: number, tweak?: (row: unknown[], i: number) => void) {
  const rows: unknown[][] = [COUNTY_HEADER];
  for (let i = 0; i < count; i++) {
    const row: unknown[] = [`County ${i + 1}`, `21${String(2 * i + 1).padStart(3, '0')}`, 'KY', 'Yes', 'Distressed', 12.0, 0.2, null];
    tweak?.(row, i);
    rows.push(row);
  }
  return rows;
}

function errorsOf(fn: () => unknown): string[] {
  try {
    fn();
  } catch (e) {
    if (e instanceof DatasetError) return e.problems;
    throw e;
  }
  return [];
}

// --- Real workbook -------------------------------------------------------------

describe('buildDataset with the real workbook', () => {
  it('produces 120 counties even though the user-entered columns are blank', async () => {
    const { counties, dictionary } = await readWorkbook();
    const result = buildDataset(counties, dictionary);
    expect(result.counties).toHaveLength(120);
    const adair = result.counties.find((c) => c.county_name === 'Adair County')!;
    expect(adair.fips).toBe('21001');
    expect(adair.arc_status).toBe('At-Risk');
    expect(adair.diabetes_pct).toBe(12.1);
    expect(adair).not.toHaveProperty('households_served');
  });

  it('labels diabetes as CDC PLACES 2022', async () => {
    const { counties, dictionary } = await readWorkbook();
    const { fields } = buildDataset(counties, dictionary);
    const diabetes = fields.find((f) => f.key === 'diabetes_pct')!;
    expect(diabetes.source_label).toBe('CDC PLACES');
    expect(diabetes.data_year).toBe('2022');
    expect(fields.find((f) => f.key === 'households_served')).toBeUndefined();
    expect(fields.filter((f) => f.public)).toHaveLength(19);
  });

  it('marks the 42 suppressed grocery values explicitly', async () => {
    const { counties, dictionary } = await readWorkbook();
    const result = buildDataset(counties, dictionary);
    const anderson = result.counties.find((c) => c.county_name === 'Anderson County')!;
    expect(anderson.grocery_stores_per_1000).toEqual({ status: 'suppressed' });
    const suppressed = result.counties.filter(
      (c) => typeof c.grocery_stores_per_1000 === 'object',
    );
    expect(suppressed).toHaveLength(42);
  });

  it('marks non-Appalachian ARC status as not applicable', async () => {
    const { counties, dictionary } = await readWorkbook();
    const result = buildDataset(counties, dictionary);
    const allen = result.counties.find((c) => c.county_name === 'Allen County')!;
    expect(allen.appalachian).toBe('No');
    expect(allen.arc_status).toEqual({ status: 'not_applicable' });
  });

  it('writes a CSV with the original headers that round-trips to the same values', async () => {
    const { counties, dictionary } = await readWorkbook();
    const result = buildDataset(counties, dictionary);
    const lines = result.csv.trim().split(/\r?\n/);
    const header = lines[0].split(',');
    const originalHeader = (counties[0] as string[]).filter(
      (h) => h !== 'households_served' && h !== 'cost_per_household',
    );
    expect(header).toEqual(originalHeader);
    expect(lines).toHaveLength(121);
    const andersonLine = lines.find((l) => l.startsWith('Anderson County,'))!;
    const cells = andersonLine.split(',');
    expect(cells[header.indexOf('grocery_stores_per_1000')]).toBe('');
    expect(cells[header.indexOf('arc_status_fy2027')]).toBe('');
    expect(cells[header.indexOf('diabetes_pct')]).toBe(String(result.counties.find((c) => c.county_name === 'Anderson County')!.diabetes_pct));
  });
});

// --- Validation with fixtures ------------------------------------------------

describe('buildDataset validation', () => {
  it('passes a well-formed 120-county fixture', () => {
    expect(errorsOf(() => buildDataset(fixtureCounties(120), fixtureDictionary()))).toEqual([]);
  });

  it('fails when the county count is not 120', () => {
    const problems = errorsOf(() => buildDataset(fixtureCounties(119), fixtureDictionary()));
    expect(problems.join('\n')).toMatch(/119 counties/);
  });

  it('fails on a blank public value, naming the county and field', () => {
    const counties = fixtureCounties(120, (row, i) => {
      if (i === 4) row[5] = null;
    });
    const problems = errorsOf(() => buildDataset(counties, fixtureDictionary()));
    expect(problems.join('\n')).toMatch(/County 5.*diabetes_pct/);
  });

  it('treats -9999 and "Not reported" as blank', () => {
    const counties = fixtureCounties(120, (row, i) => {
      if (i === 0) row[5] = -9999;
      if (i === 1) row[5] = 'Not reported';
      if (i === 2) row[6] = -9999; // grocery: allowed, becomes suppressed
    });
    const problems = errorsOf(() => buildDataset(counties, fixtureDictionary()));
    expect(problems).toHaveLength(2);
    const okCounties = fixtureCounties(120, (row, i) => {
      if (i === 2) row[6] = -9999;
    });
    const result = buildDataset(okCounties, fixtureDictionary());
    expect(result.counties[2].grocery_stores_per_1000).toEqual({ status: 'suppressed' });
  });

  it('fails when an Appalachian county has a blank ARC status', () => {
    const counties = fixtureCounties(120, (row, i) => {
      if (i === 7) row[4] = null;
    });
    const problems = errorsOf(() => buildDataset(counties, fixtureDictionary()));
    expect(problems.join('\n')).toMatch(/County 8.*arc_status/);
  });

  it('fails when a header was renamed without updating the dictionary', () => {
    const counties = fixtureCounties(120);
    counties[0] = counties[0].map((h) => (h === 'arc_status_fy2027' ? 'arc_status_fy2028' : h));
    const problems = errorsOf(() => buildDataset(counties, fixtureDictionary()));
    expect(problems.join('\n')).toMatch(/no column for key arc_status/);

    const updated = fixtureDictionary({
      arc_status_fy2027: dictRow('arc_status_fy2028', 'arc_status', 'Identifiers', 'ARC', 'FY2028'),
    });
    expect(errorsOf(() => buildDataset(counties, updated))).toEqual([]);
  });

  it('fails when a public field is missing its data year', () => {
    const dictionary = fixtureDictionary({
      diabetes_pct: dictRow('diabetes_pct', 'diabetes_pct', 'Community health', 'CDC PLACES', null),
    });
    const problems = errorsOf(() => buildDataset(fixtureCounties(120), dictionary));
    expect(problems.join('\n')).toMatch(/diabetes_pct.*data_year/);
  });

  it('fails on a non-numeric value in a numeric field', () => {
    const counties = fixtureCounties(120, (row, i) => {
      if (i === 3) row[5] = 'abc';
    });
    const problems = errorsOf(() => buildDataset(counties, fixtureDictionary()));
    expect(problems.join('\n')).toMatch(/County 4.*diabetes_pct.*number/);
  });
});
