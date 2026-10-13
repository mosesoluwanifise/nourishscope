/** Shared number checks for inputs (spec step 1). The app applies them in derive(). */
export const isWholeNonNegative = (v: number) => Number.isInteger(v) && v >= 0;
export const isPositive = (v: number) => Number.isFinite(v) && v > 0;
