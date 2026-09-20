# Apollo

A front end for reordering products. It sits in front of a company's ERP and gives B2B buyers a fast, honest way to place a repeat order.

**Live demo: [apollo-demo.gogogravity.com](https://apollo-demo.gogogravity.com)**

Pick an account, then try one of the quick-action buttons on the Reorder page. Every account, product, and order is made up, and the ERP is a mock.

## The problem it solves

The idea came from a talk with the owner of a B2B commerce agency in Kelowna. He described the same front end problems he sees over and over:

- **Stale stock numbers.** A live stock check can return a count that is hours old, so the buyer sees a number that is already wrong.
- **Pricing and stock depend on the account.** The same product can cost more, or show different availability, to two different buyers.
- **Buyers do not browse, they reorder.** Returning customers paste a list of SKUs or pull up an old order.
- **Bad error messages.** ERPs hand back generic codes instead of telling the buyer what went wrong.

Apollo fixes the buyer's experience around these problems. It does not replace the ERP, and Claude is only used for the parts that need judgment.

## What it does

### Reorder page

One text box. The buyer can paste any of these:

- A list of SKUs, like `PER-2284, ACC-3391`
- A quantity with a SKU, like `PER-2284 x2`
- A messy product list in plain words
- A PO number, like `inv-1001`

If the text is only product codes, Apollo prices it straight from the catalog. Anything with real words goes through Claude, which turns it into clean SKU and quantity pairs.

Results drop into "Your Cart", where the buyer can:

- Change quantities, remove lines, or paste more items into the same cart
- See Sub Total, Discount, Tax, and Total (plus Internal Cost for admins)
- See a tag on lines that came from a PO or a suggestion
- Place the order once every line has confirmed stock

The cart re-prices itself after every change. Items that could not be matched show in a "Couldn't add these" list with the closest catalog matches to pick from.

### Orders page

Lists the account's past orders as cards. The buyer ticks lines, adjusts quantities, and adds them to the cart. A line whose product has left the catalog is greyed out.

### Accounts and roles

- **Buyer** and **manager** are customers. Each sees only their own pricing, stock, and orders.
- **Admin** is the supplier's own staff. Admin sees internal cost and every account's past orders.

### Handling failures

| Situation | What the buyer sees |
| --- | --- |
| Stock check times out, cached number exists | The cached number with its timestamp, and a note to confirm before ordering |
| Stock check times out, no cached number | A plain message that stock cannot be confirmed right now |
| A SKU matches nothing | The two or three closest matches, not a silent failure |
| Any line has a failed stock check | "Place order" is disabled, and the server re-checks stock again before saving |

A timestamped activity log on the side of the screen records each step (prices, stock attempts, failures) as a plain-language receipt.

## How the work is split

Plain code handles anything with one right answer: account rules, exact SKU lookup, pricing, stock rules, and calling the mock ERP with retries and timeouts.

Claude (Haiku 4.5) handles ambiguity: turning a messy pasted list into SKU and quantity pairs, and picking which order the buyer means. Its output is checked with Zod, runs at `temperature: 0`, and is limited to five tool-call rounds.

All data goes through one adapter over JSON files. The rest of the app doesn't know the data is fake, so it could point at a real ERP later.

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Zod, React Context (account, cart, activity log), Claude API.

## Running it locally

```bash
npm install
npm run dev
```

Create `.env.local` with `ANTHROPIC_API_KEY=your_key_here` (get one at [console.anthropic.com](https://console.anthropic.com/settings/keys)). Only the plain-words and PO-lookup paths need it.

## What went wrong, and what we'd change

The full log of calls we made is in [DECISIONS.md](DECISIONS.md). These are the ones that taught me the most.

**1. Claude quietly "fixed" the buyer's typos.**
`"2 wireless mise"` came back as a finished quote for Wireless Mouse with no sign the words had been changed, while `"2 wireless mice"` (correctly spelled) failed to match and only got a suggestion. Worse, the corrected input scored a higher `confidence` than the clean one, so confidence couldn't be trusted as the signal. We measured this rather than guessing, and proposed a `correctedFrom` field on each parsed item. **Still open.** Next we'd ship the soft version: still quote it, but mark the row "you typed 'mise'".

**2. Orders were re-priced every time they loaded.**
Placing an order saved only SKUs and quantities, and the Orders page priced them fresh on each visit, so the totals shown were never the totals the buyer agreed to. We merged orders and invoices: placing an order now prices once and saves a full invoice, and readers only display stored numbers. A placed order can even be pasted back into the reorder box by its PO number.

**3. A fix for one bug hid another.**
Forcing a stock failure from the demo dropdown also flagged every item already in the cart, because the cart re-checked every line on any change. We made it re-check only new, failed, or stale lines. That introduced a race: resetting the "force failure" flag was itself a dependency of the re-price function, so the reset triggered an unforced re-price that quietly overwrote the failure we were trying to show. The fix was to read the flag through a ref. The lesson was to re-test the original symptom after every fix.

**4. "Reorder my last order" mixed two invoices.**
We let Claude read the order history and choose products, and it once merged items from two invoices and lost track of where each came from. Now Claude only picks an invoice id, and plain code fetches that exact invoice. The trade-off is that this path always returns the whole invoice, so partial reorders need typed input.

**5. A failed stock check didn't stop an order.**
The row showed the error, but the button still worked, and the server only checked that each SKU existed. "Place order" now disables on any stock error, and `POST /api/orders` re-verifies stock fresh (uncached) before saving.

### Known limits

- No automated tests yet. Pricing, fuzzy matching, and the quote route are the first things we'd cover, then one end-to-end flow.
- Trailing quantities in plain text (`"mouse 2"`) can be read as model numbers and dropped.
- The cart lives in memory and is lost on refresh.
- Data is JSON files with no locking, so two orders saved at the same instant could collide.
- Admin can't place an order on behalf of a customer. It's saved under Admin's own account.
- There is no product catalog to browse and no tiered/volume pricing, only account-based pricing and discounts.
