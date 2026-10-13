/**
 * App state for /app and the pure `derive` step that turns it into results.
 * Kept free of Preact so it can be unit tested.
 */
import {
  equityShares,
  isPositive,
  isWholeNonNegative,
  prepareCommunities,
  runStrategy,
  sensitivity,
  STRATEGIES,
  type Community,
  type EquityShares,
  type SensitivityLevel,
  type Strategy,
  type StrategyResult,
} from '../../lib/calc';
import { COUNTIES, STATE_MEDIANS } from '../../lib/data/load';
import {
  assembleFromCounties,
  assembleFromUpload,
  EXAMPLE_COST,
  type AssembledCommunity,
  type DataSource,
  type FlaggedRow,
  type NeedSource,
} from '../../lib/data/merge';
import type { ParsedUpload, UploadRow } from '../../lib/data/parse-upload';

export interface UploadState {
  fileName: string;
  parsed: ParsedUpload;
  /** Row number -> FIPS picked by the user for a flagged row. */
  countyFixes: Record<number, string>;
  /** User chose to continue with the matched rows only. */
  continued: boolean;
}

export interface PlanState {
  source: DataSource | null;
  selectedFips: string[];
  upload: UploadState | null;
  budgetText: string;
  costText: string;
  costConfirmed: boolean;
  floorPctText: string;
  /** Kentucky-data mode: per-county overrides, keyed by community id. */
  needText: Record<string, string>;
  servedText: Record<string, string>;
  strategy: Strategy;
}

export const INITIAL_STATE: PlanState = {
  source: null,
  selectedFips: [],
  upload: null,
  budgetText: '',
  costText: String(EXAMPLE_COST),
  costConfirmed: false,
  floorPctText: '5',
  needText: {},
  servedText: {},
  strategy: 'proportional',
};

export type FieldErrors = {
  budget?: string;
  cost?: string;
  floor?: string;
  need: Record<string, string>;
  served: Record<string, string>;
};

export interface Derived {
  communities: AssembledCommunity[];
  needSources: Record<string, NeedSource>;
  flagged: FlaggedRow[];
  budget: number | null;
  cost: number | null;
  floorShare: number | null;
  errors: FieldErrors;
  warnings: Record<string, string>;
  /** A single message shown instead of results, or null when results are ready. */
  emptyMessage: string | null;
  prepared: Community[];
  results: StrategyResult[] | null;
  sensitivity: SensitivityLevel[] | null;
  equity: EquityShares[] | null;
  costConfirmed: boolean;
  /** Every community has its own cost from the file, so the global cost is unused. */
  costFromUploadForAll: boolean;
  needOnly: boolean;
  needDefinition: string;
}

const NEED_DEFINITIONS: Record<NeedSource, string> = {
  snap: 'SNAP households (U.S. Census Bureau, ACS 5-year 2020–2024)',
  user: 'Your own figures',
  upload: 'Number of households in need from your file',
  sample: 'Fictional figures from the sample data',
};

function describeNeed(sources: Set<NeedSource>): string {
  if (sources.size === 0) return '';
  if (sources.size > 1) return 'Mixed: SNAP households for some communities, your own figures for others (see table)';
  return NEED_DEFINITIONS[[...sources][0]];
}

/** "" -> null; "$1,200" -> 1200; "abc" -> NaN. */
export function parseNumberInput(text: string): number | null {
  const cleaned = text.trim().replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  return Number(cleaned);
}

/** Editing the cost counts as confirming it (plan Key Technical Decisions). */
export function withCost(state: PlanState, costText: string): PlanState {
  return { ...state, costText, costConfirmed: true };
}

/** Switching data source clears the selection and upload, but keeps budget and cost. */
export function withSource(state: PlanState, source: DataSource): PlanState {
  return { ...state, source, selectedFips: [], upload: null, needText: {}, servedText: {} };
}

export function hasUnsavedWork(state: PlanState): boolean {
  return state.upload !== null || state.selectedFips.length > 0 || state.budgetText.trim() !== '';
}

