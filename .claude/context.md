# Apollo — Project Context

Read this first. It explains what Apollo is, how it fits together, and the rules to follow when changing it.

Last checked against the code: November 12, 2026. When code and this file disagree, the code and `DECISIONS.md` win, and this file should be updated.

---

## 1. What Apollo is

Apollo is a **front-end reorder and invoice tool** that sits in front of a company's ERP (the big business system that tracks stock, pricing and orders).

ERP front ends often get three things wrong:

- **Stock and pricing are wrong or out of date.** Data is stale, or it isn't specific to the buyer's account.
- **Errors are vague.** Buyers get generic error codes that don't say what went wrong.
- **Reordering is slow.** Returning buyers have to browse a catalog instead of just saying what they want.

Apollo fixes the front end:

- Accurate, **account-specific** quotes (price, lead time, stock and warehouse visibility).
- Reordering from a **pasted list**, a **PO number**, or a **past order** on the Orders page, into one editable cart.
- **Honest failures.** Stale data is flagged, an unknown product gets close-match suggestions, errors are explained in plain English, and an order can't be placed until every line has confirmed stock.

## 2. What Apollo is NOT

| Not this | Why |
| --- | --- |
| A standalone ERP | It doesn't manage inventory, accounting or operations. It sits in front of an ERP. |
| An eCommerce store | There is no catalog to browse. Buyers paste or reorder into a cart; they don't shop. |
| A WordPress site or plugin | It's a standalone Next.js app. |
| Connected to a real company | Every account, product, order and invoice is fake mock data. |
| "AI-first" | Claude handles only the parts that need judgment. Everything else is plain code. |

**One-sentence pitch (use this wording):**
> "We built an AI ordering agent with a swappable, adapter-pattern backend, currently running against a mock ERP."

Don't call it "an ERP connector." That suggests a live integration that doesn't exist.

---

## 3. Tech stack

- **Next.js 16** (App Router, `cacheComponents` on) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 4** and **shadcn/ui** (`components/ui/`) for styling
- **Claude API** (`claude-haiku-4-5`) with tool use: `record_items`, `get_order_history`, `get_invoice`
- **Zod** to check every request body and every Claude tool call before anything else uses it
- **Next.js caching:** `'use cache'` + `cacheTag('stock')` on quotes, `revalidateTag('stock', 'max')` after an order is saved
- **Data:** `data/*.json` files (no database)
- **Fuzzy matching:** `fastest-levenshtein`, word by word, with a 40% cutoff
- **Tests:** Vitest for unit tests, Playwright for end-to-end tests against a local server
- **CI:** GitHub Actions on pushes and PRs to `staging` and `main` (lint, type check, Vitest, Playwright)

## 4. Where Claude is used, and where it is NOT

**Claude is used for (judgment work), all in `lib/agent/parseOrder.ts`:**

1. Turning messy pasted text into SKU and quantity guesses (`record_items` tool, checked with Zod)
2. Picking which invoice the buyer means, such as "my last order" (`get_order_history`, then `get_invoice`). Claude only picks the id; plain code fetches the invoice and checks the account.

**Claude is NOT used for (plain, predictable code):**

- Pricing, discount, tax and totals (`calculatePrice`, `summarizeOrder`)
- Lead time (`calculateLeadTime`)
- Stock and visibility rules (`seeStock`, `accessWarehouse`, `visibleInvoice`)
- Exact SKU lookup (`lookupProduct`) and fuzzy suggestions (`findClosestMatches`, `suggestAlternatives`)
- Mapping an error type to its buyer sentence (`buyerErrorMessage`, a plain `switch`)
- Routing, caching, rendering

Input that is only product codes skips Claude entirely. If a change would move pricing, stock or routing logic into a Claude call, stop and flag it.

---

## 5. How a request flows

### Reorder (the `/` page)

