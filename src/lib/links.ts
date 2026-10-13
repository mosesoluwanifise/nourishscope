/**
 * Add the deploy base path to root-relative href/src attributes in rendered
 * HTML ("/app" -> "/nourishscope/app"). Leaves protocol-relative URLs,
 * external links, anchors and already-prefixed paths alone.
 */
export function prefixRootLinks(html: string, base: string): string {
  const trimmed = base.replace(/\/+$/, '');
  if (!trimmed) return html;
  return html.replace(/\b(href|src)="\/(?!\/)([^"]*)"/g, (match, attr: string, rest: string) => {
    if (`/${rest}` === trimmed || `/${rest}`.startsWith(`${trimmed}/`)) return match;
    return `${attr}="${trimmed}/${rest}"`;
  });
}
