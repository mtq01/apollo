# Apollo Build Plan

## Revision log — Aug 26 changes

This revision folds invoice lookup into the **existing reorder textbox and `/api/quote` route**, instead of a separate `app/invoice/page.tsx` page and `/api/invoice` route. Specific changes from the original plan:

1. **No separate invoice page or route.** Everything routes through the existing reorder textbox, the existing `/api/quote/route.ts`, and the existing `reorder/page.tsx` results area.
2. **Track C's parser now recognizes three intents, not two:** new order, order history, and invoice/PO lookup — a third Claude tool alongside the existing `record_items` and order-history tools, same pattern as before, applied a third time.
3. **Track B's Day 12+13 task changed** from "build an invoice page" to "branch the existing route and render the existing results area for the invoice case."
4. **§1C's pipeline diagram updated** to show the shared textbox/route/page instead of a separate page and route.
5. **References to "both pages" (Days 14, 16, 18–19) updated** to refer to the order and invoice *sections* of the single reorder page, since there's no longer a second page.
6. **New open question added to §6:** what Claude should do when it can't confidently tell the three intents apart.

Everything else below reflects these changes. Where a step was cut, it's struck through and replaced rather than deleted, so you can see what changed and why.

---

## 1. The big picture

Two separate things got tangled together and that's most of why this was hard to hold in your head: **when** things get built (the 4-week timeline) and **how** the finished pieces connect at runtime (the request pipeline). They're both "the big picture," but they're two different diagrams. Below, each gets its own section, in a format meant to translate directly into a Figma timeline/mindmap: §2A is the horizontal timeline (four swimlanes, one per week, three rows each for the three tracks), §2B is the pipeline (one flowchart, numbered stages, each stage tagged with the week/day that built it).

