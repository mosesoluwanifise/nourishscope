/**
 * Single owner of source labels and fixed wording (plan R23).
 * Every module and component imports this wording from here.
 */
import type { FieldInfo, NotApplicable, Suppressed } from './types';

export const SUPPRESSED_TEXT = 'Not reported (suppressed by source)';
export const NOT_APPLICABLE_TEXT = 'Not applicable';
export const UPLOAD_SOURCE_TEXT = 'Source: your upload';
export const SAMPLE_DATA_TEXT = 'Sample data (fictional)';
/** A value the user could supply but has not (households served, and coverage built on it). */
export const NOT_ENTERED_TEXT = 'Not entered';
/** Coverage when total need is 0, so it cannot be calculated whatever the user enters. */
export const COVERAGE_UNAVAILABLE_TEXT = 'Not available';

/** Why coverage is blank: households served is missing (need-only mode), or total need is 0. */
export const missingCoverageText = (needOnly: boolean) => (needOnly ? NOT_ENTERED_TEXT : COVERAGE_UNAVAILABLE_TEXT);

export function isSuppressed(value: unknown): value is Suppressed {
  return typeof value === 'object' && value !== null && (value as Suppressed).status === 'suppressed';
}

export function isNotApplicable(value: unknown): value is NotApplicable {
  return typeof value === 'object' && value !== null && (value as NotApplicable).status === 'not_applicable';
}

/** Wording for a marker value, or null when the value is an ordinary figure. */
export function markerText(value: unknown): string | null {
  if (isSuppressed(value)) return SUPPRESSED_TEXT;
  if (isNotApplicable(value)) return NOT_APPLICABLE_TEXT;
  return null;
}

export function findField(key: string, fields: readonly FieldInfo[]): FieldInfo | undefined {
  return fields.find((f) => f.key === key);
}

/** "CDC PLACES, 2022", or "CDC PLACES, 2021-2022" for a measure built from several fields. */
function sourceAndYears(keys: readonly string[], fields: readonly FieldInfo[]): string | null {
  const used = keys.map((key) => findField(key, fields));
  if (used.some((f) => !f || !f.public)) return null;
  const sources = [...new Set(used.map((f) => f!.source_label))].join(' and ');
  const years = [...new Set(used.map((f) => f!.data_year))].sort();
  const allYears = years.every((y) => /^\d{4}$/.test(y));
  const span = allYears && years.length > 1 ? `${years[0]}-${years[years.length - 1]}` : years.join(', ');
  return `${sources}, ${span}`;
}

/**
 * "Source: CDC PLACES, 2022" for a public field; null if the field has no public source.
 * Several keys label a measure built from them, e.g. the health burden score.
 */
export function sourceLabel(key: string | readonly string[], fields: readonly FieldInfo[]): string | null {
  const text = sourceAndYears(typeof key === 'string' ? [key] : key, fields);
  return text && `Source: ${text}`;
}

const DERIVED_HOW = {
  total: 'Total of county figures',
  median: 'Middle value across Kentucky counties',
} as const;

/**
 * For a figure NourishScope calculates from a field, such as a statewide total or
 * the middle county value: says so, so it is never read as a number the source publishes.
 * "Middle value across Kentucky counties, calculated by NourishScope from CDC PLACES, 2022".
 */
export function derivedLabel(key: string, how: keyof typeof DERIVED_HOW, fields: readonly FieldInfo[]): string | null {
  const text = sourceAndYears([key], fields);
  return text && `${DERIVED_HOW[how]}, calculated by NourishScope from ${text}`;
}
