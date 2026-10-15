import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { selectCounties as workedExample } from './helpers';

const PAGES = ['', 'app', 'methodology', 'data-sources', 'about', 'changelog', 'cite', 'privacy', 'accessibility', 'terms', 'contact'];

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });

  for (const path of PAGES) {
    test(`/${path} has no axe violations`, async ({ page }) => {
      await page.goto(path);
      expect(await axe(page)).toEqual([]);
    });
  }

  test('/app with results has no axe violations', async ({ page }) => {
    await workedExample(page);
    await expect(page.locator('#module-nutrition')).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test('printing still uses the light colours', async ({ page }) => {
    await page.goto('');
    const screenBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
    const printBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(screenBg).not.toBe(printBg);
    expect(printBg).toBe('rgb(246, 247, 245)');
  });
});

test.describe('phone sizing', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('stand-alone nav links are at least 44px tall', async ({ page }) => {
    await workedExample(page);
    const heights = await page.$$eval('.section-nav a, .site-footer nav a', (as) =>
      as.map((a) => [a.textContent, a.getBoundingClientRect().height] as const),
    );
    expect(heights.length).toBeGreaterThan(6);
    for (const [label, h] of heights) expect(h, label ?? '').toBeGreaterThanOrEqual(44);
  });

  test('labels, hints and badges are at least 14px', async ({ page }) => {
    await workedExample(page);
    const sizes = await page.$$eval('.source-label, .field__hint, .field__warning, .badge, caption', (els) =>
      els.map((el) => [el.className || el.tagName, parseFloat(getComputedStyle(el).fontSize)] as const),
    );
    expect(sizes.length).toBeGreaterThan(5);
    for (const [name, px] of sizes) expect(px, String(name)).toBeGreaterThanOrEqual(14);
  });
});

test.describe('theme switch', () => {
  test('switches to dark, is remembered on the next page, and switches back', async ({ page }) => {
    await page.goto('about');
    const root = page.locator('html');
    const toggle = page.getByRole('button', { name: 'Dark mode' });
    await expect(root).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await page.goto('methodology');
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Dark mode' }).click();
    await expect(root).toHaveAttribute('data-theme', 'light');
  });

  test.describe('on a dark device', () => {
    test.use({ colorScheme: 'dark' });
    test('starts dark and can be switched to light', async ({ page }) => {
      await page.goto('');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.getByRole('button', { name: 'Dark mode' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });
  });
});

test.describe('document layout', () => {
  test('on a wide screen the Methodology contents sit on the left of the text', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('methodology');
    const toc = (await page.getByRole('navigation', { name: 'On this page' }).boundingBox())!;
    const body = (await page.locator('.doc__body').boundingBox())!;
    expect(toc.x + toc.width).toBeLessThan(body.x);
    // The pair is centred: the space either side differs by less than one gutter.
    const left = toc.x;
    const right = 1280 - (body.x + body.width);
    expect(Math.abs(left - right)).toBeLessThan(48);
  });

  test('the About profile card sits on the left of the text on a wide screen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('about');
    const card = (await page.locator('.profile-card').boundingBox())!;
    const body = (await page.locator('.doc__body').boundingBox())!;
    expect(card.x + card.width).toBeLessThan(body.x);
  });
});
