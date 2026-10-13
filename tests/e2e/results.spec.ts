import { expect, test, type Page } from '@playwright/test';

async function selectCounties(page: Page, names: string[], budget = '50000') {
  await page.goto('app');
  await page.getByLabel('Kentucky county data').check();
  for (const name of names) await page.getByRole('checkbox', { name: new RegExp(`^${name}`) }).check();
  await page.getByLabel('Total budget').fill(budget);
}

test('need-only mode shows the coverage prompt and all five strategies (AE1)', async ({ page }) => {
  await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
  await expect(page.locator('.module').first()).toContainText('Coverage: Not entered');
  await expect(page.locator('.module').first()).toContainText('Enter the number of households served');
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
