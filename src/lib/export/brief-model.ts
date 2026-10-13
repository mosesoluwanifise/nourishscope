/**
 * The planning brief (spec step 7). The print view and the CSV export both
 * read this one object, so they cannot drift apart.
 */
import type { Derived, PlanState } from '../../components/app/state';
import { STRATEGY_COPY } from '../copy';
import { METHODOLOGY_VERSION, TOOL_VERSION } from '../../config/site';
import { FIELDS } from '../data/load';
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
  inputs: { budget: number; cost: number; floorSharePct: number; costConfirmed: boolean };
  strategyName: string;
  rows: BriefRow[];
  totals: { reached: number; spend: number; unspent: number; coverageBefore: number | null; coverageAfter: number | null };
  comparison: { strategy: string; reached: number; spend: number; unspent: number; coverageAfter: number | null }[];
  sensitivity: { label: string; reached: number; unspent: number }[];
  equity: { flaggedCount: number; budgetPct: number; reachedPct: number };
  assumptions: string[];
}

const DATA_MODE: Record<DataSource, string> = {
  kentucky: 'Kentucky public data',
  sample: 'Sample data (fictional communities)',
  upload: 'Your uploaded data, matched to Kentucky public data',
};

export const ASSUMPTIONS = [
  'Households reached are rounded down: a partly funded household is not counted.',
  'Unspent money is reported, not redistributed.',
  'The health burden score compares each county with fixed Kentucky medians from all 120 counties (diabetes 12.3%, obesity 40.3%, high blood pressure 36.7%).',
  'Health figures are county-level, age-adjusted adult prevalence from CDC PLACES (2024 release). They describe the county, not your participants.',
  'SNAP households estimate need; they are not a count of households eligible for or interested in your program.',
  'Public figures come from different years (2018–2024); see the source and year beside each figure.',
];

function dataSourcesList(source: DataSource): Brief['dataSources'] {
  const bySource = new Map<string, Set<string>>();
  for (const f of FIELDS.filter((f) => f.public)) {
    if (!bySource.has(f.source_label)) bySource.set(f.source_label, new Set());
    bySource.get(f.source_label)!.add(f.data_year);
  }
  const list = [...bySource].map(([s, years]) => ({ source: s, years: [...years].sort().join(', ') }));
  if (source !== 'kentucky') list.push({ source: source === 'sample' ? 'Fictional sample communities' : 'Your uploaded file', years: '—' });
  return list;
}

const NEED_SOURCE_TEXT = { snap: 'SNAP households', user: 'Entered by you', upload: 'Your file' } as const;

/** Returns null until results exist. */
export function buildBrief(state: PlanState, derived: Derived, now: Date): Brief | null {
  if (!derived.results || !state.source || derived.budget === null || derived.floorShare === null) return null;
  const strategyIndex = derived.results.findIndex((r) => r.strategy === state.strategy);
  const result = derived.results[strategyIndex];
  const equity = derived.equity![strategyIndex];

  return {
    generatedOn: now.toISOString().slice(0, 10),
    toolVersion: TOOL_VERSION,
    methodologyVersion: METHODOLOGY_VERSION,
    dataMode: DATA_MODE[state.source],
    isSample: state.source === 'sample',
    dataSources: dataSourcesList(state.source),
    needDefinition: derived.needDefinition,
    inputs: {
      budget: derived.budget,
      cost: derived.cost ?? NaN,
      floorSharePct: derived.floorShare * 100,
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
