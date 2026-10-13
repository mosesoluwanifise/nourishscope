/**
 * Single source of truth for site-wide constants (plan R14).
 * Change the version here and it updates the footer, the PDF brief,
 * the CSV export and the Cite page.
 */
export const TOOL_VERSION = '1.0.0';
export const METHODOLOGY_VERSION = '1.0';

export const SITE_NAME = 'NourishScope';
export const REPO_URL = 'https://github.com/mosesoluwanifise/nourishscope';

/** Site path of the upload template; pass through withBase() for links. */
export const UPLOAD_TEMPLATE_PATH = '/downloads/nourishscope_upload_template.csv';

/**
 * Prefix an internal path with the deploy base path.
 * Astro's `base` only rewrites bundled assets, so every hand-written
 * internal link and download goes through this helper.
 */
export function withBase(path: string, base: string = import.meta.env.BASE_URL ?? '/'): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('#')) return path;
  const trimmedBase = base.replace(/\/+$/, '');
  const trimmedPath = path.replace(/^\/+/, '');
  if (trimmedPath === '') return `${trimmedBase}/`;
  return `${trimmedBase}/${trimmedPath}`;
}
