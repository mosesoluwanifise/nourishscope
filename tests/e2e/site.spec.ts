import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { selectCounties } from './helpers';

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
  await selectCounties(page);
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

test('the worked example shows the spec figure for Magoffin on Home and in full on Methodology', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('.allocation-preview')).toContainText('Magoffin County');
  await expect(page.locator('.allocation-preview')).toContainText('$26,427.28');
  await page.getByRole('link', { name: 'See the full calculation' }).click();
  await expect(page).toHaveURL(/methodology#worked-example$/);
  await expect(page.locator('#worked-example')).toContainText('$26,427.28');
  await expect(page.locator('#worked-example thead').first()).toContainText('Source: CDC PLACES, 2021-2022');
});

test.describe('Home', () => {
  test('hero fits the first screen on desktop with the preview beside it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('');
    for (const el of [page.locator('#hero-heading'), page.locator('.hero__lead'), page.getByRole('main').getByRole('link', { name: 'Open the app' }),
      page.getByRole('link', { name: 'Read the methodology' })]) await expect(el).toBeInViewport();
    const text = await page.locator('.hero__text').boundingBox();
    const preview = await page.locator('.allocation-preview').boundingBox();
    expect(preview!.x).toBeGreaterThan(text!.x + text!.width - 1);
  });

  test('hero subtext is 20 words or fewer', async ({ page }) => {
    await page.goto('');
    const words = (await page.locator('.hero__lead').innerText()).trim().split(/\s+/);
    expect(words.length).toBeLessThanOrEqual(20);
  });

  test('pillars show three figures, each saying how it was calculated', async ({ page }) => {
    await page.goto('');
    const labels = page.locator('.pillar .source-label');
    await expect(labels).toHaveCount(3);
    await expect(labels.nth(1)).toHaveText('Middle value across Kentucky counties, calculated by NourishScope from CDC PLACES, 2022');
    for (const label of await labels.allInnerTexts()) expect(label).toContain('calculated by NourishScope');
  });

  test('loads no JavaScript', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(r.url()); });
    await page.goto('');
    expect(scripts).toEqual([]);
  });

  test('on a phone the header is one row with a short app button', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('');
    const header = await page.locator('.site-header').boundingBox();
    expect(header!.height).toBeLessThanOrEqual(80);
    const app = page.locator('.site-header').getByRole('link', { name: 'Open the app' });
    await expect(app.locator('.site-header__app-short')).toBeVisible();
    await expect(app.locator('.site-header__app-long')).toBeHidden();
    const [brand, menu] = await Promise.all([page.locator('.site-header__brand').boundingBox(), page.locator('.site-header__menu summary').boundingBox()]);
    expect(Math.abs(brand!.y + brand!.height / 2 - (menu!.y + menu!.height / 2))).toBeLessThan(8);
    const theme = await page.getByRole('button', { name: 'Dark mode' }).boundingBox();
    expect(Math.abs(brand!.y + brand!.height / 2 - (theme!.y + theme!.height / 2))).toBeLessThan(8);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('content pages render fully', async ({ page }) => {
    await page.goto('methodology');
    await expect(page.locator('#strategy-proportional')).toBeVisible();
    await page.goto('');
    await expect(page.locator('.allocation-preview')).toContainText('$26,427.28');
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

test.describe('Data Sources and About', () => {
  test('sources are cards with descriptive link text, and the field table starts collapsed', async ({ page }) => {
    await page.goto('data-sources');
    const cards = page.locator('.source-card');
    await expect(cards).toHaveCount(5);
    for (const text of await cards.locator('a').allInnerTexts()) {
      expect(text).toMatch(/^View this source on [a-z.]+$/);
    }
    const table = page.locator('.field-table table');
    await expect(table).toBeHidden();
    await page.getByText('Every field, with its source and year').click();
    await expect(table.locator('tbody tr')).toHaveCount(19);
  });

  for (const width of [1280, 375]) {
    test(`the About photo is at most 240px wide at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('about');
      const img = page.getByRole('img', { name: /Portrait of Yetunde/ });
      await expect(img).toBeVisible();
      expect((await img.boundingBox())!.width).toBeLessThanOrEqual(240);
    });
  }
});
