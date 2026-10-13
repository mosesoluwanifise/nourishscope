import { expect, test, type Page } from '@playwright/test';
import { selectCounties } from './helpers';

test('need-only mode shows the coverage prompt and all five strategies (AE1)', async ({ page }) => {
  await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
  const nutrition = page.locator('#module-nutrition').locator('..');
  await expect(nutrition).toContainText('Coverage: Not entered');
  await expect(nutrition).toContainText('Enter the number of households served');
  await expect(page.locator('.comparison-table tbody tr')).toHaveCount(5);
  await expect(page.locator('.print-brief')).toContainText('Coverage: Not entered');
  await expect(page.locator('.print-brief tbody tr').first()).toContainText('Not entered');
});

test('suppressed grocery data reads as not reported, never zero (AE4)', async ({ page }) => {
  await selectCounties(page, ['Anderson County']);
  const food = page.locator('#module-food').locator('..');
  const row = food.locator('tbody tr', { hasText: 'Anderson County' });
  await expect(row).toContainText('Not reported (suppressed by source)');
});

test('health figures carry their CDC PLACES source and year', async ({ page }) => {
  await selectCounties(page, ['Adair County']);
  const headers = page.locator('#module-health').locator('..').locator('thead');
  await expect(headers).toContainText('Source: CDC PLACES, 2022');
  await expect(headers).toContainText('Source: CDC PLACES, 2021');
  await expect(headers).toContainText('Source: CDC PLACES, 2021-2022');
});

test('the FIPS code source has a data year of Not applicable', async ({ page }) => {
  await page.goto('data-sources');
  await expect(page.locator('.source-list li', { hasText: 'County FIPS codes' })).toContainText('Not applicable');
});

test('strategy comparison shows cards instead of the table at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
  await expect(page.locator('.comparison-cards')).toBeVisible();
  await expect(page.locator('.comparison-table')).toBeHidden();
});

test('cancelling a data-source switch keeps the current choice selected', async ({ page }) => {
  await selectCounties(page, ['Adair County']);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByLabel('Try sample data').check({ force: true }).catch(() => undefined);
  await expect(page.getByLabel('Kentucky county data')).toBeChecked();
  await expect(page.getByLabel('Try sample data')).not.toBeChecked();
  await expect(page.locator('.current-source')).toContainText('Kentucky county data');
});

test('re-uploading a corrected file with the same name is read again', async ({ page }) => {
  await page.goto('app');
  await page.getByLabel('Upload your own CSV').check();
  const input = page.getByLabel('Your CSV file');
  await input.setInputFiles({
    name: 'program.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('community_name,county,number_of_households_in_need\nA,Springfield,10\n'),
  });
  await expect(page.locator('#upload-summary')).toHaveText('0 of 1 rows matched a Kentucky county');
  await input.setInputFiles({
    name: 'program.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('community_name,county,number_of_households_in_need\nA,Adair,10\n'),
  });
  await expect(page.locator('#upload-summary')).toHaveText('1 of 1 rows matched a Kentucky county');
});

test('the summary names the strategy and its picker changes the whole results area', async ({ page }) => {
  await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
  const summary = page.locator('.results-summary');
  await expect(summary.getByRole('heading')).toHaveText('Summary: Share by unmet need');
  await expect(summary).toContainText('Most: Magoffin County gets $26,427.28');
  await page.getByLabel('Strategy', { exact: true }).selectOption({ label: 'Equal split' });
  await expect(summary.getByRole('heading')).toHaveText('Summary: Equal split');
  await expect(summary).toContainText('All 3 communities get $16,666.67');
  await expect(page.locator('#module-nutrition').locator('..')).toContainText('Showing Equal split');
});

