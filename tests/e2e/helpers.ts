import type { Page } from '@playwright/test';

export const WORKED_EXAMPLE_COUNTIES = ['Magoffin County', 'Owsley County', 'Wolfe County'];

/** Open the app with Kentucky data, tick the counties and enter the budget. */
export async function selectCounties(page: Page, names = WORKED_EXAMPLE_COUNTIES, budget = '50000') {
  await page.goto('app');
  await page.getByLabel('Kentucky county data').check();
  for (const name of names) await page.getByRole('checkbox', { name: new RegExp(`^${name}`) }).check();
  await page.getByLabel('Total budget').fill(budget);
}
