/** The answer first: the selected strategy's headline figures, with the strategy picker beside them. */
import { useMemo } from 'preact/hooks';
import { STRATEGIES, type Strategy, type StrategyResult } from '../../lib/calc';
import { STRATEGY_COPY } from '../../lib/copy';
import { formatCoverage, formatCurrency, formatInt } from '../../lib/format';
import { allocationLines, summarise } from '../../lib/results-view';

interface Props {
  result: StrategyResult;
  needOnly: boolean;
  strategy: Strategy;
  setStrategy: (s: Strategy) => void;
}

export default function ResultsSummary({ result, needOnly, strategy, setStrategy }: Props) {
  const s = useMemo(() => summarise(result), [result]);
  return (
    <section class="results-summary" aria-labelledby="summary-heading" id="summary">
      <h3 id="summary-heading" tabIndex={-1}>Summary: {STRATEGY_COPY[strategy].name}</h3>
      <div class="field results-summary__picker">
        <label for="summary-strategy">Strategy</label>
        <select id="summary-strategy" value={strategy}
          onChange={(e) => setStrategy((e.currentTarget as HTMLSelectElement).value as Strategy)}>
          {STRATEGIES.map((st) => <option key={st} value={st}>{STRATEGY_COPY[st].name}</option>)}
        </select>
      </div>
      <dl class="results-summary__figures">
        <div><dt>Households reached</dt><dd>{formatInt(s.reached)}</dd></div>
        <div><dt>Spend</dt><dd>{formatCurrency(s.spend)}</dd></div>
        <div><dt>Unspent</dt><dd>{formatCurrency(s.unspent)}</dd></div>
        <div><dt>Coverage after</dt><dd>{formatCoverage(s.coverageAfter, needOnly)}</dd></div>
      </dl>
      <ul class="results-summary__lines">
        {allocationLines(s).map((line) => <li key={line}>{line}</li>)}
      </ul>
    </section>
  );
}
