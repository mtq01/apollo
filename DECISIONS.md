<!-- track technical decision here, explain what/why you did something

- add a TODO if you think of a feature that should be added down the line
- add a DECISION when you make a judgement call.

- not required everyday, just days you made a judgement call, or something technical
write it in the following format:
 -->

## August 6, 2026 - Track B

- [ ] **TODO**: Add optional "type"/"category" field to `ActivityEvent` + filter UI for the log. This allows us to filter the _Activity Log_ by event type (errors, orders, stock checks, etc.) instead of just showing everything at once. Great for debugging and demo clarity.

## August 11, 2026 - Track A

- [x] **DECISION**: Moved _ActivityEvent_ to `types.ts` bcuz its shared between _Track A_ which produces events and _Track B_ which renders them. This avoids duplicate/drifting type definintions.
- [x] **DECISION**: Thought about adding a private `isSameWarehouse` helper in `accountRulesUpdate.ts` so we don't repeat `account.warehouse === product.warehouse` in both `seeStock` and `accessWarehouse`. Decided not to. It's only used 3 times, so the helper would add more complexity than it saves. Can revisit if this logic changes or gets used more.
- [x] **DECISION**: `AccountProductParams` (the shared `{ account, product }` shape used by `calculatePrice`, `seeStock`, and `accessWarehouse`) is now one interface instead of three copies of the same thing, and it lives in `types.ts` so `productQuote.ts` can reuse it too instead of writing its own version.
- [x] **DECISION**: `getQuoteForProduct` now builds an `events: ActivityEvent[]` array using a local `addEvent(message)` helper, instead of writing the full `{ id, message, timestamp }` object every time. IDs are just a simple counter for now (`event-1`, `event-2`...), which is fine since each quote gets its own fresh array. Per the decision above, this will need `crypto.randomUUID()` once events get combined into one shared log (Week 2 Day 8).
- [ ] **TODO**: `getQuoteForProduct` doesn't log anything when stock is hidden due to role (`canSeeStock === false`). It just skips silently. Should probably add a "stock hidden: not visible to this account" event, since Track C will eventually need to explain why a field is missing, not just that it's missing.
- [x] **TODO**: When `getERPStock()` throws a timeout, any events collected so far (like "Price Calculated") get lost, since the function just throws a plain error with no events attached. Worth fixing once we redesign error handling (maybe a custom error class that carries the events). Skipped today to stay focused on Day 6's actual task.
- [ ] **TODO**: The _counter_ inside `productQuote.ts` will need to change to a fully unique ID using `crypto.randomUUID()` around _Week 2 - Day 8_. This is bcuz we plan to have one activity log showing everything across all products and events, and we _MUST_ have unique IDs for that or React will throw errors and render wrong due to duplicates.

## August 12, 2026 - Track A

- [ ] **TODO**: `getERPStock` doesn't actually look up stock per product yet, it just returns a random number no matter which SKU asked. Right now every product in one test run can get completely unrelated stock values. Should add a SKU/product parameter so stock is at least consistently tied to the product being checked.
- [x] **DECISION**: `account.warehouse` represents the buyer's delivery region, not a warehouse they belong to. `product.warehouse` represents where that product ships from. Visibility rules compare the two to determine whether a product is actually available to that buyer's region.
- [X]**DECISION**: Renamed `UserContext`'s `warehouse` field to `assignedWarehouse`. Originally called `warehouse`, which wrongly implied the account owned or worked at a warehouse. Briefly tried `location`, but that was too vague and could be mistaken for a physical address. `assignedWarehouse` accurately describes what it actually is: the one specific warehouse a buyer's account is tied to for stock/warehouse visibility.
- [x] **DECISION**: This is a direct 1:1 match, not "nearest warehouse" or a region-based lookup. A buyer only sees stock/warehouse info for products whose `warehouse` field exactly matches their `assignedWarehouse` — no distance or routing logic exists or is planned.
- [ ] **TODO**: If real regional routing is ever needed (e.g. "show nearest warehouse with stock", multiple warehouses per account), the data model and comparison logic here would need to change — currently it's a flat equality check.

## August 20, 2026 - Track A

- [x] **DECISION**: `getQuoteForProduct` no longer throws when the stock check fails. It now always returns normally, with everything it already worked out (price, sku, leadTime, warehouse, events, calculatedAt) still included. This closes the Aug 11 TODO about events getting lost on a timeout, and goes further, price/sku/leadTime/warehouse were being lost too, not just events.
- [x] **DECISION**: Added a `stockError` field to the return value, populated only when the stock check fails. Reused the existing `ErrorType` from `types.ts` instead of making a new local type, so Track A and Track C stay on the same vocabulary for error reasons.
- [x] **DECISION**: `stock` (and `stockLastUpdated`) can now be a number, `"hidden"`, or `"error"`. Before, a role-based hide and an actual failure could both look the same to the caller. Now they can't be confused.
- [x] **DECISION**: Removed `StockCheckError`, since nothing throws it anymore. Checked the rest of the codebase first to confirm nothing else imported or caught it.
- [x] **DECISION**: `addEvent` now requires a `category` (`"price"`, `"stock"`, or `"access"`), using the `ActivityCategory` type that already existed in `types.ts` but wasn't being used yet. Partially covers the Aug 6 Track B TODO about filtering the activity log, Track A's events are now taggable, Track B still needs to build the actual filter UI.
- [x] **DECISION**: Role-hidden stock is tagged `category: "access"`, not `"stock"`. Nothing failed in that case, the user just isn't allowed to see it, so it shouldn't look like an error in the log.
- [ ] **TODO**: The failure-reason mapping (`mapStockErrorToReason`) currently reads the exact wording of the error message from `getERPStock` (e.g. checks if the message includes "timed out"). Works today since `mockERP.ts` only throws two distinguishable messages, but it's fragile, if that wording changes later, this silently breaks. Should move to custom error classes or error codes in `mockERP.ts` instead of matching on text.
- [ ] **TODO**: Right now there's no way to tell apart "the buyer's pasted text never matched any product at all" from "a real product was found but its stock check failed." Only the second case is handled by `getQuoteForProduct`. The first case depends on Track C's fuzzy-match work, which doesn't exist yet. Proposed a `LineItemResult` type for this (matched vs unmatched), not added yet, blocked on Track C's matching landing and a decision on whether `QuoteResult` should move into `types.ts`.
