/**
 * The /app planning tool (plan U5–U7): one page, three stages.
 *   1. Your data   2. Your program   3. Results
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import sampleCsv from '../../../data/sample/nourishscope_sample_communities.csv?raw';
import type { Strategy } from '../../lib/calc';
import { STRATEGY_COPY } from '../../lib/copy';
import { SAMPLE_DATA_TEXT } from '../../lib/data/labels';
import type { DataSource } from '../../lib/data/merge';
import { parseUpload } from '../../lib/data/parse-upload';
import { buildBrief } from '../../lib/export/brief-model';
import { formatCurrency, formatInt } from '../../lib/format';
import CountySelector from './CountySelector';
import DataSourcePicker from './DataSourcePicker';
import Evaluation from './Evaluation';
import ExportPanel from './ExportPanel';
import Inputs from './Inputs';
import PrintBrief from './PrintBrief';
import {
  EquityPanel,
  FoodModule,
  HealthModule,
  NutritionModule,
  SensitivityPanel,
  StrategyComparison,
} from './Results';
import { derive, hasUnsavedWork, INITIAL_STATE, withCost, withSource, type PlanState } from './state';
import UploadPanel from './UploadPanel';
import './app.css';

const SAMPLE_ROWS = parseUpload(sampleCsv).rows;

const SECTIONS = [
  ['module-nutrition', 'Nutrition Program Planning'],
  ['module-health', 'Community Health Context'],
  ['module-food', 'Food System and Access'],
  ['compare', 'Compare strategies'],
  ['sensitivity', 'Cost sensitivity'],
  ['equity', 'Equity'],
  ['evaluation', 'Evaluation'],
  ['export', 'Save or export'],
] as const;

function currentSourceLabel(state: PlanState): string | null {
  if (state.source === 'sample') return SAMPLE_DATA_TEXT;
  if (state.source === 'kentucky') return 'Kentucky county data';
  if (state.source === 'upload') return state.upload ? `Your file: ${state.upload.fileName}` : 'Your file';
  return null;
}

export default function App() {
  const [state, setState] = useState<PlanState>(INITIAL_STATE);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const derived = useMemo(() => derive(state, SAMPLE_ROWS), [state]);
  const brief = useMemo(() => buildBrief(state, derived, new Date()), [state, derived]);
  const update = (patch: Partial<PlanState>) => setState((s) => ({ ...s, ...patch }));

  // Mark the island as hydrated so the shell's failure handler stays quiet.
  useEffect(() => {
    document.documentElement.dataset.appReady = 'true';
  }, []);

  // Warn before leaving once there is work to lose (no persistence in v1.0).
  const unsaved = hasUnsavedWork(state);
  useEffect(() => {
    if (!unsaved) return;
    // preventDefault() is the standard way to ask the browser to confirm leaving.
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsaved]);

  // Announce a one-line summary once input settles, never per keystroke.
  const selected = derived.results?.find((r) => r.strategy === state.strategy);
  const summary = selected
    ? `Results updated: ${formatInt(selected.totals.reached)} households reached, ${formatCurrency(selected.totals.unspent)} unspent, using ${STRATEGY_COPY[state.strategy].name}.`
    : derived.emptyMessage ?? '';
  const timer = useRef<number>();
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAnnouncement(summary), 500);
    return () => window.clearTimeout(timer.current);
  }, [summary]);

  // Opening the preview moves focus to the brief so it is not missed below the tool.
  useEffect(() => {
    if (previewOpen) document.getElementById('planning-brief')?.focus();
  }, [previewOpen]);

  /** Returns false when the user cancels the switch. */
  const chooseSource = (source: DataSource): boolean => {
    if (source === state.source) return true;
    if (hasUnsavedWork({ ...state, budgetText: '' })
      && !window.confirm('Switching data clears your selected counties or uploaded file. Your budget and cost stay. Continue?')) {
      return false;
    }
    setState((s) => withSource(s, source));
    return true;
  };

  const sourceLabel = currentSourceLabel(state);

  return (
    <div class="planner">
      <div class="planner__ui no-print">
        <section class="stage" aria-labelledby="stage-data">
          <h2 id="stage-data"><span class="stage__number">1</span> Your data</h2>
          {sourceLabel && <p class="current-source">Using: <strong>{sourceLabel}</strong></p>}
          <DataSourcePicker source={state.source} onChoose={chooseSource} />
          {state.source === 'upload' && (
            <UploadPanel
              upload={state.upload}
              communities={derived.communities}
              flagged={derived.flagged}
              onUpload={(upload) => update({ upload })}
              onFix={(row, fips) => setState((s) => s.upload
                ? { ...s, upload: { ...s.upload, countyFixes: { ...s.upload.countyFixes, [row]: fips } } }
                : s)}
              onContinue={() => setState((s) => s.upload ? { ...s, upload: { ...s.upload, continued: true } } : s)}
            />
          )}
          {state.source === 'sample' && (
            <p class="callout callout--warning">
              <strong>{SAMPLE_DATA_TEXT}.</strong> These six communities are made up to show how the tool works.
              Results and exports are labelled as sample data.
            </p>
          )}
        </section>

        <div class="planner__body">
          <section class="stage stage--inputs" aria-labelledby="stage-program" id="your-program">
            <h2 id="stage-program"><span class="stage__number">2</span> Your program</h2>
            {state.source === 'kentucky' && (
              <CountySelector selected={state.selectedFips}
                onChange={(next) => setState((s) => ({ ...s, selectedFips: next(s.selectedFips) }))} />
            )}
            <Inputs
              state={state}
              derived={derived}
              setBudget={(budgetText) => update({ budgetText })}
              setCost={(costText) => setState((s) => withCost(s, costText))}
              setCostConfirmed={(costConfirmed) => update({ costConfirmed })}
              setFloor={(floorPctText) => update({ floorPctText })}
              setNeed={(id, v) => setState((s) => ({ ...s, needText: { ...s.needText, [id]: v } }))}
              setServed={(id, v) => setState((s) => ({ ...s, servedText: { ...s.servedText, [id]: v } }))}
            />
          </section>

          <section class="stage stage--results" aria-labelledby="stage-results">
            <h2 id="stage-results"><span class="stage__number">3</span> Results</h2>
            <div class="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</div>
            {derived.emptyMessage ? (
              <p class="callout empty-state">{derived.emptyMessage}</p>
            ) : (
              <>
                <nav aria-label="Results sections" class="section-nav">
                  <ul>{SECTIONS.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ul>
                </nav>
                <p class="change-inputs"><a href="#your-program">Change inputs</a></p>
                <NutritionModule derived={derived} strategy={state.strategy} />
                <HealthModule derived={derived} />
                <FoodModule derived={derived} />
                <StrategyComparison derived={derived} strategy={state.strategy}
                  setStrategy={(strategy: Strategy) => update({ strategy })} />
                <SensitivityPanel derived={derived} strategy={state.strategy} />
                <EquityPanel derived={derived} strategy={state.strategy} />
              </>
            )}
            <Evaluation />
            <ExportPanel brief={brief} costConfirmed={derived.costConfirmed}
              previewOpen={previewOpen} setPreviewOpen={setPreviewOpen} />
          </section>
        </div>
      </div>
      {brief && <PrintBrief brief={brief} visible={previewOpen} />}
    </div>
  );
}
