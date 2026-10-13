/**
 * Build step (plan U2): turn the Kentucky workbook into validated data files.
 *
 *   data/NourishScope_Kentucky_County_Dataset_v1.0.xlsx
 *     -> src/generated/counties.json   (stable, year-free keys)
 *     -> src/generated/fields.json     (source label + year per field)
 *     -> public/downloads/nourishscope_ky_counties_v1.0.csv (original headers)
 *
 * Any problem stops the build with a message naming the county and field.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import readExcelFile from 'read-excel-file/node';
import type { County, FieldInfo } from '../src/lib/data/types';

const EXPECTED_COUNTIES = 120;
const IDENTIFIER_KEYS = new Set(['county_name', 'fips', 'state']);
const TEXT_KEYS = new Set(['county_name', 'fips', 'state', 'appalachian', 'arc_status']);
const USER_ENTERED = 'User-entered';
const BLANK_SENTINELS = new Set(['-9999', 'not reported']);

/** Every field the app reads (the County type). Dropping one from the dictionary must fail the build. */
export const REQUIRED_KEYS: readonly string[] = [
  'county_name', 'fips', 'state', 'appalachian', 'arc_status', 'metro_nonmetro',
  'population', 'total_households', 'snap_households', 'snap_household_pct',
  'poverty_rate', 'child_poverty_rate', 'persistent_poverty', 'median_household_income',
  'diabetes_pct', 'obesity_pct', 'high_bp_pct',
  'low_income_low_access_pct', 'grocery_stores_per_1000', 'snap_retailers', 'farmers_markets', 'farmers_markets_snap',
];
/** Percentages and rates must lie between 0 and 100. */
const isPercentKey = (key: string) => key.endsWith('_pct') || key.endsWith('_rate');

