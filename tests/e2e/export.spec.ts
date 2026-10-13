import { expect, test, type Page } from '@playwright/test';

async function workedExample(page: Page) {
  await page.goto('app');
  await page.getByLabel('Kentucky county data').check();
  for (const name of ['Magoffin County', 'Owsley County', 'Wolfe County']) {
    await page.getByRole('checkbox', { name: new RegExp(`^${name}`) }).check();
  }
  await page.getByLabel('Total budget').fill('50000');
  // Count print calls instead of opening the real dialog.
  await page.evaluate(() => {
    (window as unknown as { printCalls: number }).printCalls = 0;
    window.print = () => { (window as unknown as { printCalls: number }).printCalls += 1; };
  });
}

const printCalls = (page: Page) => page.evaluate(() => (window as unknown as { printCalls: number }).printCalls);

test('unavailable export buttons do nothing when clicked', async ({ page }) => {
  await workedExample(page);
  let downloaded = false;
  page.on('download', () => { downloaded = true; });
  // force: Playwright otherwise waits for aria-disabled buttons to become enabled.
  await page.getByRole('button', { name: 'Save planning brief as PDF' }).click({ force: true });
  await page.getByRole('button', { name: 'Download as CSV' }).click({ force: true });
  await page.waitForTimeout(300);
  expect(await printCalls(page)).toBe(0);
  expect(downloaded).toBe(false);
});

test('after confirming the cost, PDF opens print and CSV downloads the brief', async ({ page }) => {
  await workedExample(page);
  await page.getByRole('checkbox', { name: /confirmed this cost/ }).check();

  await page.getByRole('button', { name: 'Save planning brief as PDF' }).click();
  expect(await printCalls(page)).toBe(1);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download as CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^nourishscope-planning-brief-\d{4}-\d{2}-\d{2}\.csv$/);
  const text = await (await download.createReadStream()).toArray().then((chunks) => Buffer.concat(chunks).toString('utf8'));
  expect(text).toContain('Tool version,1.0.0');
  expect(text).toContain('Community,County,Number of households in need');
  expect(text).toContain('Magoffin County,Magoffin County,1759,SNAP households,,1759,1.147,Rural or distressed,100,26427.28,264,26400');
});
