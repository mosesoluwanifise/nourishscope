import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PAGES = ['', 'app', 'methodology', 'data-sources', 'about', 'research', 'changelog', 'cite', 'privacy', 'accessibility', 'terms', 'contact'];
const ORIGIN = 'http://localhost:4322';

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test.describe('every page', () => {
  for (const path of PAGES) {
    test(`/${path} has one h1, a title, the version, and no axe violations`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page).toHaveTitle(/NourishScope/);
      await expect(page.getByTestId('version')).toHaveText('1.0.0');
      expect(await axe(page)).toEqual([]);
    });
  }
});

test('no page has sideways scroll at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const path of PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `/${path}`).toBeLessThanOrEqual(0);
  }
});

test('no page shows an em dash or en dash', async ({ page }) => {
  const DASH = /[–—]/;
  const offenders: string[] = [];
  const check = async (label: string) => {
    const text = await page.locator('body').innerText();
    for (const line of text.split('\n')) if (DASH.test(line)) offenders.push(`${label}: ${line.trim()}`);
  };
  for (const path of PAGES) {
    await page.goto(path);
    await check(`/${path}`);
  }
  await page.goto('app');
  await page.getByLabel('Kentucky county data').check();
  for (const name of ['Magoffin County', 'Owsley County', 'Wolfe County']) {
    await page.getByRole('checkbox', { name: new RegExp(`^${name}`) }).check();
  }
  await page.getByLabel('Total budget').fill('50000');
  await expect(page.locator('#module-nutrition')).toBeVisible();
  await check('/app with results');
  expect(offenders).toEqual([]);
});

test('every internal link and download resolves under the base path', async ({ page, request }) => {
  const seen = new Set<string>();
  for (const path of PAGES) {
    await page.goto(path);
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href));
    for (const href of hrefs) {
      if (!href.startsWith(ORIGIN)) continue;
      const url = href.split('#')[0];
      if (seen.has(url)) continue;
      seen.add(url);
      const res = await request.get(url);
      expect(res.status(), url).toBe(200);
    }
  }
  expect(seen.size).toBeGreaterThan(10);
});

test('the Home worked example shows the spec figure for Magoffin', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('.worked-example')).toContainText('$26,427.28');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('content pages render fully', async ({ page }) => {
    await page.goto('methodology');
    await expect(page.locator('#strategy-proportional')).toBeVisible();
    await page.goto('');
    await expect(page.locator('.worked-example')).toContainText('$26,427.28');
  });
});

// Playwright's "JavaScript disabled" mode still parses <noscript> as text, so check the served HTML.
test('/app ships a no-JavaScript message with working links', async ({ request }) => {
  const html = await (await request.get('app')).text();
  const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? '';
  expect(noscript).toContain('The planning tool needs JavaScript');
  expect(noscript).toContain('read <a href="/nourishscope/methodology">');
  expect(noscript).toContain('href="/nourishscope/downloads/nourishscope_upload_template.csv"');
});
