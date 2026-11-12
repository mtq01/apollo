# Apollo — Project Context

Read this first. It explains what Apollo is, how it fits together, and the rules to follow when changing it.

---

## 1. What Apollo is

Apollo is a **front-end reorder and invoice tool** that sits in front of a company's ERP (the big business system that tracks stock, pricing and orders).

ERP front ends often get three things wrong:

- **Stock and pricing are wrong or out of date.** Data is stale, or it isn't specific to the buyer's account.
- **Errors are vague.** Buyers get generic error codes that don't say what went wrong.
- **Reordering is slow.** Returning buyers have to browse a catalog instead of just saying what they want.

Apollo fixes the front end:

- Accurate, **account-specific** quotes (pricing and stock).
- Reordering from a **pasted list** or an **old order / invoice**.
- **Honest failures.** Stale data is flagged, an unknown SKU gets close-match suggestions, and errors are explained in plain English.

The idea came from Shae Inglis, owner and CEO of Acro Commerce (Kelowna). Early in the BCIT program, he was asked what he looks for in a junior developer, and his answer shaped this project. Credit Acro Commerce by name for anything taken from their write-up (for example, the Path to Production list).

## 2. What Apollo is NOT

| Not this | Why |
| --- | --- |
| A standalone ERP | It doesn't manage inventory, accounting or operations. It sits in front of an ERP. |
| An eCommerce store | No product browsing, cart or checkout. Buyers paste or reorder; they don't shop. |
| A WordPress site or plugin | It's a standalone Next.js app. |
| Connected to a real company | Every account, product, order and invoice is fake mock data. |
| "AI-first" | Claude handles only the parts that need judgment. Everything else is plain code. |

**One-sentence pitch (use this wording):**
> "We built an AI ordering agent with a swappable, adapter-pattern backend, currently running against a mock ERP."

Don't call it "an ERP connector." That suggests a live integration that doesn't exist.

---

## 3. Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** for styling
- **Claude API**, using tool use (the `record_items` tool) for parsing
- **Zod** to check Claude's output before anything else uses it
- **Next.js caching:** `'use cache'`, `cacheTag('stock')`, `revalidateTag('stock', 'max')`
- **Data:** `data/*.json` files (no database)
- **Tests:** Vitest or Jest (unit tests for the pure functions only)
- **Fuzzy matching:** Levenshtein, or a library like `fuzzysort` / `string-similarity`

## 4. Where Claude is used, and where it is NOT

**Claude is used for (judgment work):**

1. Turning messy pasted text into structured line items (`record_items` tool + Zod)
2. Fuzzy-matching an unknown SKU to 2–3 close catalog matches (wiring)
3. Explaining failures in buyer-friendly language

**Claude is NOT used for (plain, predictable code):**

- Pricing (`calculatePrice`)
- Stock and visibility rules (`seeStock`, `accessWarehouse`, invoice field visibility)
- Routing, caching, rendering
- Mapping an error type to its sentence (a plain `switch` / lookup object)

If a change would move pricing, stock or routing logic into a Claude call, stop and flag it.

---

## 5. How a request flows (reorder pipeline)

```md
1. INPUT          Buyer picks an account, pastes text into /reorder
2. PARSE          /api/quote route → parse function (lib/agent/) → Claude record_items
                  → Zod check (recordItemsSchema) → structured items
                  (sku / quantity / productGuess / confidence)
3. PRICE & STOCK  getQuoteForProduct() per item:
                    calculatePrice()  — account-type discount
                    seeStock() / accessWarehouse() — role + warehouse visibility
                    getERPStock()     — mock ERP call, cached with cacheTag('stock')
                    builds events[]   — activity-log entries
4. ERROR TEXT     timeout / not found / restricted / invalid input → one plain sentence
5. RENDER         Results table + "stock as of [time]" (calculatedAt) + activity log
6. CONFIRM        addOrder() → order-history.json → revalidateTag('stock', 'max')
7. FEEDBACK       getOrderHistory() powers "reorder what I got last time" → back to step 1
```

**Invoice pipeline** uses the same shape:
Invoice ID input → `/api/invoice` → invoice data + role-based field visibility → explanation for hidden fields ("hidden because of your role") → render → log the lookup.

## 6. The adapter (why the backend is swappable)

All ERP calls go through **one exported entry point**. Swapping the mock ERP for a real API (or a Google Sheet) should mean changing **one file**, not the whole app.

- Never call the mock data files directly from pages, routes or Claude code.
- Always go through the adapter's entry point.

