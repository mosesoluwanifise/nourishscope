/** CSV export of the planning brief, built in the browser (plan R12). */
import type { Brief } from './brief-model';
import { NOT_ENTERED_TEXT } from '../data/labels';

const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One CSV cell. User-supplied text that could start a spreadsheet formula
 * gets a single-quote prefix; numbers are never altered.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  // Quote on ';' too: Excel in some locales splits on it, which could expose a formula-leading fragment.
  return /[",;\r\n\t]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The cost line: the entered value, or where per-community costs came from. */
export function costText(brief: Brief): string | number {
  if (brief.inputs.costSource === 'file') return 'Per community, from your file (see table)';
  if (brief.inputs.costSource === 'mixed') return `${brief.inputs.cost} unless your file gives a community its own cost (see table)`;
  return brief.inputs.cost ?? '';
}

const line = (cells: (string | number | null | undefined)[]) => cells.map(csvCell).join(',');

export function briefToCsv(brief: Brief): string {
  const lines: string[] = [];
  lines.push(line(['NourishScope planning brief']));
  lines.push(line(['Date', brief.generatedOn]));
  lines.push(line(['Tool version', brief.toolVersion]));
  lines.push(line(['Methodology version', brief.methodologyVersion]));
  lines.push(line(['Data mode', brief.dataMode]));
  lines.push(line(['Definition of need used', brief.needDefinition]));
  lines.push(line(['Budget', brief.inputs.budget]));
  lines.push(line(['Cost per household', costText(brief)]));
  lines.push(line(['Minimum for every community (%)', brief.inputs.floorSharePct]));
  if (brief.inputs.costSource !== 'file') {
    lines.push(line(['Cost confirmed by user', brief.inputs.costConfirmed ? 'Yes' : 'No']));
  }
  lines.push(line(['Strategy shown per community', brief.strategyName]));
  for (const s of brief.dataSources) lines.push(line(['Data source', s.source, s.years]));
  lines.push('');

  lines.push(line(['Community', 'County', 'Number of households in need', 'Need source', 'Number of households served',
    'Households still needing help', 'Health burden score', 'Rural or distressed', 'Cost per household',
    'Allocation', 'Households reached', 'Spend']));
  for (const r of brief.rows) {
    lines.push(line([r.community, r.county, r.need, r.needSource, r.served ?? NOT_ENTERED_TEXT, r.unmet, r.healthIndex, r.flag,
      r.cost, r.allocation, r.reached, r.spend]));
  }
  lines.push(line(['Total', '', '', '', '', '', '', '', '', '', brief.totals.reached, brief.totals.spend]));
  lines.push(line(['Unspent', brief.totals.unspent]));
  if (brief.totals.coverageBefore !== null) {
    lines.push(line(['Coverage before (%)', brief.totals.coverageBefore]));
    lines.push(line(['Coverage after (%)', brief.totals.coverageAfter]));
  } else {
    lines.push(line(['Coverage', NOT_ENTERED_TEXT]));
  }
  lines.push('');

  lines.push(line(['Strategy', 'Households reached', 'Spend', 'Unspent', 'Coverage after (%)']));
  for (const c of brief.comparison) lines.push(line([c.strategy, c.reached, c.spend, c.unspent, c.coverageAfter ?? NOT_ENTERED_TEXT]));
  lines.push('');

  lines.push(line(['Cost sensitivity', 'Households reached', 'Unspent']));
  for (const s of brief.sensitivity) lines.push(line([s.label, s.reached, s.unspent]));
  lines.push('');

  lines.push(line(['Rural or distressed communities', brief.equity.flaggedCount]));
  lines.push(line(['Share of budget to them (%)', brief.equity.budgetPct]));
  lines.push(line(['Share of households reached in them (%)', brief.equity.reachedPct]));
  lines.push('');
  lines.push(line(['Assumptions and limitations']));
  for (const a of brief.assumptions) lines.push(line([a]));

  return `${lines.join('\r\n')}\r\n`;
}