test.describe('results bar on a phone', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('appears while results are below, jumps to them, and hides once there', async ({ page }) => {
    await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
    await page.getByLabel('Total budget').scrollIntoViewIfNeeded();
    const bar = page.locator('.results-bar');
    await expect(bar).toBeVisible();
    await expect(bar).toContainText('Share by unmet need: 499 households reached.');
    await bar.getByRole('link', { name: 'See results' }).click();
    await expect(page.locator('#stage-results')).toBeFocused();
    await expect(bar).toBeHidden();
    await page.locator('#module-nutrition').scrollIntoViewIfNeeded();
    await expect(bar).toBeHidden();
  });

  test('keeps a focused field clear of the bar', async ({ page }) => {
    await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
    await page.getByLabel('Total budget').scrollIntoViewIfNeeded();
    await expect(page.locator('.results-bar')).toBeVisible();
    await page.getByLabel('Total budget').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement!.getBoundingClientRect().bottom);
    const barTop = await page.locator('.results-bar').evaluate((el) => el.getBoundingClientRect().top);
    expect(focused).toBeLessThanOrEqual(barTop);
  });

  test('is not shown without results', async ({ page }) => {
    await selectCounties(page, ['Magoffin County'], '');
    await expect(page.locator('.results-bar')).toHaveCount(0);
  });
});

test('the results bar never shows on a wide screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('.results-bar')).toHaveCount(0);
});

test.describe('Who gets the money', () => {
  const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  test('is a table with five strategy columns when the results column is wide', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
    const table = page.locator('.distribution__table table');
    await expect(table).toBeVisible();
    await expect(table.locator('thead th')).toHaveCount(6);
    await expect(table.locator('thead')).toContainText('Share by unmet need (selected)');
    await expect(table.locator('tbody tr')).toHaveCount(3);
    await expect(table.locator('tbody tr').first()).toContainText('Magoffin County');
    const wolfe = table.locator('tbody tr', { hasText: 'Wolfe County' });
    await expect(wolfe.locator('td').nth(4)).toContainText('$50,000.00');
    await expect(wolfe.locator('td').nth(4)).toContainText('Most');
    await expect(table.locator('tfoot')).toContainText('500 households');
    const fit = await page.locator('.distribution__table').evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(fit).toBeLessThanOrEqual(0);
  });

  for (const width of [1024, 1100]) {
    test(`fits without clipping at ${width}px beside the inputs column`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
      await expect(page.locator('.distribution__cards')).toBeVisible();
      await expect(page.locator('.distribution__table')).toBeHidden();
      expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    });
  }

  test('is one card per community on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
    const cards = page.locator('.distribution__cards > li');
    await expect(cards).toHaveCount(3);
    await expect(cards.first().locator('dt')).toHaveText([
      'Equal split', 'Share by unmet need (selected)', 'Share by need, with a minimum for all',
      'Share by need and health burden', 'Lowest cost first',
    ]);
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
  });

  test('shows the first 10 of a long selection until asked for all', async ({ page }) => {
    await page.goto('app');
    await page.getByLabel('Kentucky county data').check();
    await page.getByLabel('Appalachian counties only').check();
    await page.getByRole('button', { name: /Select all shown/ }).click();
    await page.getByLabel('Total budget').fill('500000');
    const cards = page.locator('.distribution__cards > li');
    const rows = page.locator('.distribution__table tbody tr');
    const visibleCount = async () => (await cards.first().isVisible() ? cards.count() : rows.count());
    expect(await visibleCount()).toBe(10);
    const more = page.getByRole('button', { name: /Show all 54 communities/ });
    await more.click();
    expect(await visibleCount()).toBe(54);
    await expect(page.getByRole('button', { name: 'Show the first 10 communities' })).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('planning table on a phone', () => {
  test('becomes cards that lead with allocation and households reached', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
    await expect(page.locator('.nutrition__table')).toBeHidden();
    const magoffin = page.locator('.nutrition__cards > li', { hasText: 'Magoffin County' });
    await expect(magoffin.locator('.nutrition__lead')).toHaveText(/\$26,427\.28\s*264 households reached/);
    await expect(magoffin).toContainText('Not entered');
    await expect(magoffin).toContainText('Source: Census ACS 5-year, 2020-2024');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test('stays a table on a wide screen, with no clipped columns at 1100px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
    await expect(page.locator('.nutrition__table')).toBeVisible();
    await expect(page.locator('.nutrition__cards')).toBeHidden();
    await page.setViewportSize({ width: 1100, height: 900 });
    await expect(page.locator('.nutrition__cards')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});
