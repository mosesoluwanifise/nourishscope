import { describe, expect, it } from 'vitest';
import { prefixRootLinks } from '../../src/lib/links';

describe('prefixRootLinks', () => {
  const base = '/nourishscope/';

  it('prefixes root-relative links and images', () => {
    expect(prefixRootLinks('<a href="/app">x</a>', base)).toBe('<a href="/nourishscope/app">x</a>');
    expect(prefixRootLinks('<img src="/images/founder.jpg">', base)).toBe('<img src="/nourishscope/images/founder.jpg">');
  });

  it('leaves external, protocol-relative, anchor, mailto and already-prefixed links alone', () => {
    const html = '<a href="https://x.org/a"></a><a href="//cdn.x"></a><a href="#top"></a><a href="mailto:a@b.c"></a><a href="/nourishscope/app"></a>';
    expect(prefixRootLinks(html, base)).toBe(html);
  });

  it('does nothing when the site is served from the domain root', () => {
    expect(prefixRootLinks('<a href="/app">x</a>', '/')).toBe('<a href="/app">x</a>');
  });
});
