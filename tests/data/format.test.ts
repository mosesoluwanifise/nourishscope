import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDataValue, formatInt, formatPct, formatPoints } from '../../src/lib/format';

describe('format helpers', () => {
  it('formats currency, percentages and whole households', () => {
    expect(formatCurrency(16666.67)).toBe('$16,666.67');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatPct(22.5)).toBe('22.5%');
    expect(formatInt(1759)).toBe('1,759');
    expect(formatPoints(25)).toBe('+25.0 points');
    expect(formatPoints(-5)).toBe('−5.0 points');
  });

  it('uses fixed wording for suppressed and not-applicable values, never 0', () => {
    expect(formatDataValue({ status: 'suppressed' })).toBe('Not reported (suppressed by source)');
    expect(formatDataValue({ status: 'not_applicable' })).toBe('Not applicable');
    expect(formatDataValue(0.2)).toBe('0.2');
    expect(formatDataValue(12.3, 'pct')).toBe('12.3%');
  });
});
