import { useMemo, useState } from 'preact/hooks';
import { isFlagged } from '../../lib/calc';
import { COUNTIES } from '../../lib/data/load';

interface Props {
  selected: string[];
  /** Receives an updater so rapid clicks never act on a stale selection. */
  onChange: (update: (previous: string[]) => string[]) => void;
}

/** Keep the selection in county (FIPS) order. */
const inCountyOrder = (fips: Set<string>) => COUNTIES.filter((c) => fips.has(c.fips)).map((c) => c.fips);

export default function CountySelector({ selected, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [appalachianOnly, setAppalachianOnly] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const selectedSet = new Set(selected);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COUNTIES.filter((c) =>
      (!q || c.county_name.toLowerCase().includes(q))
      && (!appalachianOnly || c.appalachian === 'Yes')
      && (!flaggedOnly || isFlagged(c)));
  }, [query, appalachianOnly, flaggedOnly]);

  const toggle = (fips: string) => onChange((previous) => {
    const next = new Set(previous);
    if (next.has(fips)) next.delete(fips);
    else next.add(fips);
    return inCountyOrder(next);
  });
  const selectShown = () => onChange((previous) => inCountyOrder(new Set([...previous, ...shown.map((c) => c.fips)])));

  return (
    <fieldset class="county-selector">
      <legend>Counties</legend>
      <p class="field__hint" aria-live="polite">{selected.length} of 120 counties selected.</p>
      <div class="county-selector__tools">
        <div class="field">
          <label for="county-search">Find a county</label>
          <input id="county-search" type="search" value={query} autoComplete="off"
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)} />
        </div>
        <label class="checkbox"><input type="checkbox" checked={appalachianOnly}
          onChange={(e) => setAppalachianOnly((e.currentTarget as HTMLInputElement).checked)} /> Appalachian counties only</label>
        <label class="checkbox"><input type="checkbox" checked={flaggedOnly}
          onChange={(e) => setFlaggedOnly((e.currentTarget as HTMLInputElement).checked)} /> Rural or distressed only</label>
        <div class="county-selector__actions">
          <button type="button" class="button button--secondary button--small" onClick={selectShown}
            disabled={shown.length === 0}>Select all shown ({shown.length})</button>
          <button type="button" class="button button--secondary button--small" onClick={() => onChange(() => [])}
            disabled={selected.length === 0}>Clear selection</button>
        </div>
      </div>
      {shown.length === 0 ? (
        <p class="callout">No counties match “{query}”.</p>
      ) : (
        <ul class="county-list" aria-label="Kentucky counties">
          {shown.map((c) => (
            <li key={c.fips}>
              <label class="checkbox">
                <input type="checkbox" checked={selectedSet.has(c.fips)} onChange={() => toggle(c.fips)} />
                {c.county_name}
                {isFlagged(c) && <span class="badge">Rural or distressed</span>}
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
