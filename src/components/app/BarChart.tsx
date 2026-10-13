/**
 * Hand-built SVG bar chart (no chart library, plan R18/R24). Each bar is
 * labelled with its name and value, so colour never carries the meaning
 * alone. The same numbers are in the table above it.
 */
import { formatInt } from '../../lib/format';

interface Bar {
  label: string;
  value: number;
  selected?: boolean;
}

export default function BarChart({ title, bars }: { title: string; bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const rowHeight = 44;
  const height = bars.length * rowHeight;
  const summary = bars.map((b) => `${b.label}: ${formatInt(b.value)}`).join('; ');

  return (
    <figure class="bar-chart">
      <figcaption>{title}<span class="field__hint"> (the same figures are in the table above)</span></figcaption>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" role="img" aria-label={`${title}. ${summary}.`}
        width="100%" height={height}>
        {bars.map((b, i) => {
          const width = (b.value / max) * 100;
          return (
            <rect key={b.label} x="0" y={i * rowHeight + 22} width={Math.max(width, 0.5)} height="16"
              class={b.selected ? 'bar bar--selected' : 'bar'} />
          );
        })}
      </svg>
      <ul class="bar-chart__labels" aria-hidden="true" style={{ marginTop: `-${height}px`, height: `${height}px` }}>
        {bars.map((b) => (
          <li key={b.label} style={{ height: `${rowHeight}px` }}>
            {b.label}{b.selected ? ' (selected)' : ''}: <strong>{formatInt(b.value)}</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}
