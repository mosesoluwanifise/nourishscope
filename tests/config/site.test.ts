import { describe, expect, it } from 'vitest';
import { METHODOLOGY_VERSION, TOOL_VERSION, withBase } from '../../src/config/site';

describe('site config', () => {
  it('uses a semver tool version and methodology version 1.0', () => {
    expect(TOOL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(METHODOLOGY_VERSION).toBe('1.0');
  });
});

describe('withBase', () => {
  it('prefixes internal paths with the base path', () => {
    expect(withBase('/app', '/nourishscope/')).toBe('/nourishscope/app');
    expect(withBase('app', '/nourishscope')).toBe('/nourishscope/app');
    expect(withBase('/downloads/x.csv', '/nourishscope')).toBe('/nourishscope/downloads/x.csv');
  });

  it('returns the base root for an empty or root path', () => {
    expect(withBase('/', '/nourishscope/')).toBe('/nourishscope/');
    expect(withBase('', '/nourishscope')).toBe('/nourishscope/');
  });

  it('works when the site is served from the domain root', () => {
    expect(withBase('/app', '/')).toBe('/app');
    expect(withBase('/', '/')).toBe('/');
  });

  it('leaves external links, mailto and anchors untouched', () => {
    expect(withBase('https://www.cdc.gov/places', '/nourishscope')).toBe('https://www.cdc.gov/places');
    expect(withBase('mailto:someone@example.org', '/nourishscope')).toBe('mailto:someone@example.org');
    expect(withBase('#results', '/nourishscope')).toBe('#results');
  });
});
