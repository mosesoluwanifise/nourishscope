/**
 * "Source: CDC PLACES, 2022" beside a figure or column (plan R23).
 * Rendered statically on Astro pages and inside the /app island.
 */
import { sourceLabel, UPLOAD_SOURCE_TEXT } from '../lib/data/labels';
import { FIELDS } from '../lib/data/load';

interface Props {
  /** One field, or every field a combined measure is built from. */
  field: string | readonly string[];
  /** True when the figure came from the user's upload instead. */
  uploaded?: boolean;
}

export default function SourceLabel({ field, uploaded = false }: Props) {
  const text = uploaded ? UPLOAD_SOURCE_TEXT : sourceLabel(field, FIELDS);
  if (!text) return null;
  return <span class="source-label">{text}</span>;
}