## 7. Key files and names

| Path / name | What it is |
| --- | --- |
| `app/reorder/page.tsx` | Reorder page (paste box, results table, activity log) |
| `app/invoice/page.tsx` | Invoice lookup page |
| `app/api/quote/route.ts` | Quote route handler; the one place all three tracks' work meets |
| `app/api/invoice/route.ts` | Invoice route handler |
| `lib/agent/` | All Claude code (tool definitions, `parseOrder.ts`, fallback) |
| `productQuote.ts` | `getQuoteForProduct` (returns `calculatedAt`, uses `crypto.randomUUID()` event IDs) |
| `mockERP.ts` | Fake ERP: `getERPStock(sku)`, with simulated timeouts and errors |
| `types.ts` | Shared types (`Order`, `Invoice`, …) |
| `data/order-history.json` | Fake past orders |
| `Spinner`, `EmptyState`, `ErrorMessage` | Shared loading / empty / error components |
| `AccountContext` | Shared selected-account state (React Context) |
| `DECISIONS.md` | Log of design decisions and caught issues |

## 8. Who owns what (three tracks)

| Track | Owns | Never touches |
| --- | --- | --- |
| **A: Data** | Fake ERP, pricing / stock / visibility rules, order history, invoice data, activity events, keeping functions pure enough to cache, unit tests | Routes, rendering, Claude calls |
| **B: UI + routes** | Pages, route handlers (the only code that reads data), caching mechanics, rendering results / log / errors, account Context, accessibility, deploy | Pricing / stock logic, Claude calls |
| **C: Claude** | Claude tool definitions, Zod checks, raw error → buyer sentence, fuzzy-match wiring, Claude-down fallback | Pricing / stock logic, rendering, routes |

Rules that come from this table:

- **Only Track B edits route handlers.** Track C hands over a function; Track B wires it in.
- **Track C returns values; it doesn't render.** The Claude-down fallback returns a message value, and Track B shows it with `ErrorMessage`.
- **Track A keeps `getQuoteForProduct` pure** (same input → same output, no side effects) so it's safe to cache.

---

## 9. Rules for changes

1. **Fail honestly.** No "something went wrong." Every error type maps to a specific, readable sentence and an activity-log entry.
2. **No silent actions.** Every Claude action (parse, suggestion, explanation), hidden-stock check, retry and invoice lookup writes to the activity log.
3. **Check Claude's output.** Nothing downstream trusts Claude's response until it passes Zod.
4. **Retry once, not more.** ERP timeouts retry one time before the buyer sees an error.
5. **Show freshness.** Every result row shows "stock as of [time]" from `calculatedAt`.
6. **Accessibility is part of building, not an add-on.** Real `<button>` / `<label>` / `<table>` elements, labeled inputs, keyboard navigation, visible focus, `aria-live` on the activity log, target WCAG AA.
7. **Keep the README honest.** Describe the lean mock-ERP scope. Don't claim features that aren't built.
8. **Secrets stay server-side.** The Claude API key and any Google service-account keys never reach the browser or the repo.

## 10. Known gaps (say these plainly, don't hide them)

1. **No real database.** JSON files; two writes at the same time could collide.
2. **No stock reservation.** Ordering doesn't reduce stock, so two buyers could both "get" the last unit.
3. **No manager-approval workflow.** The only human check is the buyer confirming their own parsed order.
4. **No real login.** The account picker stands in for authentication.
5. **Flat account discount.** No volume-tier or negotiated pricing.
6. **Simulated staleness.** The mock ERP is fast; stock numbers are a hash of the SKU, not real counts.
7. **Prices are plain JS numbers.** A real system would use integer cents or a decimal type.
8. **Claude parsing isn't unit-tested.** It isn't deterministic, so it was spot-checked by hand.
9. **Fuzzy-match threshold isn't tuned.** It's a reasonable default, not benchmarked.

## 11. What a real ERP integration would still need (Path to Production)

Credit Acro Commerce for this list:

- Real authentication
- Rate limits
- Credit checks
- Volume-tier / negotiated-rate pricing
- Branch / account hierarchies

---

## 12. Timeline reference

The original build ran Aug 4 – Aug 31, 2026, in four weeks:

1. Get the pieces working alone
2. Wire them together for reordering
3. Add the invoice pipeline
4. Tests, cleanup, demo

Full day-by-day detail is in `apollo-build-plan-rewrite.md`. **Update this section with the project's current status.** This file doesn't track which items were finished.
