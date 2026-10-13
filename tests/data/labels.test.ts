import { describe, expect, it } from 'vitest';
import {
  isNotApplicable,
  isSuppressed,
  markerText,
  NOT_APPLICABLE_TEXT,
  sourceLabel,
  SUPPRESSED_TEXT,
} from '../../src/lib/data/labels';
import fields from '../../src/generated/fields.json';
import type { FieldInfo } from '../../src/lib/data/types';

const FIELDS = fields as FieldInfo[];

describe('sourceLabel', () => {
  it('builds the short source label from the data dictionary', () => {
    expect(sourceLabel('diabetes_pct', FIELDS)).toBe('Source: CDC PLACES, 2022');
    expect(sourceLabel('high_bp_pct', FIELDS)).toBe('Source: CDC PLACES, 2021');
    expect(sourceLabel('snap_households', FIELDS)).toBe('Source: Census ACS 5-year, 2020-2024');
    expect(sourceLabel('arc_status', FIELDS)).toBe('Source: ARC, FY2027');
  });

  it('labels a measure built from several fields with the span of their years', () => {
    expect(sourceLabel(['diabetes_pct', 'obesity_pct', 'high_bp_pct'], FIELDS)).toBe('Source: CDC PLACES, 2021-2022');
    expect(sourceLabel(['diabetes_pct', 'obesity_pct'], FIELDS)).toBe('Source: CDC PLACES, 2022');
    expect(sourceLabel(['diabetes_pct', 'county_name'], FIELDS)).toBeNull();
  });

  it('returns null for identifiers and unknown fields', () => {
    expect(sourceLabel('county_name', FIELDS)).toBeNull();
    expect(sourceLabel('no_such_field', FIELDS)).toBeNull();
  });

  it('gives every public field a label', () => {
    for (const field of FIELDS.filter((f) => f.public)) {
      expect(sourceLabel(field.key, FIELDS)).toMatch(/^Source: .+, .+$/);
    }
  });
});

describe('marker wording', () => {
  it('uses fixed wording for suppressed and not-applicable values', () => {
    expect(markerText({ status: 'suppressed' })).toBe(SUPPRESSED_TEXT);
    expect(SUPPRESSED_TEXT).toBe('Not reported (suppressed by source)');
    expect(markerText({ status: 'not_applicable' })).toBe(NOT_APPLICABLE_TEXT);
    expect(markerText(0)).toBeNull();
    expect(markerText(12.3)).toBeNull();
  });

  it('never treats zero or null as a marker', () => {
    expect(isSuppressed(0)).toBe(false);
    expect(isSuppressed(null)).toBe(false);
    expect(isNotApplicable(undefined)).toBe(false);
  });
});