```md
1. INPUT        Buyer picks an account and pastes text into the box on / (app/page.tsx)
2. ROUTE        Only product codes? (parseSkuList)
                  yes → POST /api/quote/items   (no Claude)
                  no  → POST /api/quote → parseOrder() → Claude → Zod check
                          → product guesses, or an invoice id
                          → invoice id: lookUpInvoice() → that invoice's lines go to the cart
3. PRICE        priceItems(), every item at the same time:
                  lookupProduct()           exact catalog match
                    miss → suggestAlternatives() → "did you mean" (unmatched row)
                    hit  → getQuoteForProduct(), cached with cacheTag('stock'):
                             calculatePrice()       contract discount
                             calculateLeadTime()    warehouse + contract adjustments
                             seeStock() / accessWarehouse()   role + warehouse visibility
                             getERPStock()          mock ERP, 1 try + 1 retry
                             events[]               activity-log entries
4. CART         Matched rows go into the cart (DraftOrderProvider, in memory).
                Unmatched rows go to "Couldn't add these" with suggestions.
                The cart re-prices through /api/quote/items, 500ms after each change.
5. RENDER       Cart table with "as of [time]" per row, totals, banners, activity log
6. PLACE ORDER  POST /api/orders → re-check stock uncached → summarizeOrder()
                → saveInvoice() → data/invoices.json → revalidateTag('stock', 'max')
```

### Orders (the `/orders` page)

`GET /api/orders` → the account's stored invoices (every account's for admin) → `visibleInvoice()` hides fields by role → order cards → ticked lines go into the cart.

Stored invoices are displayed as saved. Nothing re-prices them.

## 6. The adapter (why the backend is swappable)

The goal: all ERP and data access goes through **one entry point**, so swapping the mock ERP for a real API means changing **one place**, not the whole app.

- Never call the mock data files directly from pages, routes or Claude code.
- Go through the functions in `lib/erp/`.

**Current state (be honest about it):** there is no `ERPAdapter` interface yet. `productQuote.ts` imports `getERPStock` from `mockERP.ts` directly, and the routes import `data/accounts.json` and `data/catalog.json` themselves. Defining the interface is an open TODO in `DECISIONS.md` (Aug 19).

## 7. Key files and names

| Path / name | What it is |
| --- | --- |
| `app/page.tsx` | Reorder page: paste box, quick-action buttons, cart, "Couldn't add these" |
| `app/orders/page.tsx` | Orders page: past orders as cards, add lines to the cart |
| `app/api/quote/route.ts` | Text quote route: calls Claude, then prices or looks up an invoice |
| `app/api/quote/items/route.ts` | SKU quote route: prices known SKUs, no Claude. Also used by the cart to re-price. |
| `app/api/orders/route.ts` | `GET` lists past orders; `POST` re-checks stock and saves a new invoice |
| `lib/agent/parseOrder.ts` | The only Claude call |
| `lib/agent/suggestAlternatives.ts` | Turns fuzzy matches into an unmatched row (plain code, no Claude) |
| `lib/tools/` | Claude tool definitions (`record_items`, `get_order_history`, `get_invoice`) |
| `lib/erp/mockERP.ts` | Fake ERP: `getERPStock(sku, forceFailure?)`, with random delay and timeouts |
| `lib/erp/accountRules.ts` | `calculatePrice`, `calculateLeadTime`, `seeStock`, `accessWarehouse` |
| `lib/erp/productQuote.ts` | `getQuoteForProduct`: one priced quote with retry and events |
| `lib/erp/priceItems.ts` | Prices a list of items; shared by both quote routes |
| `lib/erp/summarizeOrder.ts` | All order money math: `TAX_RATE`, `summarizeOrder` |
| `lib/erp/invoice.ts` | Read and save invoices, `lookUpInvoice`, `visibleInvoice` |
| `lib/erp/productLookup.ts`, `fuzzyMatch.ts` | Exact catalog match, and close matches |
| `lib/erp/errorMessages.ts` | `buyerErrorMessage`: error type → buyer sentence |
| `types.ts` | Shared types (`UserContext`, `Product`, `QuoteResult`, `LineItemResult`, `Invoice`, `ErrorType`, `ActivityEvent`) |
| `data/` | `accounts.json`, `catalog.json`, `invoices.json` |
| `components/account/` | Selected-account state (`AccountContext`) and the account picker |
| `components/draft-order/` | The cart: `DraftOrder` and `DraftOrderProvider` |
| `components/activity-log/` | Activity log state and display |
| `components/ErrorMessage.tsx`, `Loader.tsx` | Shared error banner and loading spinner |
| `hooks/use-reset-on-account-switch.ts` | Clears cart, log and text box when the account changes |
| `tests/` | Playwright specs. Unit tests sit next to the code (`*.test.ts`). |
| `DECISIONS.md` | Dated log of decisions and open TODOs |

## 8. Who owns what (three tracks)

