/**
 * Save or export the planning brief (plan U7). Buttons stay focusable while
 * unavailable (aria-disabled) and explain why, with a link to the cost field.
 */
import type { Brief } from '../../lib/export/brief-model';
import { briefToCsv } from '../../lib/export/csv';

interface Props {
  brief: Brief | null;
  costConfirmed: boolean;
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
}

export default function ExportPanel({ brief, costConfirmed, previewOpen, setPreviewOpen }: Props) {
  const blocked = !brief || !costConfirmed;
  const reason = !brief
    ? 'Results are not ready yet. Choose your data, select communities and enter a budget first.'
    : 'Confirm your cost per household first: the $100 is only an example.';

  const savePdf = () => {
    if (blocked) return;
    window.print();
  };
  const saveCsv = () => {
    if (blocked || !brief) return;
    const blob = new Blob([briefToCsv(brief)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nourishscope-planning-brief-${brief.generatedOn}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="export-heading" class="module" id="export">
      <h3 id="export-heading" tabIndex={-1}>Save or export</h3>
      <p>The planning brief lists your data sources, assumptions, inputs, results, the date and the tool version.</p>
      {blocked && (
        <p id="export-reason" class="callout callout--warning">
          {reason}{' '}
          {brief && !costConfirmed && (
            <a href="#cost" onClick={(e) => { e.preventDefault(); document.getElementById('cost')?.focus(); }}>
              Go to cost per household
            </a>
          )}
        </p>
      )}
      <div class="button-row">
        <button type="button" class="button" onClick={savePdf}
          aria-disabled={blocked ? 'true' : undefined} aria-describedby={blocked ? 'export-reason' : 'pdf-hint'}>
          Save planning brief as PDF
        </button>
        <button type="button" class="button button--secondary" onClick={saveCsv}
          aria-disabled={blocked ? 'true' : undefined} aria-describedby={blocked ? 'export-reason' : undefined}>
          Download as CSV
        </button>
        <button type="button" class="button button--secondary" aria-expanded={previewOpen ? 'true' : 'false'}
          aria-controls="planning-brief" onClick={() => setPreviewOpen(!previewOpen)} disabled={!brief}>
          {previewOpen ? 'Hide brief preview' : 'Preview the brief'}
        </button>
      </div>
      <p id="pdf-hint" class="field__hint">
        On a phone, the PDF button opens your browser’s print screen. Choose “Save as PDF” (Android) or use Share,
        then Print, then Share again to save the PDF (iPhone).
      </p>
    </section>
  );
}
