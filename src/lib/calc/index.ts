/**
 * NourishScope calculation engine (Methodology v1.0).
 * Pure functions with no DOM or Astro imports, shared by the build
 * (Home worked example) and the browser (/app).
 */
export * from './types';
export { roundHalfEven, preciseSum } from './rounding';
export { stateMedians, healthIndex } from './health';
export { prepareCommunities } from './core';
export { allocate, DEFAULT_FLOOR_SHARE } from './allocate';
export { runStrategy } from './results';
export { sensitivity, SENSITIVITY_FACTORS, type SensitivityLevel } from './sensitivity';
export { isFlagged, equityShares, type EquityShares } from './equity';
export { evaluate, type EvaluationInput, type EvaluationResult } from './evaluation';
export { validateInputs, isPositive, isWholeNonNegative, type InputIssue, type ValidationResult } from './validate';
