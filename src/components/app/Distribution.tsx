/**
 * "Who gets the money": each community's allocation under all five strategies,
 * so the difference between strategies is visible community by community.
 * A table when the results column is wide, one card per community when narrow
 * (switched by a container query in app.css).
 */
import { useState } from 'preact/hooks';
import type { Strategy, StrategyResult } from '../../lib/calc';
import { STRATEGY_COPY } from '../../lib/copy';
import { formatCurrency, formatInt } from '../../lib/format';
import { distribution, type DistributionRow } from '../../lib/results-view';
import TableWrap from '../TableWrap';

interface Props {
  results: readonly StrategyResult[];
  strategy: Strategy;
  budget: number;
}

/** Communities shown before "Show all", so a long selection does not push the rest of the results away. */
const FIRST_ROWS = 10;

const households = (n: number) => `${formatInt(n)} ${n === 1 ? 'household' : 'households'}`;

function Cell({ allocation, reached, most }: DistributionRow['cells'][number]) {
  return (
    <>
      <span class="distribution__amount">{formatCurrency(allocation)}</span>
      {most && <span class="tag">Most</span>}
      <span class="distribution__reached">{households(reached)}</span>
    </>
  );
}

export default function Distribution({ results, strategy, budget }: Props) {
  const [showAll, setShowAll] = useState(false);
  const view = distribution(results, strategy);
  const rows = showAll ? view.rows : view.rows.slice(0, FIRST_ROWS);
  const hidden = view.rows.length - rows.length;
  const selectedMark = (s: Strategy) => (s === strategy ? ' (selected)' : '');

  return (
    <section aria-labelledby="distribution-heading" class="module distribution" id="distribution">
      <h3 id="distribution-heading" tabIndex={-1}>Who gets the money</h3>
      <p>
        How each strategy divides {formatCurrency(budget)} between the communities. “Most” marks the
        strategy that gives a community the most. Communities are listed by their share under {STRATEGY_COPY[strategy].name}.
      </p>

      <TableWrap label="Allocation by community and strategy" class="distribution__table">
        <table>
          <caption>Allocation by community and strategy</caption>
          <thead>
            <tr>
              <th scope="col">Community</th>
              {view.totals.map((t) => (
                <th scope="col" class={`num${t.strategy === strategy ? ' col-selected' : ''}`} key={t.strategy}>
                  {STRATEGY_COPY[t.strategy].name}{selectedMark(t.strategy)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.name}</th>
                {r.cells.map((c) => (
                  <td class={`num${c.strategy === strategy ? ' col-selected' : ''}`} key={c.strategy}><Cell {...c} /></td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {view.totals.map((t) => (
                <td class={`num${t.strategy === strategy ? ' col-selected' : ''}`} key={t.strategy}>
                  <span class="distribution__amount">{formatCurrency(t.allocation)}</span>
                  <span class="distribution__reached">{households(t.reached)}</span>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </TableWrap>

      <ul class="distribution__cards" aria-label="Allocation by community and strategy">
        {rows.map((r) => (
          <li key={r.id} class="card">
            <h4>{r.name}</h4>
            <dl>
              {r.cells.map((c) => (
                <div key={c.strategy} class={c.strategy === strategy ? 'is-selected' : undefined}>
                  <dt>{STRATEGY_COPY[c.strategy].name}{selectedMark(c.strategy)}</dt>
                  <dd><Cell {...c} /></dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {view.rows.length > FIRST_ROWS && (
        <button type="button" class="button button--secondary button--small" aria-expanded={showAll}
          onClick={() => setShowAll(!showAll)}>
          {showAll ? `Show the first ${FIRST_ROWS} communities` : `Show all ${view.rows.length} communities (${hidden} more)`}
        </button>
      )}
    </section>
  );
}
