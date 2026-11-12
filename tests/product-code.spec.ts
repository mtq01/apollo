import { test, expect } from '@playwright/test';

/* This file tests for:
    - Typing a SKU into the textbox instead of a product name
    - Item goes directly into the cart without being sent to Claude
    - The cart row show the correct unit price and line total for that account.
*/


 /* Each account and the price the test should see for the specified product,
 Mahtab is a Contract account, so she gets 10% off the $29.99 catalog price */
 const accounts = [
  { name: 'Alex',   unitPrice: '$29.99', lineTotal: '$59.98' },
  { name: 'Mahtab', unitPrice: '$26.99', lineTotal: '$53.98' },
  { name: 'Mike',   unitPrice: '$29.99', lineTotal: '$59.98' },
];

for (const account of accounts) {
  test(`SKU to cart, no AI, correct price: (${account.name})`, async ({ page }) => {
    // keep a list of every request the page makes, so we can check which API routes were called
    const requestedUrls: string[] = [];
    page.on('request', (request) => requestedUrls.push(new URL(request.url()).pathname));

    await page.goto('/');

    /* pick the account. retry until it sticks, since clicks before React is ready get ignored.
    exact: true matches only the header button, not the sidebar one ("Mike Mike buyer · Calgary") */
    await expect(async () => {
      await page.getByRole('button', { name: /Select Account|Alex|Mahtab|Mike/ }).first().click();
      await page.getByRole('menuitem', { name: new RegExp(account.name) }).click();
      await expect(page.getByRole('button', { name: account.name, exact: true })).toBeVisible({ timeout: 1000 });
    }).toPass();

    // type a product code with a quantity. codes only means the app should skip Claude
    const textBox = page.getByRole('textbox', { name: /Paste a previous PO number/ });
    const addProducts = page.getByRole('button', { name: 'Add Products' });
    await textBox.fill('PER-2284 x2');
    await expect(addProducts).toBeEnabled();

    // click, and wait for the no-AI pricing route to answer before checking the cart
    await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/api/quote/items') && response.ok()),
      addProducts.click(),
    ]);

    // the cart shows up once something is added to it
    await expect(page.getByRole('heading', { name: 'Cart Summary' })).toBeVisible();

    // find the cart row by its sku, then check the name, unit price, and line total for this account
    const row = page.getByRole('row').filter({ hasText: 'PER-2284' });
    await expect(row).toContainText('Wireless Mouse');
    await expect(row).toContainText(account.unitPrice);
    await expect(row).toContainText(account.lineTotal);
    await expect(row.getByRole('spinbutton', { name: 'Quantity for Wireless Mouse' })).toHaveValue('2');

    // proves the skip-AI path: /api/quote is the route that calls Claude, and it should never have been hit
    expect(requestedUrls).not.toContain('/api/quote');
  });
}