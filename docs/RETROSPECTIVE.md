# Retrospective

What went wrong while building Apollo, and what we'd change. The full log of decisions is in [DECISIONS.md](DECISIONS.md).

## Why we built it

The idea came from the ERP front-end problems that B2B buyers run into again and again:

- **Stale stock numbers.** A live stock check can return a count that is hours old, so the buyer sees a number that is already wrong.
- **Pricing and stock depend on the account.** The same product can cost more, or show different availability, to two different buyers.
- **Buyers don't browse, they reorder.** Returning customers paste a list of SKUs or pull up an old order.
- **Bad error messages.** ERPs hand back generic codes instead of telling the buyer what went wrong.

## Lessons

### 1. Claude quietly "fixed" the buyer's typos

`"2 wireless mise"` came back as a finished quote for Wireless Mouse with no sign the words had been changed, while `"2 wireless mice"` (spelled correctly) failed to match and only got a suggestion. The corrected input also scored a higher `confidence` than the clean one, so confidence couldn't be trusted as the signal.

We measured this rather than guessing, and proposed a `correctedFrom` field on each parsed item. **Still open.** Next we'd ship the soft version: still quote it, but mark the row "you typed 'mise'".

### 2. Orders were re-priced every time they loaded

Placing an order saved only SKUs and quantities, and the Orders page priced them fresh on each visit, so the totals shown were never the totals the buyer agreed to.

We merged orders and invoices. Placing an order now prices it once and saves a full invoice, and readers only display stored numbers. A placed order can be pasted back into the reorder box by its PO number.

### 3. A fix for one bug hid another

Forcing a stock failure from the demo dropdown also flagged every item already in the cart, because the cart re-checked every line on any change. We made it re-check only new, failed or stale lines.

That introduced a race. Resetting the "force failure" flag was itself a dependency of the re-price function, so the reset triggered an unforced re-price that quietly overwrote the failure we were trying to show. The fix was to read the flag through a ref. The lesson: re-test the original symptom after every fix.

### 4. "Reorder my last order" mixed two invoices

We let Claude read the order history and choose products, and it once merged items from two invoices and lost track of where each came from.

Now Claude only picks an invoice id, and plain code fetches that exact invoice. The trade-off is that this path always returns the whole invoice, so partial reorders need typed input.

### 5. A failed stock check didn't stop an order

The row showed the error, but the button still worked, and the server only checked that each SKU existed.

"Place order" is now disabled on any stock error, and `POST /api/orders` re-checks stock (uncached) before saving.