export class DatasetError extends Error {
  constructor(public readonly problems: string[]) {
    super(`The county workbook has ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
    this.name = 'DatasetError';
  }
}

export interface Dataset {
  counties: County[];
  fields: FieldInfo[];
  csv: string;
}

interface DictionaryEntry extends FieldInfo {
  userEntered: boolean;
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const text = String(value).trim();
  return text === '' || BLANK_SENTINELS.has(text.toLowerCase());
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function readDictionary(rows: unknown[][], problems: string[]): DictionaryEntry[] {
  const header = rows[0].map(text);
  const col = (name: string) => header.indexOf(name);
  for (const name of ['field', 'pillar', 'key', 'source_label', 'data_year']) {
    if (col(name) === -1) problems.push(`Data_Dictionary has no "${name}" column`);
  }
  if (problems.length) return [];

  return rows.slice(1)
    .filter((row) => !isBlank(row[col('field')]))
    .map((row) => {
      const pillar = text(row[col('pillar')]);
      const key = text(row[col('key')]);
      return {
        key,
        field: text(row[col('field')]),
        pillar,
        description: text(row[col('description')]),
        source_label: text(row[col('source_label')]),
        data_year: text(row[col('data_year')]),
        public: !IDENTIFIER_KEYS.has(key) && pillar !== USER_ENTERED,
        userEntered: pillar === USER_ENTERED,
      };
    });
}

function normaliseFips(value: unknown): string {
  return text(value).replace(/\.0+$/, '').padStart(5, '0');
}

export function buildDataset(
  countyRows: unknown[][],
  dictionaryRows: unknown[][],
  requiredKeys: readonly string[] = REQUIRED_KEYS,
): Dataset {
  const problems: string[] = [];
  if (!countyRows.length || !dictionaryRows.length) throw new DatasetError(['a sheet in the workbook is empty']);
  const dictionary = readDictionary(dictionaryRows, problems);
  if (problems.length) throw new DatasetError(problems);

  const header = countyRows[0].map(text);
  const used = dictionary.filter((entry) => !entry.userEntered);

  for (const entry of used) {
    if (!entry.key) problems.push(`Data_Dictionary row "${entry.field}" has no key`);
    if (!header.includes(entry.field)) {
      problems.push(`no column for key ${entry.key}: expected a header named "${entry.field}" in Kentucky_Counties`);
    }
    if (entry.public && (!entry.source_label || !entry.data_year)) {
      problems.push(`field ${entry.key} is missing its source_label or data_year in Data_Dictionary`);
    }
  }

  const keys = new Set(used.map((e) => e.key));
  for (const key of requiredKeys) {
    if (!keys.has(key)) problems.push(`Data_Dictionary has no row with key ${key}, which the app needs`);
  }

  const dataRows = countyRows.slice(1).filter((row) => row.some((cell) => !isBlank(cell)));
  if (dataRows.length !== EXPECTED_COUNTIES) {
    problems.push(`expected ${EXPECTED_COUNTIES} counties but the workbook has ${dataRows.length} counties`);
  }
  if (problems.length) throw new DatasetError(problems);

  const counties = dataRows.map((row, index) => {
    const raw = (field: string) => row[header.indexOf(field)];
    const nameCell = raw(used.find((e) => e.key === 'county_name')!.field);
    const label = isBlank(nameCell) ? `row ${index + 2}` : text(nameCell);
    const appalachian = text(raw(used.find((e) => e.key === 'appalachian')?.field ?? ''));
    const county: Record<string, unknown> = {};

    for (const entry of used) {
      const value = raw(entry.field);
      if (isBlank(value)) {
        if (entry.key === 'grocery_stores_per_1000') {
          county[entry.key] = { status: 'suppressed' };
        } else if (entry.key === 'arc_status' && appalachian === 'No') {
          county[entry.key] = { status: 'not_applicable' };
        } else {
          problems.push(`${label}: ${entry.key} is blank`);
        }
        continue;
      }
      if (entry.key === 'fips') {
        county.fips = normaliseFips(value);
      } else if (TEXT_KEYS.has(entry.key)) {
        county[entry.key] = text(value);
      } else {
        const number = typeof value === 'number' ? value : Number(text(value));
        if (!Number.isFinite(number)) problems.push(`${label}: ${entry.key} should be a number but is "${text(value)}"`);
        else if (isPercentKey(entry.key) && (number < 0 || number > 100)) {
          problems.push(`${label}: ${entry.key} should be between 0 and 100 but is ${number}`);
        } else county[entry.key] = number;
      }
    }
    return county as unknown as County;
  });

  const seenFips = new Set<string>();
  const seenNames = new Set<string>();
  for (const c of counties) {
    if (c.fips && !/^21\d{3}$/.test(c.fips)) problems.push(`${c.county_name}: FIPS ${c.fips} is not a Kentucky county code`);
    if (seenFips.has(c.fips)) problems.push(`FIPS ${c.fips} appears more than once`);
    if (seenNames.has(c.county_name)) problems.push(`${c.county_name} appears more than once`);
    seenFips.add(c.fips);
    seenNames.add(c.county_name);
  }
  if (problems.length) throw new DatasetError(problems);

  counties.sort((a, b) => a.fips.localeCompare(b.fips));
  const fields: FieldInfo[] = used.map(({ userEntered: _userEntered, ...field }) => field);
  return { counties, fields, csv: toCsv(counties, used) };
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined || typeof value === 'object') return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(counties: County[], used: DictionaryEntry[]): string {
  const lines = [used.map((e) => csvCell(e.field)).join(',')];
  for (const county of counties) {
    const record = county as unknown as Record<string, unknown>;
    lines.push(used.map((e) => csvCell(record[e.key])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const workbook = resolve(root, 'data/NourishScope_Kentucky_County_Dataset_v1.0.xlsx');
  const sheets = await readExcelFile(workbook);
  const sheet = (name: string) => {
    const found = sheets.find((s) => s.sheet === name);
    if (!found) throw new DatasetError([`the workbook has no "${name}" sheet`]);
    return found.data as unknown[][];
  };

  const { counties, fields, csv } = buildDataset(sheet('Kentucky_Counties'), sheet('Data_Dictionary'));

  const generated = resolve(root, 'src/generated');
  mkdirSync(generated, { recursive: true });
  writeFileSync(resolve(generated, 'counties.json'), `${JSON.stringify(counties, null, 2)}\n`);
  writeFileSync(resolve(generated, 'fields.json'), `${JSON.stringify(fields, null, 2)}\n`);
  const downloads = resolve(root, 'public/downloads');
  mkdirSync(downloads, { recursive: true });
  writeFileSync(resolve(downloads, 'nourishscope_ky_counties_v1.0.csv'), csv);
  console.log(`build-data: wrote ${counties.length} counties and ${fields.length} fields`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
