import type { ComponentChildren } from 'preact';
import { TERM_COPY } from '../../lib/copy';
import { formatInt } from '../../lib/format';
import { NOT_ENTERED_TEXT } from '../../lib/data/labels';
import type { Derived, PlanState } from './state';
import Field from './Field';
import TableWrap from '../TableWrap';

interface Props {
  state: PlanState;
  derived: Derived;
  setBudget: (v: string) => void;
  setCost: (v: string) => void;
  setCostConfirmed: (v: boolean) => void;
  setFloor: (v: string) => void;
  setNeed: (id: string, v: string) => void;
  setServed: (id: string, v: string) => void;
  /** The county selector, placed after budget and cost (Kentucky data only). */
  counties?: ComponentChildren;
}

export default function Inputs({ state, derived, setBudget, setCost, setCostConfirmed, setFloor, setNeed, setServed, counties }: Props) {
  const { errors, warnings, communities } = derived;
  const editable = state.source === 'kentucky';
  const { costFromUploadForAll } = derived;
  let costHint: string = TERM_COPY.cost.explain;
  if (costFromUploadForAll) costHint = 'Every community has its own cost from your file; this value is not used.';
  else if (!state.costConfirmed) costHint = 'Example only. Replace it with your program’s cost.';

  return (
    <div class="inputs">
      <Field id="budget" label="Total budget" prefix="$" value={state.budgetText} onInput={setBudget}
        hint="The money you have to divide across the communities." error={errors.budget} />

      <div class="field-group">
        <Field id="cost" label={TERM_COPY.cost.name} prefix="$" value={state.costText} onInput={setCost}
          hint={costHint}
          error={errors.cost} />
        {!costFromUploadForAll && (
          <label class="checkbox">
            <input type="checkbox" id="cost-confirmed" checked={state.costConfirmed}
              onChange={(e) => setCostConfirmed((e.currentTarget as HTMLInputElement).checked)} />
            I’ve confirmed this cost per household
          </label>
        )}
      </div>

      {counties}

      {communities.length > 0 && (
        <details class="community-inputs">
          <summary>
            {editable ? 'Households in need and served, by county (optional)' : 'Households from your file'}
          </summary>
          <p class="field__hint">
            {editable ? `${TERM_COPY.need.explain} ${TERM_COPY.served.explain}` : 'These figures come from your file. To change them, edit the file and upload it again.'}
          </p>
          <TableWrap label="Households by community">
            <table>
              <caption class="visually-hidden">Households in need and served by community</caption>
              <thead>
                <tr>
                  <th scope="col">Community</th>
                  <th scope="col" class="num">{TERM_COPY.need.name}</th>
                  <th scope="col" class="num">{TERM_COPY.served.name}</th>
                </tr>
              </thead>
              <tbody>
                {communities.map((c) => {
                  const id = c.input.id;
                  return (
                    <tr key={id}>
                      <th scope="row">{c.input.name}</th>
                      <td class="num">
                        {editable ? (
                          <Field compact id={`need-${id}`} label={`${TERM_COPY.need.name}, ${c.input.name}`}
                            value={state.needText[id] ?? String(c.county.snap_households)}
                            onInput={(v) => setNeed(id, v)} error={errors.need[id]} inputMode="numeric" />
                        ) : formatInt(c.input.need)}
                      </td>
                      <td class="num">
                        {editable ? (
                          <Field compact id={`served-${id}`} label={`${TERM_COPY.served.name}, ${c.input.name}`}
                            value={state.servedText[id] ?? ''} onInput={(v) => setServed(id, v)}
                            error={errors.served[id]} warning={warnings[id]} inputMode="numeric" />
                        ) : (
                          <>
                            {c.input.served === null ? NOT_ENTERED_TEXT : formatInt(c.input.served)}
                            {warnings[id] && <span class="field__warning">{warnings[id]}</span>}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </details>
      )}

      <details class="more-options">
        <summary>More options</summary>
        <Field id="floor" label={TERM_COPY.floorShare.name} suffix="%" value={state.floorPctText} onInput={setFloor}
          hint={TERM_COPY.floorShare.explain} error={errors.floor} />
      </details>
    </div>
  );
}
