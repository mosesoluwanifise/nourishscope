import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * WCAG AA contrast for every colour-role pair the CSS uses, in both colour schemes.
 * The list covers the pairs named here only: add a pair when new CSS puts one colour on another.
 */
const css = readFileSync('src/styles/global.css', 'utf8');

function tokensIn(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

const light = tokensIn(css.match(/:root\s*\{([^}]*)\}/)![1]);
const darkBlock = css.match(/:root\[data-theme='dark'\]\s*\{([^}]*)\}/);
const dark = { ...light, ...tokensIn(darkBlock![1]) };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const BACKGROUNDS = ['bg', 'surface', 'surface-muted'];

/** [foreground, background] pairs that carry text: 4.5:1. */
const TEXT_PAIRS: [string, string][] = [
  ...['text', 'text-muted', 'link', 'link-hover', 'danger', 'accent'].flatMap((fg) =>
    BACKGROUNDS.map((bg) => [fg, bg] as [string, string]),
  ),
  ['on-primary', 'primary-fill'],
  ['on-primary', 'primary-fill-hover'],
  ['text', 'primary-soft'],
  ['link', 'primary-soft'],
  ['link-hover', 'primary-soft'],
  ['text-muted', 'primary-soft'],
  ['text', 'accent-soft'],
  ['accent', 'accent-soft'],
  ['link', 'accent-soft'],
  ['text', 'danger-soft'],
  ['danger', 'danger-soft'],
  ['link', 'danger-soft'],
];

/** [foreground, background] pairs for borders, focus rings and chart marks: 3:1. */
const UI_PAIRS: [string, string][] = [
  ['input-border', 'surface'],
  ['input-border', 'bg'],
  ['focus', 'bg'],
  ['focus', 'surface'],
  ['bar', 'surface'],
  ['primary-fill', 'surface'],
  ['primary-fill', 'bg'],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s colour scheme', (_name, tokens) => {
  const value = (role: string) => {
    const hex = tokens[`color-${role}`];
    if (!hex) throw new Error(`Missing token --color-${role}`);
    return hex;
  };

  it.each(TEXT_PAIRS)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(value(fg), value(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s on %s is at least 3:1', (fg, bg) => {
    expect(contrast(value(fg), value(bg))).toBeGreaterThanOrEqual(3);
  });
});

it('defines a dark value for every light colour token', () => {
  expect(Object.keys(tokensIn(darkBlock![1])).sort()).toEqual(Object.keys(light).sort());
});
