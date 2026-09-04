# Apollo

Apollo is a front end for reordering products. It sits in front of a company's real ERP system and gives buyers a fast, honest way to place a repeat order.

## The problem it solves

This project came from a talk with the owner of a B2B ecommerce agency in Kelowna. He described the same front end problems he sees over and over:

- **Stale stock numbers.** A live stock check can return a count that is hours old, so the buyer sees a number that is already wrong.
- **Pricing and stock depend on the account.** The same product can cost more, or show different availability, to two different buyers.
- **Buyers do not browse, they reorder.** Returning customers do not want to click through a catalog. They paste a list of SKUs or pull up an old order.
- **Bad error messages.** ERPs hand back generic codes instead of telling the buyer what actually went wrong.

Apollo fixes the buyer's experience around these problems. It does not replace the ERP.

## What Apollo is

- A front end reorder tool. It shows account specific pricing and stock, and it lets a buyer build an order from a pasted list, a past order, or a PO number.
- Honest about failure. Stale stock is flagged, not hidden. A SKU that does not match anything gets close match suggestions, not a dead end.
- Built around one connection point to its data (an "adapter"). Right now that points at fake JSON files. The rest of the app does not know the data is fake, so the same connection could later point at a real ERP with no other changes.

## What Apollo is not

- Not a full ERP. It does not manage inventory, accounting, or operations.
- Not a store. There is no catalog to shop through. There is a cart, but you fill it by pasting or reordering, not by browsing.
- Not a plugin. It is a standalone Next.js app, not something installed into WordPress or another platform.
- Not connected to anything real. Every account, product, and order is made up.
- Not "AI first." Claude is only used for the parts that need judgment. Everything else is plain code.

## How the buyer uses it

### Reorder page

There is one text box. The buyer can paste any of these:

- A list of SKUs, like `PER-2284, ACC-3391`
- A quantity with a SKU, like `PER-2284 x2`
- A messy product list written in plain words
- A PO number, like `inv-1001`

If the text is only product codes, Apollo prices it straight from the catalog. Anything with real words goes through Claude, which turns it into clean SKU and quantity pairs.

Whatever comes back drops into a section called "Your Cart" below the box. The buyer can:

- Change any quantity
- Remove a line
- Paste more items, which get added to the same cart
- See a running Sub Total, Discount, Tax, Total, and, for admin accounts, Internal Cost

The cart re prices itself after every change, so the numbers are always current.

Items that could not be added show in a "Couldn't add these" list, with the two or three closest catalog matches to pick from.

When the buyer is ready, "Place order" saves it to the order history.

### Orders page

The Orders page lists the account's past orders. Each one is a card. The buyer ticks the lines they want, adjusts quantities, and adds them to the cart. A line whose product has left the catalog is greyed out.

### PO numbers

Typing a PO number like `inv-1001` pulls that order's products straight into the cart, the same as reordering a past order.

## How failures are handled

Instead of one generic error, Apollo gives a specific answer for each case.

| Situation | What the buyer sees |
| --- | --- |
| Stock check times out, but a cached number exists | The cached number, with its timestamp, and a note to confirm before ordering |
| Stock check times out, and there is no cached number | A plain message that stock cannot be confirmed right now |
| A SKU does not match anything | The two or three closest matches, not a silent failure |

## The activity log

Every action adds a short, timestamped, plain language line to an activity log on the side of the screen. For example:

- Price calculated: $27.00 for Wireless Mouse
- Stock check attempt 1 failed
- Stock check failed for Wireless Mouse: the service took too long

It works as a receipt and as a way to see what the app is actually doing.

## How the work is split

Plain code handles anything with one right answer:

- Picking an account or role
- Looking up an exact SKU
- Pricing and stock rules
- Calling the fake ERP and catching timeouts

Claude handles anything with judgment or ambiguity:

- Turning a messy pasted list into clean SKU and quantity pairs
- Suggesting the closest match for a SKU that does not match exactly
- Explaining a failure in plain words

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Claude API (Haiku 4.5 for most calls)
- JSON files as a stand in database. No real database or login yet.
- React Context for the active account, the cart, and the activity log
- Zod to check the shape of Claude's output and every request body
- shadcn for components and UI

## Getting started

```bash
npm install
npm run dev
```

Create a `.env.local` file in the project root with:

```
ANTHROPIC_API_KEY=your_key_here
```

`.env.local` is gitignored, so it does not come down with a clone. Each developer makes their own. Get a key at [console.anthropic.com](https://console.anthropic.com/settings/keys).
