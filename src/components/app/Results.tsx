/**
 * Results across the three modules (plan U6). Every figure column carries
 * its source label; suppressed values use the fixed wording from labels.ts.
 */
import { HEALTH_MEASURES, STRATEGIES, type Strategy } from '../../lib/calc';
import { STATE_MEDIANS } from '../../lib/data/load';
import { STRATEGY_COPY, TERM_COPY } from '../../lib/copy';
import { formatCurrency, formatDataValue, formatInt, formatPct } from '../../lib/format';
import { withBase } from '../../config/site';
import { NOT_ENTERED_TEXT } from '../../lib/data/labels';
import SourceLabel from '../SourceLabel';
import TableWrap from '../TableWrap';
import BarChart from './BarChart';
import type { Derived } from './state';

interface Props {
  derived: Derived;
  strategy: Strategy;
  setStrategy: (s: Strategy) => void;
}

type StrategyProps = Omit<Props, 'setStrategy'>;

const methodologyLink = (anchor: string) => withBase(`/methodology#${anchor}`);

/** Coverage is blank either because households served is missing or because total need is 0. */
const coverageText = (value: number | null, needOnly: boolean) =>
  value !== null ? formatPct(value) : needOnly ? NOT_ENTERED_TEXT : 'Not available';

export function NutritionModule({ derived, strategy }: StrategyProps) {
  const index = STRATEGIES.indexOf(strategy);
  const result = derived.results![index];
  const { prepared, communities } = derived;
  const showCounty = communities.some((c) => c.source !== 'kentucky');

  return (
    <section aria-labelledby="module-nutrition" class="module">
      <h3 id="module-nutrition">Nutrition Program Planning</h3>
      <p>
        Showing <strong>{STRATEGY_COPY[strategy].name}</strong>. {STRATEGY_COPY[strategy].explain}{' '}
        Change it under <a href="#compare">Compare strategies</a>.
      </p>
      {result.totals.coverageBefore === null || result.totals.coverageAfter === null ? (
        <p class="callout">
          Coverage: {derived.needOnly ? NOT_ENTERED_TEXT : 'Not available'} <br />
          {derived.needOnly
            ? 'Enter the number of households served for every community to see coverage.'
            : 'Coverage cannot be calculated because the total number of households in need is 0.'}
        </p>
      ) : (
        <p class="callout">
          Coverage before: <strong>{formatPct(result.totals.coverageBefore)}</strong>. Coverage after this plan:{' '}
          <strong>{formatPct(result.totals.coverageAfter)}</strong>.
        </p>
      )}
      <TableWrap label="Allocation by community" class="nutrition__table">
        <table>
          <caption>Allocation by community: {STRATEGY_COPY[strategy].name}</caption>
          <thead>
            <tr>
              <th scope="col">Community</th>
              {showCounty && <th scope="col">County</th>}
              <th scope="col" class="num">{TERM_COPY.need.name}</th>
              <th scope="col" class="num">{TERM_COPY.served.name}</th>
              <th scope="col" class="num">{TERM_COPY.unmet.name}</th>
              <th scope="col">{TERM_COPY.equityFlag.name}</th>
              <th scope="col" class="num">Allocation</th>
              <th scope="col" class="num">Households reached</th>
              <th scope="col" class="num">Spend</th>
            </tr>
          </thead>
          <tbody>
            {prepared.map((c, i) => (
              <tr key={c.id}>
                <th scope="row">{c.name}</th>
                {showCounty && <td>{communities[i].county.county_name}</td>}
                <td class="num">
                  {formatInt(c.need)}
                  {derived.needSources[c.id] === 'snap' && <SourceLabel field="snap_households" />}
                  {derived.needSources[c.id] === 'upload' && <SourceLabel field="snap_households" uploaded />}
                </td>
                <td class="num">{c.served === null ? NOT_ENTERED_TEXT : formatInt(c.served)}</td>
                <td class="num">{formatInt(c.unmet)}</td>
                <td>{c.flagged ? 'Yes' : 'No'}</td>
                <td class="num">{formatCurrency(result.rows[i].allocation)}</td>
                <td class="num">{formatInt(result.rows[i].reached)}</td>
                <td class="num">{formatCurrency(result.rows[i].spend)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={showCounty ? 7 : 6}>Total (unspent: {formatCurrency(result.totals.unspent)})</th>
              <td class="num">{formatInt(result.totals.reached)}</td>
              <td class="num">{formatCurrency(result.totals.spend)}</td>
            </tr>
          </tfoot>
        </table>
      </TableWrap>
      <ul class="nutrition__cards" aria-label={`Allocation by community: ${STRATEGY_COPY[strategy].name}`}>
        {prepared.map((c, i) => (
          <li key={c.id} class="card">
            <h4>{c.name}{showCounty && <span class="nutrition__county">{communities[i].county.county_name}</span>}</h4>
            <p class="nutrition__lead">
              <span class="nutrition__amount">{formatCurrency(result.rows[i].allocation)}</span>
              <span>{formatInt(result.rows[i].reached)} households reached</span>
            </p>
            <dl>
              <div>
                <dt>
                  {TERM_COPY.need.name}
                  {derived.needSources[c.id] === 'snap' && <SourceLabel field="snap_households" />}
                  {derived.needSources[c.id] === 'upload' && <SourceLabel field="snap_households" uploaded />}
                </dt>
                <dd>{formatInt(c.need)}</dd>
              </div>
              <div><dt>{TERM_COPY.served.name}</dt><dd>{c.served === null ? NOT_ENTERED_TEXT : formatInt(c.served)}</dd></div>
              <div><dt>{TERM_COPY.unmet.name}</dt><dd>{formatInt(c.unmet)}</dd></div>
              <div><dt>{TERM_COPY.equityFlag.name}</dt><dd>{c.flagged ? 'Yes' : 'No'}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
      <p class="nutrition__total">
        Total: <strong>{formatInt(result.totals.reached)}</strong> households reached, <strong>{formatCurrency(result.totals.spend)}</strong> spent,{' '}
        <strong>{formatCurrency(result.totals.unspent)}</strong> unspent.
      </p>
      <p class="field__hint">
        Households reached are rounded down: a partly funded household is not counted. Unspent money is reported, not
        moved to other communities. <a href={methodologyLink('results')}>How is this calculated?</a>
      </p>
    </section>
  );
}

export function HealthModule({ derived }: { derived: Derived }) {
  const { prepared, communities } = derived;
  const measures = [
    ['diabetes_pct', 'Diabetes'],
    ['obesity_pct', 'Obesity'],
    ['high_bp_pct', 'High blood pressure'],
  ] as const;
  return (
    <section aria-labelledby="module-health" class="module">
      <h3 id="module-health">Community Health Context</h3>
      <p>
        Adult prevalence, age-adjusted, for each community’s county. The {TERM_COPY.healthIndex.name.toLowerCase()} compares
        these with the Kentucky middle: {TERM_COPY.healthIndex.explain}
      </p>
      <TableWrap label="Health measures by community">
        <table>
          <caption>Health measures by community</caption>
          <thead>
            <tr>
              <th scope="col">Community</th>
              {measures.map(([key, label]) => (
                <th scope="col" class="num" key={key}>{label}<SourceLabel field={key} /></th>
              ))}
              <th scope="col" class="num">{TERM_COPY.healthIndex.name}<SourceLabel field={HEALTH_MEASURES} /></th>
            </tr>
          </thead>
          <tbody>
            {prepared.map((c, i) => (
              <tr key={c.id}>
                <th scope="row">{c.name}</th>
                {measures.map(([key]) => (
                  <td class="num" key={key}>
                    {formatDataValue(c.health[key], 'pct')}
                    {communities[i].overrides.includes(key) && <SourceLabel field={key} uploaded />}
                  </td>
                ))}
                <td class="num">{c.H.toFixed(2)}</td>
              </tr>
            ))}
            <tr class="row-reference">
              <th scope="row">Kentucky middle (all 120 counties)</th>
              {measures.map(([key]) => <td class="num" key={key}>{formatPct(STATE_MEDIANS[key])}</td>)}
              <td class="num">1.0</td>
            </tr>
          </tbody>
        </table>
      </TableWrap>
    </section>
  );
}

export function FoodModule({ derived }: { derived: Derived }) {
  const { prepared, communities } = derived;
  return (
    <section aria-labelledby="module-food" class="module">
      <h3 id="module-food">Food System and Access</h3>
      <p>Food access and food retail for each community’s county.</p>
      <TableWrap label="Food access by community">
        <table>
          <caption>Food access by community</caption>
          <thead>
            <tr>
              <th scope="col">Community</th>
              <th scope="col" class="num">Low income and low access to a store<SourceLabel field="low_income_low_access_pct" /></th>
              <th scope="col" class="num">Grocery stores per 1,000 residents<SourceLabel field="grocery_stores_per_1000" /></th>
              <th scope="col" class="num">SNAP-authorized stores<SourceLabel field="snap_retailers" /></th>
              <th scope="col" class="num">Farmers markets<SourceLabel field="farmers_markets" /></th>
              <th scope="col" class="num">Farmers markets accepting SNAP<SourceLabel field="farmers_markets_snap" /></th>
            </tr>
          </thead>
          <tbody>
            {prepared.map((c, i) => {
              const a = communities[i];
              return (
                <tr key={c.id}>
                  <th scope="row">{c.name}</th>
                  <td class="num">
                    {formatPct(a.lowIncomeLowAccessPct)}
                    {a.overrides.includes('low_income_low_access_pct') && <SourceLabel field="low_income_low_access_pct" uploaded />}
                  </td>
                  <td class={`num${typeof a.county.grocery_stores_per_1000 === 'object' ? ' marker-text' : ''}`}>
                    {formatDataValue(a.county.grocery_stores_per_1000)}
                  </td>
                  <td class="num">{formatInt(a.county.snap_retailers)}</td>
                  <td class="num">{formatInt(a.county.farmers_markets)}</td>
                  <td class="num">{formatInt(a.county.farmers_markets_snap)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </section>
  );
}

export function StrategyComparison({ derived, strategy, setStrategy }: Props) {
  const results = derived.results!;
  const equity = derived.equity!;
  return (
    <section aria-labelledby="compare-heading" class="module" id="compare">
      <h3 id="compare-heading" tabIndex={-1}>Compare strategies</h3>
      <p>
        The same budget, divided five ways. Choose one to see it community by community in the planning table. You can
        also change it in the <a href="#summary">summary</a>.
      </p>
      <fieldset class="strategy-choice">
        <legend>Show in the planning table and brief</legend>
        {STRATEGIES.map((s) => (
          <label class="strategy-option" key={s}>
            <input type="radio" name="strategy" value={s} checked={strategy === s} onChange={() => setStrategy(s)} />
            <span>
              <strong>{STRATEGY_COPY[s].name}</strong>
              <span class="strategy-option__explain">{STRATEGY_COPY[s].explain}{' '}
                <a href={methodologyLink(STRATEGY_COPY[s].anchor)}>How is this calculated?</a></span>
            </span>
          </label>
        ))}
      </fieldset>

      <TableWrap label="Results by strategy" class="comparison-table">
        <table>
          <caption>Results by strategy</caption>
          <thead>
            <tr>
              <th scope="col">Strategy</th>
              <th scope="col" class="num">Households reached</th>
              <th scope="col" class="num">Spend</th>
              <th scope="col" class="num">Unspent</th>
              <th scope="col" class="num">Coverage after</th>
              <th scope="col" class="num">Budget to rural or distressed</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={r.strategy} class={r.strategy === strategy ? 'row-selected' : undefined}>
                <th scope="row">{STRATEGY_COPY[r.strategy].name}{r.strategy === strategy && <span class="visually-hidden"> (selected)</span>}</th>
                <td class="num">{formatInt(r.totals.reached)}</td>
                <td class="num">{formatCurrency(r.totals.spend)}</td>
                <td class="num">{formatCurrency(r.totals.unspent)}</td>
                <td class="num">{coverageText(r.totals.coverageAfter, derived.needOnly)}</td>
                <td class="num">{formatPct(equity[i].budgetPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      <ul class="comparison-cards" aria-label="Results by strategy">
        {results.map((r, i) => (
          <li key={r.strategy} class={r.strategy === strategy ? 'card card--selected' : 'card'}>
            <h4>{STRATEGY_COPY[r.strategy].name}{r.strategy === strategy && ' (selected)'}</h4>
            <dl>
              <div><dt>Households reached</dt><dd>{formatInt(r.totals.reached)}</dd></div>
              <div><dt>Spend</dt><dd>{formatCurrency(r.totals.spend)}</dd></div>
              <div><dt>Unspent</dt><dd>{formatCurrency(r.totals.unspent)}</dd></div>
              <div><dt>Coverage after</dt><dd>{coverageText(r.totals.coverageAfter, derived.needOnly)}</dd></div>
              <div><dt>Budget to rural or distressed</dt><dd>{formatPct(equity[i].budgetPct)}</dd></div>
            </dl>
          </li>
        ))}
      </ul>

      <BarChart
        title="Households reached by strategy"
        bars={results.map((r) => ({ label: STRATEGY_COPY[r.strategy].name, value: r.totals.reached, selected: r.strategy === strategy }))}
      />
    </section>
  );
}

export function SensitivityPanel({ derived, strategy }: StrategyProps) {
  const levels = derived.sensitivity!;
  const label = (f: number) => (f === 1 ? 'Cost as entered' : `Cost ${f < 1 ? '20% lower' : '20% higher'}`);
  return (
    <section aria-labelledby="sensitivity-heading" class="module" id="sensitivity">
      <h3 id="sensitivity-heading" tabIndex={-1}>Cost sensitivity</h3>
      <p>What happens to <strong>{STRATEGY_COPY[strategy].name}</strong> if your cost per household is 20% lower or higher than entered. The budget stays the same.</p>
      <TableWrap label="Cost sensitivity">
        <table>
          <caption class="visually-hidden">Cost sensitivity</caption>
          <thead><tr><th scope="col">Cost per household</th><th scope="col" class="num">Households reached</th><th scope="col" class="num">Unspent</th></tr></thead>
          <tbody>
            {levels.map((l) => (
              <tr key={l.factor} class={l.factor === 1 ? 'row-selected' : undefined}>
                <th scope="row">{label(l.factor)}</th>
                <td class="num">{formatInt(l.reached)}</td>
                <td class="num">{formatCurrency(l.unspent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </section>
  );
}

export function EquityPanel({ derived, strategy }: StrategyProps) {
  const shares = derived.equity![STRATEGIES.indexOf(strategy)];
  const total = derived.prepared.length;
  return (
    <section aria-labelledby="equity-heading" class="module" id="equity">
      <h3 id="equity-heading" tabIndex={-1}>Equity</h3>
      <p>{TERM_COPY.equityFlag.explain} <SourceLabel field="arc_status" /></p>
      {shares.flaggedCount === 0 ? (
        <p>None of the selected communities is rural or distressed.</p>
      ) : (
        <ul class="stat-list">
          <li><strong>{shares.flaggedCount} of {total}</strong> selected communities are rural or distressed.</li>
          <li><strong>{formatPct(shares.budgetPct)}</strong> of the budget goes to them under {STRATEGY_COPY[strategy].name}.</li>
          <li><strong>{formatPct(shares.reachedPct)}</strong> of the households reached are in them.</li>
        </ul>
      )}
    </section>
  );
}