### 1A — Build timeline: four weeks, start to end

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WEEK 1  ·  Aug 4 – Aug 10  ·  "Get the pieces working ALONE"                 │
│ ──────────────────────────────────────────────────────────────────────────  │
│  Track A (Days 1–5): async mock ERP → types → sample data → pricing/stock   │
│                       rules → combined into one priced+stocked result       │
│  Track B (Days 1–5): App Router skeleton → typed stub API → reusable        │
│                       components → activity-log list → account dropdown     │
│  Track C (Days 1–5): call Claude → plan the data shape → tool-use parser →  │
│                       Zod validation → stress-test with messy input         │
│  WEEK 1 ENDS WITH: three pieces that work, but don't talk to each other yet │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WEEK 2  ·  Aug 11 – Aug 20  ·  "WIRE it together for reordering"            │
│ ──────────────────────────────────────────────────────────────────────────  │
│  Track A (Days 6, 8–9): event logging (Day 6) → UUID ids, calculatedAt,     │
│                       SKU-stable stock, order history (Day 8) → stock-      │
│                       hidden logging, retry-once (Day 9)                    │
│  Track B (Days 6, 8–9): real reorder page (Day 6) → loading/empty/error     │
│                       states, stock-as-of UI, ★ wires Track C's parse       │
│                       function into the live route (Day 8, the join point)  │
│                       → failure-demo panel (Day 9)                          │
│  Track C (Days 6–9): chain parser→pricing (Day 6) → order-history tool,     │
│                       stubbed (Day 7 — the day Track C fell behind) →       │
│                       parse function + error→plain-English (Day 8) → hook   │
│                       explanations into the log (Day 9)                     │
│  (Team took Aug 14–16 off. Track C was also a day behind on Day 7. Days 7–  │
│   10 now each get their own full day instead of one crammed catch-up.)     │
│  WEEK 2 ENDS WITH: Day 10 check-in (Aug 20) — paste text → real priced/     │
│                     stocked quote, live, end to end                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WEEK 3  ·  Aug 21 – Aug 25  ·  "MORE than a basic form" (invoice lookup,    │
│           same page & route as reorder)                                     │
│ ──────────────────────────────────────────────────────────────────────────  │
│  Track A (Days 11, 12+13, 14+15): fuzzy-match helper → invoice data/types   │
│                       + visibility rules (combined day) → log invoice       │
│                       lookups + check-in (combined day)                     │
│  Track B (Days 11, 12+13, 14+15): shared account Context → invoice lookup   │
│                       wired into existing route + page (combined day) →    │
│                       accessibility basics + check-in (combined day)        │
│  Track C (Days 11, 12+13, 14+15): wire fuzzy-match suggestions → add        │
│                       invoice-lookup parsing + explanations (combined day)  │
│                       → confirm log + check-in (combined day)               │
│  (Days 12+13 and 14+15 combined to make room for un-cramming Days 7–10 —    │
│   both pairs were already "no new lesson" days with light dependencies,     │
│   see §3 for the reasoning)                                                 │
│  WEEK 3 ENDS WITH: reorder + an invoice-lookup flow sharing the same page   │
│                       and route, both role-aware, both fully explained in   │
│                       plain English                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WEEK 4  ·  Aug 26 – Aug 31  ·  "TESTS, cleanup, demo" — no new pipeline     │
│           stages get built this week, only hardening what exists           │
│ ──────────────────────────────────────────────────────────────────────────  │
│  Track A (Days 16, 17, 18+19): unit tests → fuzzy-match tests → ★ one       │
│                       clear entry point + buffer, combined day              │
│  Track B (Days 16, 17, 18+19): Tailwind cleanup + log-ordering check →     │
│                       full accessibility audit → visual consistency +      │
│                       buffer, combined day                                  │
│  Track C (Days 16, 17, 18+19): unit test the error-mapping function →     │
│                       polish every explanation → Claude-down fallback +    │
│                       buffer, combined day                                  │
│  (Day 19's dedicated buffer day is now folded into Day 18 rather than       │
│   standing alone — real trade-off, less slack before Aug 31, see §3)       │
│  Day 20 (Aug 31, ALL): README + demo script (A) · deploy (B) · record (C)  │
│  WEEK 4 ENDS WITH: deployed, tested, accessible, documented, demo-ready     │
└─────────────────────────────────────────────────────────────────────────────┘
```

Four checkpoints sit inside this timeline and don't move: **Day 10 check-in** (end of Week 2, Aug 20, now its own standalone day), **Day 15 check-in** (end of Week 3, Aug 25, combined with Day 14's build work), and **Day 20** (end of Week 4, Aug 31, also the deadline). For the Figma version: this section is naturally four horizontal swimlanes (one per week) with three sub-rows each (one per track) — the ★ mark above is the moment worth calling out visually, since it's where a track's work stops being isolated and becomes part of the shared system.

### 1B — Runtime pipeline: what happens when a buyer submits an order

This is the *finished* system's request path — the thing all of Week 1–2's work above was building toward. Each stage below is tagged with when it was actually built, so you can trace any pipeline stage back to its day in §2A.

```
 STAGE 1 · INPUT                                          built: Wk1 D1–5 (Track B) + Wk2 D8 (Track B)
 Buyer picks an account, pastes raw text into the reorder page
        │
        ▼
 STAGE 2 · PARSE                                          built: Wk1 D1–5 (Track C) · wired live: Wk2 D8 (Track B, calling Track C's Day 8 function)
 Route handler sends the pasted text to Claude's `record_items` tool →
 structured line items (sku / quantity / productGuess / confidence) →
 validated against the Zod schema before anything downstream trusts it
        │
        ▼
 STAGE 3 · PRICE & STOCK                                  built: Wk1 D1–5 (Track A) · cached: Wk2 D7 (Track B)
 For each parsed item, run getQuoteForProduct():
   • calculatePrice()              — account-type discount
   • seeStock() / accessWarehouse()— role + warehouse-match visibility
   • getERPStock()                 — mock ERP call, wrapped in
                                      'use cache' + cacheTag('stock')
   • builds events[]               — activity-log entries as it runs
        │
        ▼
 STAGE 4 · ERROR TRANSLATION                              built: Wk2 D8–9 (Track C)
 Any raw error (timeout / not found / restricted) → one buyer-readable sentence
        │
        ▼
 STAGE 5 · RENDER                                         built: Wk1 D6 (Track B) · refined: Wk2 D8 (Track B)
 Results table + "stock as of [time]" line + activity-log sidebar
        │
        │  buyer confirms the order
        ▼
 STAGE 6 · CONFIRM & RECORD                                built: Wk2 D8 (Track A)
 addOrder() writes to order-history.json, then revalidateTag('stock','max')
 busts the cache so the next quote reflects reality
        │
        ▼
 STAGE 7 · FEEDBACK LOOP                                   built: Wk2 D7 stub (Track C) → real: Wk2 D8 (Track A)
 getOrderHistory() powers "reorder what I got last time" — feeds back into
 Stage 1, closing the loop
```

**Note on caching (Stage 3):** Track B built the *mechanics* (`'use cache'`, `cacheTag`, `revalidateTag`) — Track A's job was only to keep `getQuoteForProduct` pure enough (same input → same output, no side effects) to be safe to cache. Worth keeping that ownership line clear in the Figma diagram since it's easy to draw as if one track did both halves.

### 1C — Week 3 extension: invoice lookup, sharing the reorder pipeline's page and route

Same buyer-facing shape as §1B (parse → look up → explain → render → log), built Days 11–14, but running **through the same textbox, the same `/api/quote` route, and the same reorder page** as the order pipeline — distinguished only by which intent Claude's parser detects, not by a separate page or route:

```
 STAGE 0'  Buyer pastes a PO# / invoice ID into the        Track B — existing input, no new UI
           same reorder textbox used for orders
        ▼
 STAGE 1'  Claude parses intent — new order / order        Track C, Days 12–13 (a third tool,
           history / invoice lookup                        alongside record_items and the
                                                             existing order-history tool)
        ▼
 STAGE 2'/3'  /api/quote route branches to the invoice      Track A — data + visibility rules,
              case → invoice data + role-based              Days 12–13 · Track B — branches the
              visibility rules                              existing route, Days 12–13
        ▼
 STAGE 4'  Explanations for anything hidden ("this line     Track C, Days 12–13
           item is hidden because of your role")
        ▼
 STAGE 5'  Renders the invoice in the same results area     Track B, Days 12–13
           used for priced orders — no separate page
        ▼
 (log)     Track A logs the lookup to the same shared       Track A, Day 14
           activity log
