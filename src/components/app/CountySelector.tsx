import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { isFlagged } from '../../lib/calc';
import { COUNTIES } from '../../lib/data/load';

interface Props {
  selected: string[];
  /** Receives an updater so rapid clicks never act on a stale selection. */
  onChange: (update: (previous: string[]) => string[]) => void;
}

const FLAGGED = new Set(COUNTIES.filter(isFlagged).map((c) => c.fips));
const NAME_BY_FIPS = new Map(COUNTIES.map((c) => [c.fips, c.county_name]));

/** Keep the selection in county (FIPS) order. */
const inCountyOrder = (fips: Set<string>) => COUNTIES.filter((c) => fips.has(c.fips)).map((c) => c.fips);

const noun = (n: number) => (n === 1 ? 'county' : 'counties');

export default function CountySelector({ selected, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [appalachianOnly, setAppalachianOnly] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const selectedSet = new Set(selected);

  // Move focus to the control that replaced the one just pressed, but not on first render.
  const changeRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toggled = useRef(false);
  useEffect(() => {
    if (!toggled.current) return;
    (collapsed ? changeRef : searchRef).current?.focus();
  }, [collapsed]);
  const setCollapsedAndFocus = (value: boolean) => {
    toggled.current = true;
    setCollapsed(value);
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COUNTIES.filter((c) =>
      (!q || c.county_name.toLowerCase().includes(q))
      && (!appalachianOnly || c.appalachian === 'Yes')
      && (!flaggedOnly || FLAGGED.has(c.fips)));
  }, [query, appalachianOnly, flaggedOnly]);

  const toggle = (fips: string) => onChange((previous) => {
    const next = new Set(previous);
    if (next.has(fips)) next.delete(fips);
    else next.add(fips);
    return inCountyOrder(next);
  });
  const selectShown = () => onChange((previous) => inCountyOrder(new Set([...previous, ...shown.map((c) => c.fips)])));

  // An empty selection cannot stay collapsed (for example after "Clear selection").
  if (collapsed && selected.length > 0) {
    const names = selected.map((f) => NAME_BY_FIPS.get(f)).join(', ');
    return (
      <div class="county-summary">
        <h3 class="county-summary__heading">Counties</h3>
        <p><strong>{selected.length} {noun(selected.length)} selected:</strong> {names}</p>
        <button type="button" ref={changeRef} class="button button--secondary button--small"
          onClick={() => setCollapsedAndFocus(false)}>Change counties</button>
      </div>
    );
  }

  return (
    <fieldset class="county-selector">
      <legend>Counties</legend>
      <div class="county-selector__header">
        <p class="county-selector__count" aria-live="polite">{selected.length} of 120 {noun(120)} selected</p>
        <button type="button" class="button button--small" onClick={() => setCollapsedAndFocus(true)}
          disabled={selected.length === 0} aria-describedby={selected.length === 0 ? 'county-done-hint' : undefined}>
          Done choosing counties
        </button>
      </div>
      {selected.length === 0 && <p id="county-done-hint" class="field__hint">Select at least one county, then choose Done.</p>}
      <div class="county-selector__tools">
        <div class="field">
          <label for="county-search">Find a county</label>
          <input id="county-search" ref={searchRef} type="search" value={query} autoComplete="off"
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
                {FLAGGED.has(c.fips) && <span class="badge">Rural or distressed</span>}
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
