/**
 * The planning brief as a document. Hidden on screen unless previewed;
 * print.css shows only this when printing (plan R11).
 */
import type { Brief } from '../../lib/export/brief-model';
import { formatCoverage, formatCurrency, formatInt, formatPct } from '../../lib/format';
import { NOT_ENTERED_TEXT } from '../../lib/data/labels';

function costLine(brief: Brief): string {
  const { cost, costSource, costConfirmed } = brief.inputs;
  if (costSource === 'file') return 'per community, from your file (see table)';
  const value = formatCurrency(cost ?? 0);
  const note = costConfirmed ? 'confirmed by user' : 'example value, not confirmed';
  return costSource === 'mixed' ? `${value} (${note}), unless your file gives a community its own cost` : `${value} (${note})`;
}

export default function PrintBrief({ brief, visible }: { brief: Brief; visible: boolean }) {
  return (
    <article id="planning-brief" tabIndex={-1} class={`print-brief${visible ? '' : ' print-brief--hidden'}`} aria-label="Planning brief">
      <header class="print-brief__header">
        <h2>NourishScope planning brief</h2>
        {brief.isSample && <p class="callout callout--warning"><strong>Sample data:</strong> these communities are fictional.</p>}
        <dl class="brief-meta">
          <div><dt>Date</dt><dd>{brief.generatedOn}</dd></div>
          <div><dt>Tool version</dt><dd>{brief.toolVersion}</dd></div>
          <div><dt>Methodology</dt><dd>{brief.methodologyVersion}</dd></div>
          <div><dt>Data</dt><dd>{brief.dataMode}</dd></div>
          <div><dt>Need</dt><dd>{brief.needDefinition}</dd></div>
        </dl>
      </header>

      <h3>Inputs</h3>
      <ul>
        <li>Budget: {formatCurrency(brief.inputs.budget)}</li>
        <li>Cost per household: {costLine(brief)}</li>
        <li>Minimum for every community: {brief.inputs.floorSharePct}%</li>
        <li>Strategy shown by community: {brief.strategyName}</li>
      </ul>

      <h3>Allocation by community: {brief.strategyName}</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">Community</th><th scope="col">County</th>
            <th scope="col" class="num">Households in need</th><th scope="col" class="num">Served</th>
            <th scope="col" class="num">Still needing help</th><th scope="col" class="num">Health burden</th>
            <th scope="col">Rural or distressed</th><th scope="col" class="num">Cost per household</th>
            <th scope="col" class="num">Allocation</th>
            <th scope="col" class="num">Reached</th><th scope="col" class="num">Spend</th>
          </tr>
        </thead>
        <tbody>
          {brief.rows.map((r, i) => (
            <tr key={i}>
              <th scope="row">{r.community}</th><td>{r.county}</td>
              <td class="num">{formatInt(r.need)}</td><td class="num">{r.served === null ? NOT_ENTERED_TEXT : formatInt(r.served)}</td>
              <td class="num">{formatInt(r.unmet)}</td><td class="num">{r.healthIndex.toFixed(3)}</td>
              <td>{r.flag ? 'Yes' : 'No'}</td><td class="num">{formatCurrency(r.cost)}</td>
              <td class="num">{formatCurrency(r.allocation)}</td>
              <td class="num">{formatInt(r.reached)}</td><td class="num">{formatCurrency(r.spend)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><th scope="row" colSpan={9}>Total (unspent {formatCurrency(brief.totals.unspent)})</th>
            <td class="num">{formatInt(brief.totals.reached)}</td><td class="num">{formatCurrency(brief.totals.spend)}</td></tr>
        </tfoot>
      </table>
      {brief.totals.coverageBefore !== null ? (
        <p>Coverage before: {formatPct(brief.totals.coverageBefore)}. After: {formatPct(brief.totals.coverageAfter!)}.</p>
      ) : (
        <p>Coverage: {formatCoverage(null, brief.needOnly)}</p>
      )}

      <h3>All strategies</h3>
      <table>
        <thead><tr><th scope="col">Strategy</th><th scope="col" class="num">Reached</th><th scope="col" class="num">Spend</th><th scope="col" class="num">Unspent</th></tr></thead>
        <tbody>
          {brief.comparison.map((c) => (
            <tr key={c.strategy}><th scope="row">{c.strategy}</th><td class="num">{formatInt(c.reached)}</td>
              <td class="num">{formatCurrency(c.spend)}</td><td class="num">{formatCurrency(c.unspent)}</td></tr>
          ))}
        </tbody>
      </table>

      <h3>Cost sensitivity</h3>
      <table>
        <thead><tr><th scope="col">Cost per household</th><th scope="col" class="num">Reached</th><th scope="col" class="num">Unspent</th></tr></thead>
        <tbody>
          {brief.sensitivity.map((s) => (
            <tr key={s.label}><th scope="row">{s.label}</th><td class="num">{formatInt(s.reached)}</td><td class="num">{formatCurrency(s.unspent)}</td></tr>
          ))}
        </tbody>
      </table>

      <h3>Equity</h3>
      <p>
        {brief.equity.flaggedCount} rural or distressed communities receive {formatPct(brief.equity.budgetPct)} of the budget and
        {' '}{formatPct(brief.equity.reachedPct)} of households reached.
      </p>

      <h3>Data sources</h3>
      <ul>{brief.dataSources.map((s) => <li key={s.source}>{s.source} ({s.years})</li>)}</ul>

      <h3>Assumptions and limitations</h3>
      <ul>{brief.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
      <p class="print-brief__footer">Made with NourishScope {brief.toolVersion} (Methodology {brief.methodologyVersion}) on {brief.generatedOn}.</p>
    </article>
  );
}
