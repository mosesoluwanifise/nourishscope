/** Display formatting. Fixed wording for markers comes from labels.ts. */
import { markerText } from './data/labels';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wholeCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const decimal1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatCurrency(value: number): string {
  return currency.format(value);
}

export function formatCurrencyWhole(value: number): string {
  return wholeCurrency.format(value);
}

export function formatInt(value: number): string {
  return integer.format(value);
}

export function formatPct(value: number): string {
  return `${decimal1.format(value)}%`;
}

export function formatDecimal1(value: number): string {
  return decimal1.format(value);
}

/** Percentage points, with an explicit sign: "+25.0 points", "−5.0 points". */
export function formatPoints(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${decimal1.format(Math.abs(value))} points`;
}

/** A public data value: a number, or the fixed wording for suppressed / not-applicable. */
export function formatDataValue(value: unknown, kind: 'pct' | 'int' | 'decimal' | 'currency' | 'text' = 'decimal'): string {
  const marker = markerText(value);
  if (marker) return marker;
  if (typeof value !== 'number') return String(value ?? '');
  switch (kind) {
    case 'pct': return formatPct(value);
    case 'int': return formatInt(value);
    case 'currency': return formatCurrencyWhole(value);
    case 'text': return String(value);
    default: return String(value);
  }
}
