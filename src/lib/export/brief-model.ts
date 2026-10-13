/**
 * The planning brief (spec step 7). The print view and the CSV export both
 * read this one object, so they cannot drift apart.
 */
import type { Derived, PlanState } from '../../components/app/state';
import type { EquityShares, ResultTotals } from '../calc';
import { STRATEGY_COPY } from '../copy';
import { METHODOLOGY_VERSION, TOOL_VERSION } from '../../config/site';
import { roundHalfEven } from '../calc/rounding';
import { FIELDS, STATE_MEDIANS } from '../data/load';
import { NOT_APPLICABLE_TEXT } from '../data/labels';
import { formatPct } from '../format';
import type { DataSource } from '../data/merge';

export interface BriefRow {
  community: string;
  county: string;
  need: number;
  needSource: string;
  served: number | null;
  unmet: number;
  healthIndex: number;
  flag: string;
  cost: number;
  allocation: number;
  reached: number;
  spend: number;
}

export interface Brief {
  generatedOn: string;
  toolVersion: string;
  methodologyVersion: string;
  dataMode: string;
  isSample: boolean;
  dataSources: { source: string; years: string }[];
  needDefinition: string;
  inputs: {
    budget: number;
    /** The global cost per household; null when every community's cost came from the file. */
    cost: number | null;
    costSource: 'entered' | 'file' | 'mixed';
    floorSharePct: number;
    costConfirmed: boolean;
  };
  strategyName: string;
  rows: BriefRow[];
  totals: ResultTotals;
  comparison: { strategy: string; reached: number; spend: number; unspent: number; coverageAfter: number | null }[];
  sensitivity: { label: string; reached: number; unspent: number }[];
  equity: EquityShares;
  assumptions: string[];
}

const DATA_MODE: Record<DataSource, string> = {
  kentucky: 'Kentucky public data',
  sample: 'Sample data (fictional communities)',
  upload: 'Your uploaded data, matched to Kentucky public data',
};

/** "2017-2024": the span of calendar years across the public fields (fiscal-year labels excluded). */
function publicYearSpan(): string {
  const years = FIELDS.filter((f) => f.public && !f.data_year.startsWith('FY'))
    .flatMap((f) => f.data_year.match(/\d{4}/g) ?? [])
    .map(Number);
  return `${Math.min(...years)}-${Math.max(...years)}`;
}

export const ASSUMPTIONS = [
  'Households reached are rounded down: a partly funded household is not counted.',
  'Unspent money is reported, not redistributed.',
  `The health burden score compares each county with fixed Kentucky medians from all 120 counties (diabetes ${formatPct(STATE_MEDIANS.diabetes_pct)}, obesity ${formatPct(STATE_MEDIANS.obesity_pct)}, high blood pressure ${formatPct(STATE_MEDIANS.high_bp_pct)}).`,
  'Health figures are county-level, age-adjusted adult prevalence from CDC PLACES (2024 release). They describe the county, not your participants.',
  'SNAP households estimate need; they are not a count of households eligible for or interested in your program.',
  `Public figures come from different years (${publicYearSpan()}); see the source and year beside each figure.`,
];

function dataSourcesList(source: DataSource): Brief['dataSources'] {
  const bySource = new Map<string, Set<string>>();
  for (const f of FIELDS.filter((f) => f.public)) {
    if (!bySource.has(f.source_label)) bySource.set(f.source_label, new Set());
    bySource.get(f.source_label)!.add(f.data_year);
  }
  const list = [...bySource].map(([s, years]) => ({ source: s, years: [...years].sort().join(', ') }));
  if (source !== 'kentucky') list.push({ source: source === 'sample' ? 'Fictional sample communities' : 'Your uploaded file', years: NOT_APPLICABLE_TEXT });
  return list;
}

const NEED_SOURCE_TEXT = { snap: 'SNAP households', user: 'Entered by you', upload: 'Your file', sample: 'Sample data (fictional)' } as const;

/** YYYY-MM-DD in the user's own time zone (an evening export is not dated tomorrow). */
export function localIsoDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function costSourceOf(derived: Derived): Brief['inputs']['costSource'] {
  if (derived.costFromUploadForAll) return 'file';
  return derived.communities.some((c) => c.costFromUpload) ? 'mixed' : 'entered';
}

/** Returns null until results exist. */
export function buildBrief(state: PlanState, derived: Derived, now: Date): Brief | null {
  if (!derived.results || !state.source || derived.budget === null || derived.floorShare === null) return null;
  const strategyIndex = derived.results.findIndex((r) => r.strategy === state.strategy);
  const result = derived.results[strategyIndex];
  const equity = derived.equity![strategyIndex];

  return {
    generatedOn: localIsoDate(now),
    toolVersion: TOOL_VERSION,
    methodologyVersion: METHODOLOGY_VERSION,
    dataMode: DATA_MODE[state.source],
    isSample: state.source === 'sample',
    dataSources: dataSourcesList(state.source),
    needDefinition: derived.needDefinition,
    inputs: {
      budget: derived.budget,
      cost: derived.costFromUploadForAll ? null : derived.cost,
      costSource: costSourceOf(derived),
      floorSharePct: roundHalfEven(derived.floorShare * 100, 6),
      costConfirmed: derived.costConfirmed,
    },
    strategyName: STRATEGY_COPY[state.strategy].name,
    rows: derived.prepared.map((c, i) => ({
      community: c.name,
      county: derived.communities[i].county.county_name,
      need: c.need,
      needSource: NEED_SOURCE_TEXT[derived.needSources[c.id] ?? 'snap'],
      served: c.served,
      unmet: c.unmet,
      healthIndex: Number(c.H.toFixed(3)),
      flag: c.flagged ? 'Rural or distressed' : '',
      cost: c.cost,
      allocation: result.rows[i].allocation,
      reached: result.rows[i].reached,
      spend: result.rows[i].spend,
    })),
    totals: result.totals,
    comparison: derived.results.map((r) => ({
      strategy: STRATEGY_COPY[r.strategy].name,
      reached: r.totals.reached,
      spend: r.totals.spend,
      unspent: r.totals.unspent,
      coverageAfter: r.totals.coverageAfter,
    })),
    sensitivity: derived.sensitivity!.map((s) => ({
      label: s.factor === 1 ? 'Cost as entered' : `Cost ${s.factor < 1 ? '−' : '+'}${Math.round(Math.abs(1 - s.factor) * 100)}%`,
      reached: s.reached,
      unspent: s.unspent,
    })),
    equity,
    assumptions: ASSUMPTIONS,
  };
}
