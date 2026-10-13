/**
 * The spec's worked example, run once by the real engine at build time.
 * The Home hero preview, the Home summary and the full tables on Methodology
 * all read it from here, so they cannot drift apart.
 */
import { prepareCommunities, runStrategy, STRATEGIES } from './calc';
import { COUNTIES, STATE_MEDIANS } from './data/load';
import { assembleFromCounties, EXAMPLE_COST } from './data/merge';

export const EXAMPLE_BUDGET = 50000;
export const EXAMPLE_COST_PER_HOUSEHOLD = EXAMPLE_COST;
export const EXAMPLE_COUNTIES = ['Magoffin County', 'Owsley County', 'Wolfe County'];

const fipsList = EXAMPLE_COUNTIES.map((n) => COUNTIES.find((c) => c.county_name === n)!.fips);

export const examplePrepared = prepareCommunities(
  assembleFromCounties(fipsList, COUNTIES, EXAMPLE_COST).map((c) => c.input),
  STATE_MEDIANS,
);

export const exampleResults = STRATEGIES.map((s) => runStrategy(examplePrepared, EXAMPLE_BUDGET, s));

/** The strategy the example is shown under: Share by unmet need. */
export const exampleProportional = exampleResults[STRATEGIES.indexOf('proportional')];
