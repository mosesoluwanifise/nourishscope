/**
 * Read an uploaded CSV in the browser (plan R10, R22). Only the template's
 * recognised columns are kept; anything else in the file is discarded.
 */
import Papa from 'papaparse';
import { HEALTH_MEASURES, type HealthMeasure, type HealthValues } from '../calc/types';

export const MAX_UPLOAD_BYTES = 1024 * 1024;
export const MAX_UPLOAD_ROWS = 2000;

type Column = 'communityName' | 'county' | 'fips' | 'need' | 'served' | 'cost' | 'lila' | HealthMeasure;

/** Header spellings accepted for each column (template and spec names). */
const HEADER_ALIASES: Record<string, Column> = {
  community_name: 'communityName',
  community: 'communityName',
  county: 'county',
  county_name: 'county',
  fips: 'fips',
  number_of_households_in_need: 'need',
  households_in_need: 'need',
  number_of_households_served: 'served',
  households_served: 'served',
  cost_per_household: 'cost',
  diabetes_pct: 'diabetes_pct',
  obesity_pct: 'obesity_pct',
  high_bp_pct: 'high_bp_pct',
  low_income_low_access_pct: 'lila',
};

const FIELD_LABELS: Record<'need' | 'served' | 'cost', string> = {
  need: 'Number of households in need',
  served: 'Number of households served',
  cost: 'Cost per household',
};

export interface RowIssue {
  field: 'need' | 'served' | 'cost' | HealthMeasure | 'low_income_low_access_pct';
  message: string;
}

export interface UploadRow {
  /** Spreadsheet row number (the header is row 1). */
  rowNumber: number;
  communityName: string;
  county: string | null;
  fips: string | null;
  need: number | null;
  served: number | null;
  cost: number | null;
  health: HealthValues;
  lowIncomeLowAccessPct: number | null;
  issues: RowIssue[];
}

export interface ParsedUpload {
  fileErrors: string[];
  rows: UploadRow[];
}

const MISSING = new Set(['', '-9999', 'not reported']);

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

type NumberCheck = { kind: 'whole' } | { kind: 'positive' } | { kind: 'pct' };

function readNumber(raw: string | undefined, check: NumberCheck): { value: number | null; problem?: string } {
  const text = (raw ?? '').trim();
  if (MISSING.has(text.toLowerCase())) return { value: null };
  const value = Number(text.replace(/[$,]/g, ''));
  if (!Number.isFinite(value)) return { value: null, problem: `"${text}" is not a number` };
  if (check.kind === 'whole' && (!Number.isInteger(value) || value < 0)) {
    return { value: null, problem: `"${text}" must be a whole number of 0 or more` };
  }
  if (check.kind === 'positive' && value <= 0) return { value: null, problem: `"${text}" must be more than 0` };
  if (check.kind === 'pct' && (value < 0 || value > 100)) {
    return { value: null, problem: `"${text}" must be between 0 and 100` };
  }
  return { value };
}

export function parseUpload(text: string, sizeBytes: number = text.length): ParsedUpload {
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return { fileErrors: ['This file is larger than 1 MB. Upload program totals by community only.'], rows: [] };
  }
  if (!text.trim()) return { fileErrors: ['The file is empty.'], rows: [] };

  const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ''), { skipEmptyLines: 'greedy' });
  const [headerRow, ...dataRows] = parsed.data;
  if (dataRows.length > MAX_UPLOAD_ROWS) {
    return { fileErrors: ['This file has more than 2,000 rows. Upload one row per community.'], rows: [] };
  }

  const columns = new Map<Column, number>();
  headerRow.forEach((h, i) => {
    const column = HEADER_ALIASES[normaliseHeader(h)];
    if (column && !columns.has(column)) columns.set(column, i);
  });

  const fileErrors: string[] = [];
  if (!columns.has('need')) {
    fileErrors.push(`The file has no "${FIELD_LABELS.need}" column (number_of_households_in_need). Download the template to see the expected columns.`);
  }
  if (!columns.has('county') && !columns.has('fips')) {
    fileErrors.push('The file has no "county" or "fips" column, so communities cannot be matched to Kentucky counties.');
  }
  if (fileErrors.length) return { fileErrors, rows: [] };
  if (dataRows.length === 0) return { fileErrors: ['The file has a header row but no communities.'], rows: [] };

  const rows = dataRows.map((cells, index): UploadRow => {
    const cell = (column: Column) => {
      const i = columns.get(column);
      return i === undefined ? undefined : cells[i];
    };
    const issues: RowIssue[] = [];
    const take = (column: Column, field: RowIssue['field'], label: string, check: NumberCheck) => {
      const { value, problem } = readNumber(cell(column), check);
      if (problem) issues.push({ field, message: `${label}: ${problem}.` });
      return value;
    };

    const need = take('need', 'need', FIELD_LABELS.need, { kind: 'whole' });
    if (need === null && !issues.some((i) => i.field === 'need')) {
      issues.push({ field: 'need', message: `${FIELD_LABELS.need} is blank. Enter a number for this community.` });
    }
    const served = take('served', 'served', FIELD_LABELS.served, { kind: 'whole' });
    const cost = take('cost', 'cost', FIELD_LABELS.cost, { kind: 'positive' });

    const health: HealthValues = {};
    for (const measure of HEALTH_MEASURES) {
      const value = take(measure, measure, measure, { kind: 'pct' });
      if (value !== null) health[measure] = value;
    }
    const lowIncomeLowAccessPct = take('lila', 'low_income_low_access_pct', 'low_income_low_access_pct', { kind: 'pct' });
    const textCell = (column: Column) => cell(column)?.trim() || null;

    return {
      rowNumber: index + 2,
      communityName: textCell('communityName') ?? `Row ${index + 2}`,
      county: textCell('county'),
      fips: textCell('fips'),
      need,
      served,
      cost,
      health,
      lowIncomeLowAccessPct,
      issues,
    };
  });

  return { fileErrors: [], rows };
}
