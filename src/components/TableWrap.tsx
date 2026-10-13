/**
 * Scrollable wrapper for wide tables. It is a labelled, focusable region so
 * keyboard users can scroll it on narrow screens (WCAG 2.1.1, axe
 * scrollable-region-focusable). Used by Astro pages and the /app island.
 */
import type { ComponentChildren } from 'preact';

interface Props {
  label: string;
  class?: string;
  children: ComponentChildren;
}

export default function TableWrap({ label, class: className, children }: Props) {
  return (
    <div class={className ? `table-wrap ${className}` : 'table-wrap'} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
