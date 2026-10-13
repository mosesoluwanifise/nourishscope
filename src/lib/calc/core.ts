import { healthIndex } from './health';
import type { Community, CommunityInput, StateMedians } from './types';

/** Spec step 2: unmet need, served mode, and the health index. */
export function prepareCommunities(inputs: readonly CommunityInput[], medians: StateMedians): Community[] {
  return inputs.map((c) => ({
    ...c,
    servedKnown: c.served !== null,
    unmet: Math.max(c.need - (c.served ?? 0), 0),
    H: healthIndex(c.health, medians),
  }));
}
