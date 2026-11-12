import { test, expect } from '@playwright/test';

// Checks that the live site loads and its browser tab title includes "Apollo"
test('has title', async ({ page }) => {
  await page.goto('https://apollo-demo.gogogravity.com');

  // The full title is "Apollo | by Gravity". /Apollo/ passes as long as "Apollo" appears anywhere in it
  await expect(page).toHaveTitle(/Apollo/);
});

// Checks that "Add Products" starts disabled, turns on once there's text in the box, and can be clicked
test('add products button', async ({ page }) => {
  // Open the reorder page
  await page.goto('https://apollo-demo.gogogravity.com');

  // Find the "Add Products" button by its role and visible text
  const addProducts = page.getByRole('button', { name: 'Add Products' });

  // With an empty text box, the button should be disabled
  await expect(addProducts).toBeDisabled();

  /* Type a product code (SKU) and quantity into the text box. The box is found by its label, which 
  screen readers can see but the page doesn't show.
  
  [Note]: This check sometimes FAILS on WebKit due to a timing issue, rerunning the test usually fixes,
  but adding a longer timeout would be best. Not needed for a quick demo file...
  */
  await page.getByRole('textbox', { name: /Paste a previous PO number/ }).fill('PER-2284 x2');

  // Now that the box has text, the button should turn on
  await expect(addProducts).toBeEnabled();

  // Click it to send the product code
  await addProducts.click();
});