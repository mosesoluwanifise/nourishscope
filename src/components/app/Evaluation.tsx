/** Evaluation module (spec step 8). Separate from the planning flow. */
import { useState } from 'preact/hooks';
import { evaluate, isPositive } from '../../lib/calc';
import { formatCurrency, formatDecimal1, formatPoints } from '../../lib/format';
import { parseNumberInput } from './state';
import Field from './Field';

type Key = 'pre' | 'post' | 'participants' | 'cost';
const KEYS: Key[] = ['pre', 'post', 'participants', 'cost'];

function errorFor(key: Key, v: number): string | undefined {
  if (key === 'pre' || key === 'post') {
    return Number.isFinite(v) && v >= 0 && v <= 100 ? undefined : 'Enter a percentage between 0 and 100.';
  }
  if (key === 'participants') {
    return Number.isInteger(v) && v > 0 ? undefined : 'Enter a whole number of participants, more than 0.';
  }
  return isPositive(v) ? undefined : 'Enter a program cost of more than $0.';
}

export default function Evaluation() {
  const [values, setValues] = useState<Record<Key, string>>({ pre: '', post: '', participants: '', cost: '' });
  const set = (key: Key) => (v: string) => setValues((s) => ({ ...s, [key]: v }));
  const numbers = {} as Record<Key, number | null>;
  const errors = {} as Record<Key, string | undefined>;
  for (const k of KEYS) {
    numbers[k] = parseNumberInput(values[k]);
    errors[k] = numbers[k] === null ? undefined : errorFor(k, numbers[k]!);
  }
  const complete = KEYS.every((k) => numbers[k] !== null && !errors[k]);
  const result = complete
    ? evaluate({ prePct: numbers.pre!, postPct: numbers.post!, participants: numbers.participants!, programCost: numbers.cost! })
    : null;

  return (
    <section aria-labelledby="evaluation-heading" class="module" id="evaluation">
      <h3 id="evaluation-heading" tabIndex={-1}>Evaluation</h3>
      <p>
        After a program runs, enter de-identified results: the share of participants meeting a goal before and after,
        for example eating vegetables daily. Nothing you enter leaves this device.
      </p>
      <div class="evaluation-grid">
        <Field id="eval-pre" label="Before the program" suffix="%" value={values.pre} onInput={set('pre')} error={errors.pre} />
        <Field id="eval-post" label="After the program" suffix="%" value={values.post} onInput={set('post')} error={errors.post} />
        <Field id="eval-participants" label="Number of participants" value={values.participants} onInput={set('participants')}
          error={errors.participants} inputMode="numeric" />
        <Field id="eval-cost" label="Program cost" prefix="$" value={values.cost} onInput={set('cost')} error={errors.cost} />
      </div>
      {result ? (
        <ul class="stat-list" aria-live="polite">
          <li>Change: <strong>{formatPoints(result.changePts)}</strong></li>
          <li>Participants improving: <strong>{formatDecimal1(result.participantsImproving)}</strong></li>
          <li>
            Cost per participant improving:{' '}
            <strong>{result.costPerParticipantImproving === null ? 'Not shown: no participants improved' : formatCurrency(result.costPerParticipantImproving)}</strong>
          </li>
        </ul>
      ) : (
        <p class="field__hint">Fill in all four fields to see the change and cost per outcome.</p>
      )}
    </section>
  );
}
