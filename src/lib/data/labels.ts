/**
 * Single owner of source labels and fixed wording (plan R23).
 * Every module and component imports this wording from here.
 */
import type { FieldInfo, NotApplicable, Suppressed } from './types';

export const SUPPRESSED_TEXT = 'Not reported (suppressed by source)';
export const NOT_APPLICABLE_TEXT = 'Not applicable';
export const UPLOAD_SOURCE_TEXT = 'Source: your upload';
export const SAMPLE_DATA_TEXT = 'Sample data (fictional)';

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

/** "Source: CDC PLACES, 2022" for a public field; null if the field has no public source. */
export function sourceLabel(key: string, fields: readonly FieldInfo[]): string | null {
  const field = findField(key, fields);
  if (!field || !field.public) return null;
  return `Source: ${field.source_label}, ${field.data_year}`;
}
