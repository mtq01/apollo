import { test, expect } from '@playwright/test';

/* This file tests for:
    - Forcing the stock check to fail (timeout) with the demo "Force Failure" dropdown
    - The cart shows the red "could not be checked" banner and the error on the row
    - "Place order" stays disabled, and no order is ever sent
*/

test('stock check fails, place order stays disabled', async ({ page }) => {
  // keep a list of every request the page makes, so we can check /api/orders was never called
  const requestedUrls: string[] = [];
  page.on('request', (request) => requestedUrls.push(new URL(request.url()).pathname));

  await page.goto('https://apollo-demo.gogogravity.com');

  /* pick Alex. he's an admin, so he can always see stock, which means the stock check actually runs.
  (Mike is a buyer and only sees stock for his own warehouse, so for him the check might be skipped.)
  retry until it sticks, since clicks before React is ready get ignored. */
  await expect(async () => {
    await page.getByRole('button', { name: /Select Account|Alex|Mahtab|Mike/ }).first().click();
    await page.getByRole('menuitem', { name: /Alex/ }).click();
    await expect(page.getByRole('button', { name: 'Alex', exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass();

  /* the demo dropdown has no label, so find it by the option it holds.
  "timeout" makes the next ERP stock check fail right away instead of randomly */
  const forceFailure = page.locator('select', { has: page.locator('option[value="timeout"]') });
  await forceFailure.selectOption('timeout');

  // type a product code with a quantity, then add it to the cart
  const textBox = page.getByRole('textbox', { name: /Paste a previous PO number/ });
  const addProducts = page.getByRole('button', { name: 'Add Products' });
  await textBox.fill('PER-2284 x2');
  await expect(addProducts).toBeEnabled();
  await addProducts.click();

  // the cart shows up once something is added to it
  await expect(page.getByRole('heading', { name: 'Cart Summary' })).toBeVisible();

  // the red banner only appears after pricing finishes with a failed stock check
  await expect(page.getByText('1 item could not be checked. See below for details.')).toBeVisible();
  await expect(page.getByText(/Fix or remove the item\(s\) that could not be checked/)).toBeVisible();

  // the row itself should explain the timeout in the stock column
  const row = page.getByRole('row').filter({ hasText: 'PER-2284' });
  await expect(row).toContainText('The service took too long to respond');

  // the main point: with a failed stock check, the order can't be placed
  await expect(page.getByRole('button', { name: 'Place order' })).toBeDisabled();

  // and nothing was sent to the orders route
  expect(requestedUrls).not.toContain('/api/orders');
});
