/**
 * Labelled input with the shared validation pattern (plan U5): the message
 * sits under the field, is linked with aria-describedby, and shows after
 * the field loses focus or once `forceShow` is set.
 */
import { useState } from 'preact/hooks';

interface Props {
  id: string;
  label: string;
  value: string;
  onInput: (value: string) => void;
  hint?: string;
  error?: string;
  warning?: string;
  prefix?: string;
  suffix?: string;
  inputMode?: 'decimal' | 'numeric';
  forceShow?: boolean;
  compact?: boolean;
}

export default function Field({
  id, label, value, onInput, hint, error, warning, prefix, suffix,
  inputMode = 'decimal', forceShow = false, compact = false,
}: Props) {
  const [touched, setTouched] = useState(false);
  const showError = Boolean(error) && (touched || forceShow);
  const describedBy = [hint && `${id}-hint`, showError && `${id}-error`, warning && `${id}-warning`]
    .filter(Boolean).join(' ') || undefined;

  return (
    <div class={`field${compact ? ' field--compact' : ''}${showError ? ' field--error' : ''}`}>
      <label for={id} class={compact ? 'visually-hidden' : undefined}>{label}</label>
      {hint && <p id={`${id}-hint`} class="field__hint">{hint}</p>}
      <div class="field__control">
        {prefix && <span class="field__affix" aria-hidden="true">{prefix}</span>}
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          value={value}
          aria-invalid={showError ? 'true' : undefined}
          aria-describedby={describedBy}
          onInput={(e) => onInput((e.currentTarget as HTMLInputElement).value)}
          onBlur={() => setTouched(true)}
        />
        {suffix && <span class="field__affix" aria-hidden="true">{suffix}</span>}
      </div>
      {showError && <p id={`${id}-error`} class="field__error">{error}</p>}
      {warning && <p id={`${id}-warning`} class="field__warning">{warning}</p>}
    </div>
  );
}
