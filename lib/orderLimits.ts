/* The size limits for one order request, in one place so the routes, the cart and
   the text box all agree. Pure values and functions: safe to import from both
   server and client code.

   - Why limits at all: pasted text goes to Claude, so an unlimited paste is an
     unlimited bill. And one out-of-range quantity in the cart fails the whole
     cart's re-price request, not just that line. */

// Longest paste we send to Claude. Roughly 100 lines of a typical product list.
export const MAX_ORDER_TEXT_LENGTH = 5000;

// Most lines in one quote or order request.
export const MAX_LINE_ITEMS = 100;

// Most units on one line. Far above any real stock count (the mock ERP's max is 499).
export const MAX_QUANTITY = 10_000;

// "10,000", for messages
export const MAX_QUANTITY_LABEL = MAX_QUANTITY.toLocaleString("en-US");

// A quantity we can price: a whole number from 1 to MAX_QUANTITY.
export function isValidQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY;
}

// Force a typed or merged quantity into range: whole, at least 1, at most MAX_QUANTITY.
// Anything that isn't a number (an empty input) becomes 1.
export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
}