| Track | Owns | Never touches |
| --- | --- | --- |
| **A: Data** | Fake ERP, pricing / stock / visibility / lead-time rules, invoices and order money math, activity events, keeping functions pure enough to cache, unit tests | Routes, rendering, Claude calls |
| **B: UI + routes** | Pages, route handlers, caching mechanics, the cart, rendering results / log / errors, account Context, accessibility, deploy | Pricing / stock logic, Claude calls |
| **C: Claude** | Claude tool definitions, Zod checks on Claude output, buyer error sentences, fuzzy-suggestion wiring, what happens when Claude fails | Pricing / stock logic, rendering, routes |

Rules that come from this table:

- **Only Track B edits route handlers.** Track C hands over a function; Track B wires it in.
- **Track C returns values; it doesn't render.** When Claude fails, the route returns a "Couldn't read that order." error and the page shows it.
- **Track A keeps `getQuoteForProduct` pure** (same input → same output, no side effects) so it's safe to cache.

---

## 9. Rules for changes

1. **Fail honestly.** No vague "something went wrong" where a specific reason is known. Every error type maps to a readable sentence and an activity-log entry.
2. **No silent actions.** Every parse, suggestion, hidden-by-role field, retry, failed check and invoice lookup writes to the activity log. A hide by role is logged as `"access"`, not as an error.
3. **Check every boundary.** Nothing downstream trusts a request body or a Claude response until it passes Zod.
4. **Retry once, not more.** ERP stock checks retry one time before the buyer sees an error.
5. **Show freshness.** Every cart row shows "as of [time]", from the stock check time (or the quote time when stock is hidden). Stale stock shows a reminder to confirm before ordering.
6. **Price once.** A placed order is priced once and saved as a full invoice. Readers display the stored numbers and never re-price.
7. **Hide at the route.** A field a role may not see is left out or sent as `"hidden"` by the route, never sent and hidden in the UI.
8. **Accessibility is part of building, not an add-on.** Real `<button>` / `<label>` / `<table>` elements, labeled inputs, keyboard navigation, visible focus, `aria-live` on the activity log, target WCAG AA.
9. **Keep the README honest.** Describe the lean mock-ERP scope. Don't claim features that aren't built.
10. **Secrets stay server-side.** The Claude API key never reaches the browser or the repo.

## 10. Known gaps (say these plainly, don't hide them)

1. **No real database.** JSON files with no locking; two orders saved at the same instant could collide.
2. **No stock reservation.** Ordering doesn't reduce stock, so two buyers could both "get" the last unit.
3. **No manager-approval workflow.** The only human check is the buyer confirming their own cart.
4. **No real login.** The account picker stands in for authentication, and routes trust the `accountId` they're sent.
5. **Flat account discount.** No volume-tier or negotiated pricing.
6. **Simulated stock.** Stock counts are a hash of the SKU, not real counts. Delay (300–1500ms) and a 15% timeout chance are random; stale stock only happens when forced from the demo menu.
7. **Prices are plain JS numbers.** Rounded to cents with `money()`, but a real system would use integer cents or a decimal type.
8. **In-memory cart.** The cart is lost on refresh.
9. **Silent typo correction.** Claude can turn a misspelled product into the real one with no sign on the row (`correctedFrom` is an open TODO).
10. **Parsing quirks.** A trailing quantity (`"mouse 2"`) can be read as a model number and dropped.
11. **No assisted ordering.** An order placed as admin is saved under the admin's own account.
12. **Thin test coverage.** One Vitest file (fuzzy matching) and three Playwright specs. Claude parsing isn't unit-tested; it was spot-checked by hand.
13. **Fuzzy-match cutoff isn't benchmarked.** 40% was tuned by hand against a few typos.

## 11. What a real ERP integration would still need (Path to Production)

- Real authentication
- Rate limits
- Credit checks
- Volume-tier / negotiated-rate pricing
- Branch / account hierarchies

---

## 12. Timeline and status

- **Aug 4 – Aug 31, 2026:** original four-week build. Get the pieces working alone, wire them together for reordering, add the invoice pipeline, then tests, cleanup and the demo.
- **September 2026:** the reorder cart, orders merged into invoices, the Orders page, parallel stock checks, quick-action buttons, the admin role, and order-safety fixes.
- **November 2026:** README rewrite, Vitest and Playwright, CI on `staging`.

`DECISIONS.md` has the full dated history. Update this section when a milestone lands.
