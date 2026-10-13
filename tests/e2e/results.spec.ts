import { expect, test, type Page } from '@playwright/test';

async function selectCounties(page: Page, names: string[], budget = '50000') {
  await page.goto('app');
  await page.getByLabel('Kentucky county data').check();
  for (const name of names) await page.getByRole('checkbox', { name: new RegExp(`^${name}`) }).check();
  await page.getByLabel('Total budget').fill(budget);
}

test('need-only mode shows the coverage prompt and all five strategies (AE1)', async ({ page }) => {
  await selectCounties(page, ['Magoffin County', 'Owsley County', 'Wolfe County']);
  await expect(page.locator('.module').first()).toContainText('Coverage: —');
  await expect(page.locator('.module').first()).toContainText('Enter the number of households served');
  await expect(page.locator('.comparison-table tbody tr')).toHaveCount(5);
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
