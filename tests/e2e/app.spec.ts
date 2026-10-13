import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const ORIGIN = 'http://localhost:4322';

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

async function workedExample(page: Page) {
  await page.goto('app');
  await page.getByLabel('Kentucky county data').check();
  for (const name of ['Magoffin County', 'Owsley County', 'Wolfe County']) {
    await page.getByRole('checkbox', { name: new RegExp(`^${name}`) }).check();
  }
  await page.getByLabel('Total budget').fill('50000');
}

test('worked example: results match the spec and export waits for cost confirmation', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });

  await page.goto('app');
  expect(await axe(page)).toEqual([]);
  await workedExample(page);

  const nutrition = page.locator('#module-nutrition').locator('..');
  await expect(nutrition).toContainText('$26,427.28');
  await expect(nutrition).toContainText('$8,909.25');
  await expect(nutrition).toContainText('$14,663.46');
  await expect(page.locator('#sensitivity').locator('..')).toContainText('624');

  const pdf = page.getByRole('button', { name: 'Save planning brief as PDF' });
  await expect(pdf).toHaveAttribute('aria-disabled', 'true');
  await pdf.focus();
  await expect(pdf).toBeFocused();
  await page.getByRole('link', { name: 'Go to cost per household' }).click();
  await expect(page.locator('#cost')).toBeFocused();

  await page.getByRole('textbox', { name: 'Cost per household' }).fill('110');
  await expect(pdf).not.toHaveAttribute('aria-disabled', 'true');

  expect(await axe(page)).toEqual([]);
  expect(external).toEqual([]);
});

test('empty states explain what to do next', async ({ page }) => {
  await page.goto('app');
  await expect(page.locator('.empty-state')).toHaveText('Choose your data to get started.');
  await page.getByLabel('Kentucky county data').check();
  await expect(page.locator('.empty-state')).toHaveText('Select at least one county to see results.');
  await page.getByRole('checkbox', { name: /^Adair County/ }).check();
  await expect(page.locator('.empty-state')).toHaveText('Enter your total budget to see results.');
});

test('upload: flagged rows can be fixed with the county picker', async ({ page }) => {
  await page.goto('app');
  await page.getByLabel('Upload your own CSV').check();
  await page.getByLabel('Your CSV file').setInputFiles({
    name: 'program.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('community_name,county,number_of_households_in_need\nNorth,Adair,100\nSouth,Springfield,50\n'),
  });
  await expect(page.locator('#upload-summary')).toHaveText('1 of 2 rows matched a Kentucky county');
  await expect(page.locator('#upload-summary')).toBeFocused();
  expect(await axe(page)).toEqual([]);

  // The county options render when the control gets focus, as with a tap or Tab.
  const picker = page.getByLabel('Kentucky county for row 3');
  await picker.focus();
  await picker.selectOption({ label: 'Allen County' });
  await expect(page.locator('#upload-summary')).toHaveText('2 of 2 rows matched a Kentucky county');
  await expect(page.locator('#matched-heading')).toBeFocused();
});

test('upload: a file with no matching rows cannot continue', async ({ page }) => {
  await page.goto('app');
  await page.getByLabel('Upload your own CSV').check();
  await page.getByLabel('Your CSV file').setInputFiles({
    name: 'bad.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('community_name,county,number_of_households_in_need\nA,Narnia,10\nB,Gotham,5\nC,Springfield,3\n'),
  });
  await expect(page.locator('.empty-state')).toContainText('None of your rows matched');
  await expect(page.getByRole('button', { name: /Continue with 0 of 3/ })).toHaveAttribute('aria-disabled', 'true');
});

test('sample data is labelled on screen and in the brief', async ({ page }) => {
  await page.goto('app');
  await page.getByLabel('Try sample data').check();
  await page.getByLabel('Total budget').fill('50000');
  await expect(page.locator('.current-source')).toContainText('Sample data');
  await page.getByRole('button', { name: 'Preview the brief' }).click();
  await expect(page.locator('#planning-brief')).toContainText('Sample data');
});

test('print shows only the planning brief', async ({ page }) => {
  await workedExample(page);
  await page.getByRole('textbox', { name: 'Cost per household' }).fill('100');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#planning-brief')).toBeVisible();
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('.planner__ui')).toBeHidden();
  await expect(page.locator('#planning-brief')).toContainText('Made with NourishScope 1.0.0');
});

test('results are announced once after typing settles', async ({ page }) => {
  await workedExample(page);
  const live = page.locator('[aria-live="polite"][aria-atomic="true"]');
  await expect(live).toHaveText(/Results updated: 499 households reached/);
});