```

### 1D — Who owns what

If a task doesn't obviously belong to one track, check here before building it twice:

| | Owns | Never touches |
|---|---|---|
| **Track A** | Fake ERP, pricing/stock/visibility rules, order history, invoice data, producing activity events, keeping functions pure enough to cache, unit tests | Routes, rendering, Claude calls |
| #### Track B | Pages, route handlers (the only things allowed to read data), caching *mechanics* (`use cache`/`cacheTag`/`revalidateTag`), rendering results/log/errors, account Context, accessibility, deploy | Pricing/stock logic, Claude calls |
| #### Track C | Claude tool definitions, Zod validation, turning Track A's raw errors into buyer language, fuzzy-match wiring, Claude-down fallback | Pricing/stock logic, rendering, routes |

The route handler (Stage 2/3 boundary in §1B, and the same boundary the invoice branch shares in §1C) is the one place all three tracks' work is required to meet — if Monday's audit (§4) turns up a piece that isn't wired, it lives there by definition, even if the underlying pieces (Track A's pricing function, Track C's tool) each work fine in isolation.

---

## 2. Calendar

Two facts to reconcile: the team is taking Fri Aug 14 through Sun Aug 16 off before resuming (the right call), and Track C is behind by two days (Day 7 *and* Day 8), not one. Together that means Days 7–10 need to be spread across four separate calendar days starting Monday, not crammed into one — that was the point of un-cramming them.

From Mon Aug 17 to Aug 31 there are exactly 11 weekdays. Days 7 through 20 is 14 day-labels. Giving Days 7–10 their own separate days (using 4 of those 11) leaves only 7 weekdays for the 10 remaining labels (Days 11–20) — a shortfall of 3. Rather than re-compress the part you just asked to spread out, the 3 days get recovered further down the schedule, at three spots that were already the lowest-risk places to combine:

- **Days 12 + 13 → one day.** Both were already "no new lesson" days (same data+types pattern, same conditional-logic pattern reused) with only a same-day, non-blocking dependency between them.
- **Days 14 + 15 → one day.** Same pattern already used for the old Day 9/10 merge: a light build day plus its check-in, combined — Day 15 was never new content, just a test-everything pass.
- **Days 18 + 19 → one day.** This is the one real trade-off worth naming plainly: Day 19 was the team's dedicated buffer day, the main safety margin this close to the deadline. Folding it into Day 18 means that safety margin now has to come out of whatever's left of Day 18 rather than existing as its own day. If the team would rather protect the buffer day and re-compress Days 7–10 instead, that's a fair call to make differently — this plan assumes un-cramming Days 7–10 was the priority, per this conversation.

```
Mon Aug 17  → Day 7
Tue Aug 18  → Day 8
Wed Aug 19  → Day 9
Thu Aug 20  → Day 10 — Check-in (not skippable)
Fri Aug 21  → Day 11
Mon Aug 24  → Day 12 + Day 13, combined
Tue Aug 25  → Day 14 + Day 15 — Check-in, combined (not skippable)
Wed Aug 26  → Day 16
Thu Aug 27  → Day 17
Fri Aug 28  → Day 18 + Day 19 — Buffer, combined
Mon Aug 31  → Day 20 — README, demo, deploy, submit
```

---

## 3. Days 7–10, spread across the week

### Mon Aug 17 — Day 7

**Track A and Track B already finished their Day 7 work** (per `BuildPlanUpdated.md`'s Aug 13 status: forced-failure switch and real-data/caching wiring, both done). Only Track C fell behind on Day 7 — the order-history tool was never built, even against a stub. That leaves Track A and B with a genuinely free day: use it to get a head start on Day 8 below (nothing in Day 8's Track A/B work depends on anything Track C does today), or pair with Track C if that's more useful.

### Step 0 — all three tracks, 15 minutes, together

1. Open `/api/quote/route.ts`. Confirm: does it read `text`/`accountId` from the POST body, or ignore the body and loop the hardcoded catalog for account 1? Write the answer down.
2. Open `reorder/page.tsx`. Confirm: does the activity log sidebar render real data from the API response, or the hardcoded `fakeActivity` array? Write the answer down.
3. Open `data/order-history.json`. Confirm: empty, or has sample orders? Write the answer down.
4. Don't fix anything yet — just use these three answers to skip any step in Days 7–9 that's already done.

### Track C — Order-history tool (the actual Day 7 backlog)

1. Add a tool so Claude can pull up a buyer's order history ("reorder what I got last time"), wired against a **stub** for now (hardcode 1–2 fake past orders it returns).
2. Track A's real `getOrderHistory` ships Day 8 (below) — swap the stub for the real import once it's ready, same stub pattern the plan already used in Week 1.

**Done when:** the order-history tool works end to end against the stub, ready to swap to real data tomorrow.

---

### Tue Aug 18 — Day 8 — the join-point day

This is the day the pipeline actually gets wired together — see §1B, Stage 2.

#### **Track A**

1. In `types.ts`, add an `Order` type: `id`, `accountId`, `items` (sku + quantity), `timestamp`.
2. In `data/order-history.json`, add 2–3 fake past orders per account.
3. Write `addOrder(order)` in a new or existing lib file — appends one entry to order history.
4. Write `getOrderHistory(accountId)` — returns that account's past orders.
5. Tell Track C the moment step 4 is done — they're swapping yesterday's stub for this real function.
6. In `productQuote.ts`, replace the `event-${eventCount}-temp-ID-needs-to-be-changed-later` counter with `crypto.randomUUID()`.
7. Add a `calculatedAt` field to the object `getQuoteForProduct` returns — set it inside the function, not on every cache hit.
8. **Must land before Thursday's check-in, do now if it fits, Day 9 at the latest:** in `mockERP.ts`, add a `sku` (or `productId`) parameter to `getERPStock`, and derive the returned stock number from it (a simple hash is enough) so the same product returns the same number on repeat calls instead of a random unrelated one.
9. If time allows: call `revalidateTag('stock', 'max')` at the end of `addOrder`. If it doesn't fit, this is one line for tomorrow.

**Done when:** `getQuoteForProduct` returns a `calculatedAt` field, event IDs are UUIDs, `order-history.json` has real sample data, `addOrder`/`getOrderHistory` exist and are exported.

#### Track B

1. In `reorder/page.tsx`, import `Spinner`, `EmptyState`, `ErrorMessage` (already built, not yet used here).
2. Add a loading state: show `Spinner` while the `/api/quote` request is in flight.
3. Add an empty state: show `EmptyState` before anything's been submitted.
4. Add an error state: show `ErrorMessage` if the request fails.
5. Add a "stock as of [time]" line to each results-table row, reading Track A's `calculatedAt` field. If Track A hasn't shipped it yet, stub with `new Date()` client-side and swap it in later.
6. **Once Track C's parse function (step 1 below) is ready:** in `/api/quote/route.ts`, import it, call it with the request body's `text`/`accountId`, and pass the returned structured items into Track A's `getQuoteForProduct` loop instead of the current hardcoded catalog loop. This is a Track B task — Track C hands over a function, Track B is the only track that edits route handlers.
7. Update the `getQuote` function in `reorder/page.tsx` to send `{ text, accountId }` in the POST body instead of an empty POST.
8. Once step 6 is live: replace the hardcoded `fakeActivity` array with the real `events` array from the API response.

**Done when:** the reorder page shows a spinner during the request, an empty state before submit, an error message on failure, a stock-as-of time per row, the route handler calls Track C's real parser instead of looping the hardcoded catalog, and the activity log sidebar shows real events instead of `fakeActivity`.

#### Track C

1. **Do this first — it's what Thursday's check-in actually tests.** Build a callable parse function (e.g. `lib/agent/parseOrder.ts`) that takes `(text, account)`, calls the `record_items` tool, runs the Zod schema (`recordItemsSchema`) against Claude's response, and returns the validated structured items. Keep this entirely inside `lib/agent/` — don't edit `/api/quote/route.ts` yourself, that's Track B's file to wire it into (their step 6 above).
2. Confirm the function works on its own — a quick standalone script or the existing `claudetest` page is fine for this, you don't need Track B's route wiring to test it.
3. Write a `switch` or lookup object mapping each of Track A's error types (`timeout`, `not found`, `restricted`, `invalid input`) to one buyer-readable sentence.
4. Once Track A's real `getOrderHistory` lands (their step 4 above): swap yesterday's stub for the real import.

**Done when:** the parse function reliably turns messy pasted text into validated structured items when tested on its own, each error type has a plain-English sentence ready to hand to Track B's error display, and the order-history tool is running on real data instead of yesterday's stub.

**Interview note:** the `crypto.randomUUID()` swap and the SKU-consistency fix (Track A steps 6 and 8) are both good small examples of "found it before a reviewer did" — the ID-collision risk was caught and documented in `DECISIONS.md` on Aug 11, days before it would have broken anything, and the SKU-consistency bug was caught by re-reading your own log, not by someone else's bug report. If asked how the team catches its own mistakes, this pair is concrete evidence, not a claim. The honest gap to volunteer alongside it: the stock number `getERPStock` returns is a hash of the SKU, not a real inventory count — consistent enough for a demo, but say so before you're asked, don't wait to be caught treating a simulated value as if it were real.

---

### Wed Aug 19 — Day 9

#### **Track A**

1. Log an event when stock is hidden by role instead of silently skipping it (`seeStock === false` currently produces no log entry at all).
2. Wrap `getERPStock`'s timeout in a custom error class that carries any events already collected, so a mid-check timeout doesn't silently drop everything logged before it.
3. Retry the call once automatically before surfacing a timeout to the buyer — one retry, not three, since the fake ERP fails on purpose often enough that three would mask most of Day 7's forced failures.
4. If the SKU-consistency fix (Day 8, item 8) didn't land yesterday, finish it today — it must be done before tomorrow's check-in.

**Done when:** a role-hidden stock check and a retried timeout both produce clear log entries instead of silence.

#### **Track B — Failure-demo panel**

1. Build a small hidden panel with buttons that trigger Track A's forced failures (built Day 7 originally).
2. Confirm each button reliably demos its failure state — timeout, not-found — on demand, instead of waiting for the random chance to hit.

**Done when:** every forced-failure state can be triggered on demand from the panel, not just by luck.

#### **Track C — Hook explanations into the log**

1. Confirm Day 8's plain-English error explanations actually show up as entries in the activity log, not just as a generic failure message on screen.

**Done when:** triggering a forced error produces a specific, readable log entry — not "something went wrong."

---

### Thu Aug 20 — Day 10 — Check-in (not skippable)

#### Track A

1. Confirm the SKU-consistency fix landed. If it's still not done, this is the last chance before the check-in review.

#### Track B

1. Click through the loading state, empty state, and every forced-error state (using yesterday's demo panel) by hand.
2. Confirm each one looks and reads correctly.

#### Track C

1. Turn on a forced error, run the full flow once, confirm the plain-English explanation shows up clearly in the activity log.

**Done when (whole team):** paste a messy order into `/reorder`, watch it go paste → Claude parse → priced/stocked table → activity log, live, with no fallback to `claudetest`. If Day 8's route-handler wiring (Track B step 6) still hasn't landed by today, use `claudetest` as the explicit fallback demo for this check-in rather than discovering the gap live — but flag that as a real risk to Day 11, not something to quietly carry forward.

---

## 4. Day-by-day, Day 11 through Day 20

### Fri Aug 21 — Day 11

**Track A — Fuzzy matching**
*Study first:* what Levenshtein distance measures, or skip the theory and use `fuzzysort`/`string-similarity`.

1. Write a helper function that takes a mistyped/unmatched product string and returns the 2–3 closest catalog matches.
2. Test it against a few deliberately misspelled SKUs.

**Track B — Shared account state**
*Study first:* React Context, `useContext`.

1. Create an `AccountContext` provider wrapping the app layout.
2. Move the account picker's selected-account state out of the reorder page and into this Context.
3. Confirm the reorder page still works reading from Context instead of local state.

#### **Track C — Wire in closest-match suggestions**

1. When `record_items` (or the downstream lookup) can't find an exact SKU match, call Track A's new fuzzy-match helper.
2. Return the 2–3 suggestions to the buyer instead of a dead-end "not found."

**Timing note:** build Track A's helper before lunch if possible — Track C needs it same-day, and while the gap is usually fine, don't start Track C's piece first thing in the morning if Track A hasn't started yet.

**Done when:** a deliberately misspelled SKU pasted into `/reorder` returns 2–3 suggested products instead of a plain error, and the account picker's selection persists via Context rather than page-local state.

**Interview note:** if asked why fuzzy-match instead of exact-only, the answer is the same reasoning as the parser's design generally — buyers paste real-world messy text, and a dead-end "not found" on a typo is a worse experience than a ranked guess. The honest limitation: fuzzy matching is approximate by nature, and the threshold for "close enough to suggest" wasn't deeply tuned given the timeline — it's a reasonable default, not a benchmarked one, and a suggestion could plausibly point at the wrong product with unearned confidence. Worth naming that risk unprompted if you're asked how confident the system is in its own suggestions.

---

### Mon Aug 24 — Day 12 + Day 13, combined

Both were already "no new lesson" days, so this is doable in one — just sequence Track B to start with the parts that don't need Track A's same-day output.

#### **Track A — Invoice data + types, then visibility rules**

1. Add an `Invoice` type to `types.ts`: id, accountId, line items, restricted-field flags, timestamp.
2. Add sample invoice data (a handful of fake invoices across a few accounts).
3. Write the request/response shape the invoice-lookup branch of `/api/quote` will use.
4. Write a function (same pattern as `seeStock`/`accessWarehouse`) deciding which invoice fields a given role can see.
5. Test it against buyer/manager/admin roles with 2–3 examples each.

#### **Track B — Wire invoice lookup into the existing reorder route**

1. In `/api/quote/route.ts`, add a branch for Track C's invoice-lookup intent, alongside the existing order and order-history branches.
2. When that branch is hit, call Track A's invoice data from step 2 above — this part doesn't need to wait on anything.
3. In `reorder/page.tsx`, add rendering for the invoice result shape, reusing Week 1's small components (`Spinner`, `EmptyState`, `ErrorMessage`) — same results area already used for priced orders, no new page.
4. Once Track A's visibility rule (step 4 above) is ready: apply it to hide restricted fields in the invoice response before rendering.

*(No `app/invoice/page.tsx`, no `/api/invoice` route — everything routes through the existing textbox, `/api/quote`, and `reorder/page.tsx`.)*

#### **Track C — Parse invoice/PO lookups, then extend explanations**

1. Add a third tool (e.g. `lookup_invoice`) so Claude can recognize a pasted PO#/invoice ID, alongside the existing `record_items` and order-history tools.
2. Extend the parse function's branching logic to check which of the three tools Claude called, and test a few ambiguous phrasings (e.g. "show me my last order" vs. an actual invoice ID) to confirm Claude doesn't confuse the two.
3. Extend Day 8's error-mapping pattern to cover invoice-specific cases, e.g. "this line item is hidden because of your role."

*(This fills the slack that used to sit in Track C's original Day 13 slot — the source plan had no second task here.)*

**Done when:** pasting a PO#/invoice ID into the existing reorder textbox returns an invoice result — not a separate page — rendered in the same results area as a priced order; restricted fields are correctly hidden per role, enforced inside `/api/quote/route.ts`; there's a mapped explanation for at least one invoice-specific hidden-field case; and Claude reliably tells the three intents (new order, order history, invoice lookup) apart on real, slightly ambiguous input.

**Interview note:** the invoice-lookup flow deliberately reuses the reorder pipeline's shape (route handler → data layer → explanation layer → render) instead of inventing a second pattern — and it goes a step further than just reusing the *shape*, it reuses the actual same route handler and page, distinguished only by Claude's parsed intent. A good answer if asked about code consistency or design decisions under time pressure. Same flat equality-check philosophy as `seeStock`/`accessWarehouse` too — one role maps to one visibility rule, no per-account overrides. Two honest limitations worth having ready: invoice data is static sample JSON with no real link back to the order that produced it (a deliberate scope cut, not an oversight), and if asked "how would this scale to custom per-customer permissions," the honest answer is it wouldn't as built — three roles is deliberately coarse, not a granular ACL model. A third, new one worth naming: with three intents now sharing one parser, there's a real (if small) chance of Claude misreading an ambiguous phrase — worth saying how that's handled (see §6) rather than implying it never happens.

---

### Tue Aug 25 — Day 14 + Day 15 check-in, combined

Same pattern as the old Day 9/10 merge: a light build day plus its check-in, combined — Day 15 was never new content, just a test-everything pass.

#### **Track A — Log invoice lookups**

1. Add an activity-log event every time an invoice is looked up, same pattern as order events.

#### **Track B — Accessibility basics**

*Study first:* `label htmlFor`, manual keyboard-navigation testing.
1. Add a proper `<label>` to every input on the reorder page (order and invoice sections).
2. Tab through both sections using only the keyboard.
3. Fix anything that can't be reached, loses focus, or behaves unexpectedly.

#### **Track C — Confirm logging**

1. Walk through every action Claude takes (parsing, fuzzy-match suggestion, error explanation) and confirm each produces a clear activity-log entry, not a silent action.

##### **Then, same day — Day 15 check-in (not skippable)**

**All tracks together**

1. Test the full reorder flow end to end.
2. Test the full invoice-lookup flow end to end.
3. Trigger every forced-error type and confirm each shows correctly in both the UI and the activity log.

**Done when:** invoice lookups appear in the activity log, both the order and invoice sections are fully keyboard-navigable, every Claude action is visible in the log, and all three check-in tests above pass without manual workarounds.

**Interview note:** doing basic accessibility per-feature as you build, rather than saving all of it for Day 17's audit, is worth mentioning explicitly if asked about process — "we treated it as part of building the page," not bolted on at the end. Separately, the four scheduled check-in days (5, 10, 15, 20) are themselves worth naming as a process decision — regular, non-skippable "does this actually work end to end" gates instead of finding out everything's broken at Day 20. The honest limitation on both: today's accessibility pass is manual and per-feature, not automated or exhaustive, and check-ins are manual click-through tests, not automated regression tests — a check-in passing today doesn't guarantee Day 16's work doesn't quietly break something, since there's no CI test suite catching that until Day 16's unit tests exist.

---

### Wed Aug 26 — Day 16

#### **Track A — Unit testing basics**

*Study first:* Vitest or Jest (either).

1. Write tests confirming `calculatePrice` returns correct values for standard vs. contract accounts.
2. Write tests confirming `seeStock`/`accessWarehouse` return correct booleans for each role.

#### **Track B — Tailwind cleanup, plus log ordering**

1. Pass over the reorder page's order and invoice sections and fix spacing/sizing/alignment inconsistencies.
2. **Moved here from an earlier pass of this plan, which had it under Track C — this is a rendering concern, not an explanation-content one:** confirm activity-log entries always render in the correct chronological order, fix if not.

#### **Track C — Unit test the error-mapping function**

*Study first:* nothing new — same testing pattern as Track A's Day 16, applied to Track C's own logic.

1. Write tests confirming the error → plain-English mapper (built Day 8) returns the right sentence for each of Track A's error types (`timeout`, `not found`, `restricted`, `invalid input`).
2. This is Track C's equivalent of Track A's pricing/visibility tests today — the mapping function is deterministic (one input, one correct sentence), so it's worth locking down the same way, unlike the Claude parsing itself which isn't.

**Done when:** pricing/visibility unit tests pass, both sections read visually consistent, log ordering is confirmed correct, and the error-mapping function has passing tests for every error type.

**Interview note:** the tests target `calculatePrice`, `seeStock`/`accessWarehouse`, and the error-mapping function specifically because those are pure, deterministic functions with one correct answer — a good, deliberate answer if asked "what did you actually test and why those parts." The honest limitation, worth volunteering: nothing here tests Claude's parsing accuracy itself — that's inherently non-deterministic, and this project handles it by spot-checking messy real-world inputs by hand (Week 1 Day 5), not automated tests. If pressed on test coverage, name that gap directly rather than letting "we wrote tests" imply more coverage than exists.

---

### Thu Aug 27 — Day 17

#### **Track A — Test the fuzzy-match helper**

1. Write tests confirming the closest-match helper suggests sensible alternatives for common typos.

**Track B — Full accessibility audit** *(confirmed: intentional parallel work with Track A today, not a conflict)*

1. Semantic HTML pass: confirm real `<button>`/`<label>`/`<table>`/ordered heading tags, no styled `<div>`s pretending to be interactive.
2. ARIA pass: add `aria-live` to the activity log, `aria-label` to icon-only buttons — only where semantic HTML can't already do the job.
3. Focus pass: confirm every interactive element has a visible focus outline, and tab order matches visual order.
4. Contrast pass: run Lighthouse or axe DevTools on the page, fix anything below WCAG AA.
5. Forms pass: confirm every input still has its Day 14 label, and validation messages are associated with their field.
6. Screen-reader pass: turn on VoiceOver/NVDA, click through the reorder flow start to finish.

#### **Track C — Read every explanation out loud**

1. Read every buyer-facing explanation message out loud.
2. Rewrite anything that sounds stiff, robotic, or unclear.

**Done when:** fuzzy-match tests pass, every item in the accessibility checklist is checked off, and every explanation reads naturally out loud.

**Interview note:** having a written checklist for the accessibility pass (semantic HTML → ARIA → focus → contrast → forms → screen reader), rather than a vague "check accessibility" line, is worth describing concretely if asked how the team approached it — it shows a repeatable process, not a one-time scramble. The honest limitation: one manual screen-reader pass this close to the deadline is a spot-check by the person who built the page, not independent user testing or a certified WCAG audit — say "we targeted AA and tested it ourselves," not "we're WCAG AA compliant."

---

### Fri Aug 28 — Day 18 + Day 19, combined

Day 19 no longer stands alone as a dedicated buffer day — its content is folded in here. **Real trade-off, worth restating:** whatever time Day 18's actual build work leaves over is now the team's only buffer before the deadline. If Day 18's build runs long, everything under "if time remains" below is what gives.

#### **Track A — One clear entry point, then optional adapter proof**

1. Reorganize the fake-ERP code so every call to it goes through one single exported function/module.
2. Confirm swapping the implementation behind that one entry point wouldn't require touching any other file.
3. **First priority if anything from Days 10–17 is still broken:** fix that before anything below.
4. **Only if 1–3 are solid and time remains:** build a second adapter reading from a real Google Sheet (private service account, not a public link), wired behind step 1's entry point — this is what makes the demo's "swappable" claim demoable instead of asserted.

#### **Track B — Visual consistency, plus rendering Track C's Claude-down state**

1. Compare loading/empty/error states across the reorder page's order and invoice sections side by side.
2. Fix any visual mismatch between them.
3. Once Track C's fallback state (below) exists, render it through the same `ErrorMessage` component pattern already used for Track A's error types — this is a rendering task, so it belongs here rather than inside Track C's fallback code.
4. **First priority if anything from Days 10–17 is still broken:** fix that before anything below.

#### **Track C — Claude-down fallback**

1. Wrap the Claude API call (inside `lib/agent/`) in try/catch.
2. On failure, return a clear fallback error/message value instead of throwing raw — don't render anything directly here, hand the value to Track B's route handler / UI (their step 3 above).
3. Test by temporarily breaking the API key/URL and confirming the fallback value comes back instead of a crash.
4. **First priority if anything from Days 10–17 is still broken:** fix that before anything below.

**Whole team, only if time remains after each track's priority-1 fixes above:**

1. Draft the Path to Production README section: what a real ERP integration would still need — real auth, rate limits, credit checks, volume-tier/negotiated-rate pricing (not "contract pricing"), branch/account hierarchies. Source from the Acrocommerce writeup, credit them explicitly.
2. **Confirmed rule: this is the first thing cut if the day's already spoken for.** No partial-content compromise — either it gets written or it doesn't.
3. Confirm with the team whether the ERP-tools/human-in-the-loop research briefs belong here or on a separate track — still open as of this plan.
4. Optional, lowest priority: event-type filter on the activity log (Aug 6 TODO).

**Done when:** the ERP code has one entry point (verified swappable), loading/empty/error states look the same across the order and invoice sections on the reorder page, a broken Claude call surfaces a clear message instead of a crash, and nothing from Days 10–17 is still broken. Everything past that is a bonus, not a requirement — there's no dedicated buffer day left to catch it if it slips.

**Interview note:** this is the single most important day to be able to talk through in detail — it's the concrete engineering behind the "swappable, adapter-pattern backend" line in the pitch, not marketing language. Be ready to walk through what "one entry point" actually means in the code and why that's what makes swapping ERPs a one-file change instead of a rewrite. The honest framing depends on whether the second adapter actually gets built: if it does, say "we designed it to be swappable and proved it with a second working implementation." If it doesn't, say "we designed it to be swappable but only validated that with one implementation" — don't claim the proof if only the design exists. Separately, if the Path to Production list gets written: have it memorized, not just documented — real auth, rate limits, credit checks, volume-tier/negotiated-rate pricing, branch/account hierarchies — and credit Acrocommerce by name if it comes up, don't let it read as your own competitive research.

---

### Mon Aug 31 — Day 20 — README, demo, deploy, submit

#### **Track A**

1. Help finalize the README content.
2. Help write the demo script.

#### Track B

1. Deploy the app.
2. Click through the live deployed version end to end, confirm it works.

#### Track C

1. Record the demo: account picker changing results, activity log updating live, a forced error, an invoice lookup through the same textbox, and the adapter-swap moment if Day 19's Google Sheets adapter landed.

**Done when:** the app is deployed and working live, the README accurately describes the lean, mock-ERP scope (no manager-approval, no database, no volume-tier pricing claimed), and a recorded demo exists. This is also the literal deadline — nothing here should be something that's only "half-finishable" by end of day; if Day 19's buffer got consumed entirely by bug fixes, ship the honest scoped-down README rather than an inaccurate one.

**Interview note:** this is where the reframe pitch actually gets said out loud for the first time in front of an audience — *"we built an AI ordering agent with a swappable, adapter-pattern backend, currently running against a mock ERP."* Say it exactly like that, not "we built an ERP connector." See §6 below for the personal-contribution lines and the full honest-gaps list to have ready regardless of which day an interviewer asks about.

---

## 5. Interview prep — the honest version, in one place

Pull from this section whenever a question comes up that isn't specific to one day. The per-day interview notes above cover the reasoning behind individual decisions; this is the whole-project version.

**The scope story, in one sentence:** *"We built an AI ordering agent with a swappable, adapter-pattern backend, currently running against a mock ERP."* Not "an ERP connector" — that implies a live integration you don't have.

**If asked "what did you specifically build" (adapt per track):**

- **Track A:** *"I owned the data layer. I built the fake ERP with realistic failure modes — timeouts, random errors — so the rest of the app had to handle real-world flakiness instead of a happy path. I designed the adapter pattern so the ERP source is swappable behind one interface, added tagged caching with on-demand invalidation for stock and pricing, and built the retry logic for failed lookups."*

- **Track B and Track C:** write your own version of this in the same shape — one sentence on the specific piece you owned, one or two concrete technical decisions, no vague "worked on the UI" language. Do this before Day 20, not during the interview.

**The full honest-gaps list — have this ready, don't wait to be asked:**

1. **No real database.** `data/*.json` files, not a database — no transactions, no concurrency guarantees. Two orders written at nearly the same instant could race on the same file write. Fine for a demo, a real problem at any real scale.
2. **No stock decrement / reservation logic.** Placing an order doesn't actually reduce `physicalStock` anywhere — there's no reservation ledger at all in this version. Two buyers really could both "successfully" order the last unit of something, since nothing tracks that a unit was claimed. This is a direct, known simplification, not a hidden bug — say so if asked how oversells are prevented, because right now they aren't.
3. **No manager-approval workflow.** The only human-in-the-loop step is the buyer confirming their own parsed order before it's placed — there's no second reviewer, no audit trail of AI/human disagreements. If the human-in-the-loop research brief comes up, this is the honest tension to name: a single confirmation point risks becoming what that literature calls a "rubber stamp" rather than a real check, and this project doesn't yet have the second layer that would address that.
4. **No real authentication.** The account picker is a stand-in for login, documented as such, single-session only.
5. **Pricing is a flat contract-account discount**, not volume-tier or negotiated rates — a deliberate scope cut, not a missing feature (see §1).
6. **Simulated staleness, not real staleness.** The mock ERP responds in under two seconds; the "stock as of [time]" indicator is solving a real architectural problem (cache correctness) but demonstrating it against an artificially fast backend, not a genuinely slow one.
7. **Prices are plain JS numbers, not a decimal type.** Fine at demo scale; a real system doing repeated discount math at volume would want `Decimal`/integer-cents to avoid floating-point rounding drift.

**On the archived Prisma/manager-approval design, if it comes up:** it was an earlier, more ambitious draft that got deliberately scoped down given the timeline — describe it that way if asked, don't imply it's what's running. If someone asks "would a real version need an audit trail and approval workflow," that draft is exactly the right thing to describe as the answer — just be clear it's a description of future direction, not a summary of the current build.

---

## 6. Still open

1. Where the ERP-tools / human-in-the-loop research briefs actually fit — provisionally Day 19, needs confirmation.
2. Whether Days 7–10 (§4) actually hold to their new spread-out schedule — if Day 8's route-handler wiring slips past Thursday's check-in, that's a real risk carried into Day 11, not just a check-in footnote.
3. Whether the team is comfortable with Day 19's buffer day disappearing as a standalone day (folded into Day 18, §3/§4) as the cost of spreading Days 7–10 out — flagged here explicitly since it's the main trade-off this change introduced.
4. **New:** what Claude should do when it can't confidently tell whether pasted text is a new order, an order-history request, or an invoice/PO lookup. Needs a clarifying-question fallback ("I'm not sure if you want to place an order or look up an invoice — can you clarify?") rather than a silent guess — not yet assigned to a specific day.