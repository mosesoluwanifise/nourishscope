/**
 * Upload a CSV and fix flagged rows (plan R22). Focus moves to the upload
 * summary after parsing, and to the next unresolved row after a fix.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { UPLOAD_TEMPLATE_PATH, withBase } from '../../config/site';
import { COUNTIES } from '../../lib/data/load';
import type { AssembledCommunity, FlaggedRow } from '../../lib/data/merge';
import { MAX_UPLOAD_BYTES, parseUpload, type ParsedUpload } from '../../lib/data/parse-upload';
import type { UploadState } from './state';

interface Props {
  upload: UploadState | null;
  communities: AssembledCommunity[];
  flagged: FlaggedRow[];
  onUpload: (upload: UploadState) => void;
  onFix: (rowNumber: number, fips: string) => void;
  onContinue: () => void;
}

/**
 * County dropdown for a flagged row. The 120 options render only once the
 * control is used, so a large file with many flagged rows stays light.
 */
function CountyPicker({ id, onPick }: { id: string; onPick: (fips: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <select id={id} onFocus={() => setOpen(true)} onMouseDown={() => setOpen(true)}
      onChange={(e) => { const fips = (e.currentTarget as HTMLSelectElement).value; if (fips) onPick(fips); }}>
      <option value="">Choose a county…</option>
      {open && COUNTIES.map((c) => <option value={c.fips} key={c.fips}>{c.county_name}</option>)}
    </select>
  );
}

export default function UploadPanel({ upload, communities, flagged, onUpload, onFix, onContinue }: Props) {
  const [parsing, setParsing] = useState(false);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const matchedRef = useRef<HTMLHeadingElement>(null);
  const focusAfterFix = useRef<number | null>(null);
  const focusAfterUpload = useRef(false);

  useEffect(() => {
    if (focusAfterUpload.current && upload) {
      focusAfterUpload.current = false;
      summaryRef.current?.focus();
    }
  }, [upload?.parsed]);

  useEffect(() => {
    if (focusAfterFix.current === null) return;
    focusAfterFix.current = null;
    const next = document.querySelector<HTMLSelectElement>('.flagged-row select');
    if (next) next.focus();
    else matchedRef.current?.focus();
  }, [flagged.length]);

  const onFile = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setParsing(true);
    let parsed: ParsedUpload;
    try {
      const text = file.size > MAX_UPLOAD_BYTES ? '' : await file.text();
      parsed = parseUpload(text, file.size);
    } catch {
      parsed = { fileErrors: ['This file could not be read. Save it as a CSV and try again.'], rows: [] };
    } finally {
      setParsing(false);
      // Clear the input so choosing the same (corrected) file again fires change.
      input.value = '';
    }
    focusAfterUpload.current = true;
    onUpload({ fileName: file.name, parsed, countyFixes: {}, continued: false });
  };

  const total = communities.length + flagged.length;

  return (
    <div class="upload-panel">
      <div class="field">
        <label for="upload-file">Your CSV file</label>
        <p id="upload-file-hint" class="field__hint">
          Use the <a href={withBase(UPLOAD_TEMPLATE_PATH)} download>template</a>: one row per community,
          with its county or FIPS code and the number of households in need. Files up to 1 MB.
          Upload program totals by community only. Do not include names, addresses or other personal details.
        </p>
        <input id="upload-file" type="file" accept=".csv,text/csv" aria-describedby="upload-file-hint" onChange={onFile} />
      </div>
      {parsing && <p role="status">Reading your file…</p>}

      {upload && (
        <section aria-labelledby="upload-summary">
          <h3 id="upload-summary" tabIndex={-1} ref={summaryRef}>
            {upload.parsed.fileErrors.length
              ? `There is a problem with ${upload.fileName}`
              : `${communities.length} of ${total} rows matched a Kentucky county`}
          </h3>
          {upload.parsed.fileErrors.length > 0 && (
            <div class="callout callout--error">
              <ul>{upload.parsed.fileErrors.map((e) => <li key={e}>{e}</li>)}</ul>
              <p><a href={withBase(UPLOAD_TEMPLATE_PATH)} download>Download the template</a> to compare columns.</p>
            </div>
          )}

          {flagged.length > 0 && (
            <div class="callout callout--warning">
              <p>
                {flagged.length === 1 ? '1 row needs' : `${flagged.length} rows need`} attention.
                Choose the right county below, or fix the numbers in your file and upload it again.
              </p>
              <ul class="flagged-list">
                {flagged.map((f) => {
                  const countyProblem = f.match.status === 'flagged';
                  const id = `fix-row-${f.row.rowNumber}`;
                  return (
                    <li class="flagged-row" key={f.row.rowNumber}>
                      <p><strong>Row {f.row.rowNumber}: {f.row.communityName}</strong></p>
                      <ul>{f.problems.map((p) => <li key={p}>{p}</li>)}</ul>
                      {countyProblem && f.row.issues.length === 0 && (
                        <div class="field">
                          <label for={id}>Kentucky county for row {f.row.rowNumber}</label>
                          <CountyPicker id={id} onPick={(fips) => { focusAfterFix.current = f.row.rowNumber; onFix(f.row.rowNumber, fips); }} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {upload.continued ? (
                <p>Continuing with the {communities.length} matched rows. Rows above are left out until fixed.</p>
              ) : (
                <button
                  type="button"
                  class="button button--secondary"
                  aria-disabled={communities.length === 0 ? 'true' : undefined}
                  aria-describedby={communities.length === 0 ? 'continue-reason' : undefined}
                  onClick={() => { if (communities.length > 0) onContinue(); }}
                >
                  Continue with {communities.length} of {total} matched rows
                </button>
              )}
              {communities.length === 0 && (
                <p id="continue-reason" class="field__hint">None of your rows matched a Kentucky county yet, so there is nothing to continue with.</p>
              )}
            </div>
          )}

          {communities.length > 0 && (
            <>
              <h4 id="matched-heading" tabIndex={-1} ref={matchedRef}>Matched communities</h4>
              <ul class="matched-list">
                {communities.map((c) => (
                  <li key={c.input.id}>{c.input.name}, {c.county.county_name}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
