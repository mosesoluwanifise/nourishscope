/**
 * Turn Kentucky county data, sample data or an upload into the engine's
 * community inputs (spec section 1, plan R26/R27).
 */
import { isFlagged } from '../calc/equity';
import { HEALTH_MEASURES, type CommunityInput, type HealthValues } from '../calc/types';
import { countyIndex, matchCounty, type MatchResult } from './match';
import type { UploadRow } from './parse-upload';
import type { County } from './types';

/** Pre-filled cost per household, labelled "Example only" in the app. */
export const EXAMPLE_COST = 100;

export type DataSource = 'kentucky' | 'sample' | 'upload';

/** 'user' means the person replaced a county's SNAP default in the app. */
export type NeedSource = 'snap' | 'user' | 'upload' | 'sample';

export interface AssembledCommunity {
  input: CommunityInput;
  county: County;
  source: DataSource;
  /** Where "number of households in need" came from, for the planning brief. */
  needSource: NeedSource;
  costFromUpload: boolean;
  /** Public fields the upload replaced (spec section 1). */
  overrides: string[];
  lowIncomeLowAccessPct: number;
  rowNumber: number | null;
}

export interface FlaggedRow {
  row: UploadRow;
  match: MatchResult;
  problems: string[];
}

function countyHealth(county: County): HealthValues {
  return { diabetes_pct: county.diabetes_pct, obesity_pct: county.obesity_pct, high_bp_pct: county.high_bp_pct };
}

/** Built-in Kentucky data: need = SNAP households, served blank, one global cost. */
export function assembleFromCounties(
  fipsList: readonly string[],
  counties: readonly County[],
  globalCost: number,
): AssembledCommunity[] {
  const { byFips } = countyIndex(counties);
  return fipsList
    .map((fips) => byFips.get(fips))
    .filter((c): c is County => Boolean(c))
    .map((county) => ({
      input: {
        id: county.fips,
        name: county.county_name,
        need: county.snap_households,
        served: null,
        cost: globalCost,
        health: countyHealth(county),
        flagged: isFlagged(county),
      },
      county,
      source: 'kentucky' as const,
      needSource: 'snap' as NeedSource,
      costFromUpload: false,
      overrides: [],
      lowIncomeLowAccessPct: county.low_income_low_access_pct,
      rowNumber: null,
    }));
}

/**
 * Upload (or sample) data: each row is matched to a county. Uploaded values
 * replace public values only for the fields filled in. A row with a county
 * problem or an invalid value is flagged, never dropped.
 *
 * `countyFixes` maps a row number to the FIPS the user picked for a flagged row.
 */
export function assembleFromUpload(
  rows: readonly UploadRow[],
  counties: readonly County[],
  globalCost: number,
  source: Extract<DataSource, 'sample' | 'upload'>,
  countyFixes: Readonly<Record<number, string>> = {},
): { communities: AssembledCommunity[]; flagged: FlaggedRow[] } {
  const communities: AssembledCommunity[] = [];
  const flagged: FlaggedRow[] = [];
  const { byFips } = countyIndex(counties);

  for (const row of rows) {
    const fix = countyFixes[row.rowNumber];
    const match: MatchResult = fix ? { status: 'matched', fips: fix } : matchCounty(row, counties);
    const problems = row.issues.map((i) => i.message);
    if (match.status === 'flagged') problems.unshift(match.message);
    const county = match.status === 'matched' ? byFips.get(match.fips) : undefined;

    if (!county || problems.length || row.need === null) {
      flagged.push({ row, match, problems });
      continue;
    }

    const health = countyHealth(county);
    const overrides: string[] = [];
    for (const measure of HEALTH_MEASURES) {
      const value = row.health[measure];
      if (typeof value === 'number') {
        health[measure] = value;
        overrides.push(measure);
      }
    }
    if (row.lowIncomeLowAccessPct !== null) overrides.push('low_income_low_access_pct');

    communities.push({
      input: {
        id: `row-${row.rowNumber}`,
        name: row.communityName,
        need: row.need,
        served: row.served,
        cost: row.cost ?? globalCost,
        health,
        flagged: isFlagged(county),
      },
      county,
      source,
      needSource: source === 'sample' ? 'sample' : 'upload',
      costFromUpload: row.cost !== null,
      overrides,
      lowIncomeLowAccessPct: row.lowIncomeLowAccessPct ?? county.low_income_low_access_pct,
      rowNumber: row.rowNumber,
    });
  }
  return { communities, flagged };
}