export function derive(state: PlanState, sampleRows: readonly UploadRow[]): Derived {
  const errors: FieldErrors = { need: {}, served: {} };
  const warnings: Record<string, string> = {};

  const budget = parseNumberInput(state.budgetText);
  if (budget !== null && !isPositive(budget)) errors.budget = 'Enter a budget of more than $0.';
  const cost = parseNumberInput(state.costText);
  if (cost === null || !isPositive(cost)) errors.cost = 'Enter a cost per household of more than $0.';
  const floorPct = parseNumberInput(state.floorPctText);
  if (floorPct === null || !(Number.isFinite(floorPct) && floorPct >= 0 && floorPct <= 100)) {
    errors.floor = 'Enter a minimum share between 0 and 100%.';
  }
  const globalCost = errors.cost ? EXAMPLE_COST : (cost as number);

  let communities: AssembledCommunity[] = [];
  let flagged: FlaggedRow[] = [];
  const needSources: Record<string, NeedSource> = {};

  if (state.source === 'kentucky') {
    communities = assembleFromCounties(state.selectedFips, COUNTIES, globalCost).map((c) => {
      const needText = state.needText[c.input.id];
      const servedText = state.servedText[c.input.id];
      const input = { ...c.input };
      needSources[c.input.id] = c.needSource;
      if (needText !== undefined && needText.trim() !== '') {
        const need = parseNumberInput(needText);
        if (need === null || !isWholeNonNegative(need)) {
          errors.need[c.input.id] = 'Enter a whole number of 0 or more.';
        } else {
          input.need = need;
          needSources[c.input.id] = 'user';
        }
      }
      if (servedText !== undefined && servedText.trim() !== '') {
        const served = parseNumberInput(servedText);
        if (served === null || !isWholeNonNegative(served)) errors.served[c.input.id] = 'Enter a whole number of 0 or more.';
        else input.served = served;
      }
      return { ...c, input };
    });
  } else if (state.source === 'sample' || state.source === 'upload') {
    const rows = state.source === 'sample' ? sampleRows : state.upload?.parsed.rows ?? [];
    const assembled = assembleFromUpload(rows, COUNTIES, globalCost, state.source, state.upload?.countyFixes ?? {});
    communities = assembled.communities;
    flagged = assembled.flagged;
    for (const c of communities) needSources[c.input.id] = c.needSource;
  }

  for (const c of communities) {
    const { need, served } = c.input;
    if (served !== null && served > need && !errors.served[c.input.id]) {
      warnings[c.input.id] = `Households served (${served}) is more than households in need (${need}), so households still needing help is 0.`;
    }
  }

  const costFromUploadForAll = communities.length > 0 && communities.every((c) => c.costFromUpload);
  // The global cost is unused when every community brings its own, so it cannot block results.
  const costBlocks = Boolean(errors.cost) && !costFromUploadForAll;
  const hasFieldErrors = Boolean(errors.budget || costBlocks || errors.floor)
    || Object.keys(errors.need).length > 0 || Object.keys(errors.served).length > 0;

  let emptyMessage: string | null = null;
  if (state.source === null) emptyMessage = 'Choose your data to get started.';
  else if (state.source === 'upload' && !state.upload) emptyMessage = 'Upload your CSV file to get started.';
  else if (state.source === 'upload' && state.upload?.parsed.fileErrors.length) emptyMessage = 'Fix the problem with your file, then upload it again.';
  else if (communities.length === 0 && state.source === 'kentucky') emptyMessage = 'Select at least one county to see results.';
  else if (communities.length === 0) emptyMessage = 'None of your rows matched a Kentucky county. Fix them below or download the template.';
  else if (state.source === 'upload' && flagged.length > 0 && !state.upload?.continued) {
    emptyMessage = 'Some rows need attention. Fix them below, or continue with the rows that matched.';
  } else if (budget === null) emptyMessage = 'Enter your total budget to see results.';
  else if (hasFieldErrors) emptyMessage = 'Fix the highlighted fields to see results.';

  const prepared = prepareCommunities(communities.map((c) => c.input), STATE_MEDIANS);
  const floorShare = errors.floor ? null : (floorPct as number) / 100;
  let results: StrategyResult[] | null = null;
  let sens: SensitivityLevel[] | null = null;
  let equity: EquityShares[] | null = null;
  if (emptyMessage === null && budget !== null && floorShare !== null) {
    results = STRATEGIES.map((s) => runStrategy(prepared, budget, s, { floorShare }));
    sens = sensitivity(prepared, budget, state.strategy, floorShare);
    equity = results.map((r) => equityShares(prepared, r, budget));
  }

  const sources = new Set(Object.values(needSources));
  const needDefinition = describeNeed(sources);

  return {
    communities,
    needSources,
    flagged,
    budget: errors.budget ? null : budget,
    cost: errors.cost ? null : cost,
    floorShare,
    errors,
    warnings,
    emptyMessage,
    prepared,
    results,
    sensitivity: sens,
    equity,
    costConfirmed: state.costConfirmed || costFromUploadForAll,
    costFromUploadForAll,
    needOnly: !(prepared.length > 0 && prepared.every((c) => c.servedKnown)),
    needDefinition,
  };
}
