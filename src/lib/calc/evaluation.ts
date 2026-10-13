import { roundHalfEven } from './rounding';

export interface EvaluationInput {
  prePct: number;
  postPct: number;
  participants: number;
  programCost: number;
}

export interface EvaluationResult {
  /** Post % minus pre %, in percentage points. */
  changePts: number;
  participantsImproving: number;
  /** Null when no participants improved (change ≤ 0 or no participants). */
  costPerParticipantImproving: number | null;
}

/** Spec step 8. */
export function evaluate({ prePct, postPct, participants, programCost }: EvaluationInput): EvaluationResult {
  const change = postPct - prePct;
  const improved = (participants * change) / 100;
  return {
    changePts: roundHalfEven(change, 1),
    participantsImproving: roundHalfEven(improved, 1),
    costPerParticipantImproving: improved > 0 ? roundHalfEven(programCost / improved, 2) : null,
  };
}
