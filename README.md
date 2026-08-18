# Apollo

**Team:** _Mike, Mahtab, Alex_

**In one sentence:** an AI ordering agent with a swappable, adapter-pattern backend, currently running against a mock ERP — not a live ERP connector, not an online store.

Created to help buyers reorder and get accurate quotes without fighting a slow or inconsistent ERP. Under the hood, our friend Claude handles the parts that need judgment _(reading messy pasted orders, deciding when stock data is too stale to trust)_, everything else is straightforward app logic.

This project was inspired by a conversation with owner and CEO of **Acro Commerce** in Kelowna, who I'd asked what he looks for when hiring a junior developer. Rather than generic advice, he described a real, recurring front-end problem:

- **Stale Data:** _A live stock check can show numbers that are hours old, so the buyer sees a number that's already wrong. Accuracy matters._
- **Account Specific Pricing/Stock:** _Pricing and stock aren't the same for everyone. They depend on the account, so the same product can show a different price or availability to different accounts._
- **Buyers don't browse, they reorder:** _Returning customers don't want to browse a catalog, they paste SKUs or rebuy from old invoices._

It was especially clear that failure states matter more than happy paths. One slow or broken API call and the whole product looks unreliable to the buyer. Apollo is my attempt to actually build that problem, not just describe it.

**What this isn't:** a standalone ERP (it doesn't manage inventory, accounting, or operations), an eCommerce store (no browsing/cart/checkout), or connected to any real company system (every account, product, and order is fake mock data).

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Claude API (Haiku 4.5 for most calls, Sonnet 5 for judgment-heavy reasoning... probably)
- JSON files (stand-in database, no real DB or auth for now)
- React Context (session state, for showing which account is _"logged in"_)
- Zod (validates Claude's structured JSON output)

## Getting started

```bash
npm install
cp .env.example .env.local   # then paste your key in
npm run dev
```

`.env.local` is gitignored, so it won't come down with a clone or pull — every dev makes their own from `.env.example`. It needs:

```
ANTHROPIC_API_KEY=dont_commit_the_api_key_lol
```

Grab a key at [console.anthropic.com](https://console.anthropic.com/settings/keys).

## Project structure

> ⚠️ Drafted from what's been discussed/built so far, not a verified file listing — confirm this matches the real repo and fix anything wrong.

```
/app
  page.tsx              → root router (redirects based on account state)
  /reorder/page.tsx       → paste-to-quote reorder flow
  /invoice/page.tsx       → invoice lookup (Week 3)
  /api
    /quote/route.ts        → parses + prices + stocks a pasted order
    /invoice/route.ts       → invoice lookup (Week 3)
/components              → Spinner, EmptyState, ErrorMessage, ActivityLog, etc.
/lib
  /agent                  → Claude tool definitions, parseOrder.ts (Track C)
  orders.ts               → addOrder(), getOrderHistory()
  mockERP.ts              → getERPStock() — fake ERP w/ forced failures + SKU-stable stock
  productQuote.ts          → getQuoteForProduct() — combines price, stock, visibility, logging
  accountRules.ts          → calculatePrice(), seeStock(), accessWarehouse()
/data                    → accounts.json, catalog.json, order-history.json
types.ts                 → shared types (Role, AccountType, UserContext, Product, Order, ...)
DECISIONS.md             → running log of technical decisions
```

## Progress log

### July 30, 2026 — Project setup
- Complete project scaffolding.
- Connected local repo to GitHub.
- Set up `.env.local` for the Anthropic API key, .gitignored it.
- Ran a ping test `/api/ping` route returning `{ status: "it works, you did it! :)" }` to verify our tech stack and routing all work together before we start building.
- Started `DECISIONS.md` for tracking important technical choices as we go.

### August 4–13, 2026 — Week 1 build + Day 6–7 (Track A)
> Recap based on the team's build plan, not written from first-hand notes — confirm/adjust against `DECISIONS.md` before relying on it.
- Built the async mock ERP (`getERPStock`) with a random 300–1500ms delay and a 15% forced-failure chance, plus an on-demand forced-failure switch for testing/demos.
- Wrote the core shared types (`Role`, `AccountType`, `UserContext`, `Product`) and sample catalog/account data.
- Built the pricing and visibility rules (`calculatePrice`, `seeStock`, `accessWarehouse`) in `lib/accountRules.ts`.
- Combined pricing, stock, and visibility checks into one function, `getQuoteForProduct`, logging each step to an activity log.
- Added real caching (`'use cache'` / `cacheTag`) around the ERP calls.

### August 17, 2026 — Order history + data hygiene (Day 7–8 catch-up)
- Added the `Order` type (`id`, `accountId`, `items`, `timestamp`) to `types.ts` — `accountId` is typed `number` to match `UserContext.id`, so account lookups never need type coercion.
- Seeded `data/order-history.json` with 7 sample orders across all 3 accounts, using real SKUs from the catalog and real account IDs.
- Built `addOrder()` and `getOrderHistory()` in `lib/orders.ts` — append-and-read functions against the JSON order history.
- Replaced the temporary `event-${eventCount}-temp-ID` counter in `productQuote.ts` with `crypto.randomUUID()`, closing the ID-collision risk flagged in `DECISIONS.md`.
- Added a `calculatedAt` field to `getQuoteForProduct`'s return value, set inside the function so cached responses report when they were truly computed, not when they were read from cache.
- Fixed `getERPStock` to derive its stock number from a hash of the `sku`, so the same product returns the same stock count on repeat calls instead of a random, unrelated one — landed ahead of Thursday's (Aug 20) check-in deadline.
- Added `revalidateTag("stock", "max")` to the end of `addOrder`, so placing an order busts the cached stock data. Can't be verified standalone (needs a live Next.js request context) — confirmed to work correctly by inspecting the write order in the function.
- Verified core logic with a standalone test script (`lib/test/trackA-test.ts`): confirmed SKU-stable stock hashing and correct per-account order filtering.
- Notified Track C that `getOrderHistory` is live, so they can swap their Day 7 stub for the real function.

## What's Next
- **Track A (Day 9, Aug 19):** log an event when stock is hidden by role instead of failing silently; wrap `getERPStock`'s timeout in a custom error class that preserves already-logged events; add one automatic retry before surfacing a timeout to the buyer.
- **Track B (Day 9):** build a hidden failure-demo panel so timeout/not-found states can be triggered on demand instead of waiting on random chance.
- **Track C (Day 9):** confirm Day 8's plain-English error explanations actually show up in the activity log.
- **Day 10 (Aug 20) — Check-in:** paste a messy order into `/reorder` and watch it go paste → Claude parse → priced/stocked table → activity log, live, with no fallback needed.
- **Week 3 (Aug 21–25):** fuzzy-match suggestions for unmatched SKUs, a parallel invoice-lookup pipeline, shared account Context, and accessibility basics.
- **Week 4 (Aug 26–31):** unit tests, a full accessibility audit, one clear ERP entry point (proving the "swappable adapter" claim), and README/demo/deploy on Aug 31.