/**
 * Rounding and summation that reproduce Python's behaviour exactly, so the
 * app's numbers match nourishscope_calc_reference.py to the cent.
 */

/**
 * Python's round(x, digits): round half to even, deciding ties from the
 * exact decimal value of the double (not from x * 10^digits, which is
 * inexact). For example 2.675 is stored as 2.67499999..., so it rounds down.
 */
export function roundHalfEven(x: number, digits: number): number {
  if (!Number.isFinite(x) || Number.isInteger(x)) return x;
  const negative = x < 0;
  // toFixed(100) prints the exact binary value for the magnitudes used here.
  const exact = Math.abs(x).toFixed(100);
  const [intPart, fracPart] = exact.split('.');
  const kept = fracPart.slice(0, digits);
  const rest = fracPart.slice(digits);

  let roundUp: boolean;
  if (rest[0] > '5') roundUp = true;
  else if (rest[0] < '5') roundUp = false;
  else if (/[1-9]/.test(rest.slice(1))) roundUp = true;
  else {
    // Exact tie: round to the even neighbour.
    const lastDigit = Number(digits > 0 ? kept[kept.length - 1] : intPart[intPart.length - 1]);
    roundUp = lastDigit % 2 === 1;
  }

  let digitsString = intPart + kept;
  if (roundUp) digitsString = incrementDecimalString(digitsString);
  const whole = digitsString.slice(0, digitsString.length - digits) || '0';
  const fraction = digits > 0 ? `.${digitsString.slice(digitsString.length - digits)}` : '';
  const result = Number(`${whole}${fraction}`);
  return negative ? -result : result;
}

function incrementDecimalString(s: string): string {
  const chars = s.split('');
  let i = chars.length - 1;
  while (i >= 0) {
    if (chars[i] === '9') {
      chars[i] = '0';
      i--;
    } else {
      chars[i] = String(Number(chars[i]) + 1);
      return chars.join('');
    }
  }
  return `1${chars.join('')}`;
}

/**
 * Python 3.12+ sum() over floats: Neumaier-compensated summation.
 * Matching it keeps health-index values identical to the reference.
 */
export function preciseSum(values: readonly number[]): number {
  let sum = 0;
  let compensation = 0;
  for (const x of values) {
    const t = sum + x;
    if (Math.abs(sum) >= Math.abs(x)) compensation += sum - t + x;
    else compensation += x - t + sum;
    sum = t;
  }
  return sum + compensation;
}
