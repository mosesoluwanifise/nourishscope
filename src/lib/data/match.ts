/**
 * Match an uploaded row to a Kentucky county (plan R10).
 * FIPS first; otherwise county name with leeway for case, spacing,
 * punctuation and a trailing "County" / "Co.". Unmatched rows are
 * flagged for the user to fix, never added as new communities.
 */
import type { County } from './types';

export type MatchResult =
  | { status: 'matched'; fips: string }
  | { status: 'flagged'; reason: FlagReason; message: string };

export type FlagReason = 'no_county' | 'county_not_recognised' | 'fips_not_found' | 'fips_name_disagree';

const KY_STATE_FIPS = '21';

/** "ADAIR CO." -> "adair", "Mc Lean" -> "mclean", "La Rue" -> "larue". */
export function countyNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/(county|co)$/, '');
}

/** "1" -> "21001", "001" -> "21001", "21001.0" -> "21001". Returns null when not digits. */
export function normaliseFips(raw: string): string | null {
  const digits = raw.trim().replace(/\.0+$/, '');
  if (!/^\d{1,5}$/.test(digits)) return null;
  if (digits.length <= 3) return `${KY_STATE_FIPS}${digits.padStart(3, '0')}`;
  return digits.padStart(5, '0');
}

export function matchCounty(
  row: { county: string | null; fips: string | null },
  counties: readonly County[],
): MatchResult {
  const name = row.county?.trim() ?? '';
  const fipsText = row.fips?.trim() ?? '';
  const byKey = (key: string) => counties.find((c) => countyNameKey(c.county_name) === key);

  if (fipsText) {
    const fips = normaliseFips(fipsText);
    const county = fips ? counties.find((c) => c.fips === fips) : undefined;
    if (!county) {
      return { status: 'flagged', reason: 'fips_not_found', message: `FIPS code "${fipsText}" is not a Kentucky county.` };
    }
    if (name && countyNameKey(name) !== countyNameKey(county.county_name)) {
      return {
        status: 'flagged',
        reason: 'fips_name_disagree',
        message: `FIPS code ${county.fips} is ${county.county_name}, but the county column says "${name}".`,
      };
    }
    return { status: 'matched', fips: county.fips };
  }

  if (name) {
    const county = byKey(countyNameKey(name));
    if (county) return { status: 'matched', fips: county.fips };
    return { status: 'flagged', reason: 'county_not_recognised', message: `"${name}" is not a Kentucky county we recognise.` };
  }

  return { status: 'flagged', reason: 'no_county', message: 'This row has no county or FIPS code.' };
}
