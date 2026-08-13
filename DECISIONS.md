<!-- track technical decision here, explain what/why you did something

- add a TODO if you think of a feature that should be added down the line
- add a DECISION when you make a judgement call.

- not required everyday, just days you made a judgement call, or something technical
write it in the following format:
 -->


## August 6, 2026 - Track B

- [ ] **TODO**: Add optional "type"/"category" field to `ActivityEvent` + filter UI for the log. This allows us to filter the _Activity Log_ by event type (errors, orders, stock checks, etc.) instead of just showing everything at once. Great for debugging and demo clarity.

## August 11, 2026 - Track A

- [X] **DECISION**: Moved _ActivityEvent_ to `types.ts` bcuz its shared between _Track A_ which produces events and _Track B_ which renders them. This avoids duplicate/drifting type definintions.
- [X] **DECISION**: Thought about adding a private `isSameWarehouse` helper in `accountRulesUpdate.ts` so we don't repeat `account.warehouse === product.warehouse` in both `seeStock` and `accessWarehouse`. Decided not to. It's only used 3 times, so the helper would add more complexity than it saves. Can revisit if this logic changes or gets used more.
- [X] **DECISION**: `AccountProductParams` (the shared `{ account, product }` shape used by `calculatePrice`, `seeStock`, and `accessWarehouse`) is now one interface instead of three copies of the same thing, and it lives in `types.ts` so `productQuote.ts` can reuse it too instead of writing its own version.
- [X] **DECISION**: `getQuoteForProduct` now builds an `events: ActivityEvent[]` array using a local `addEvent(message)` helper, instead of writing the full `{ id, message, timestamp }` object every time. IDs are just a simple counter for now (`event-1`, `event-2`...), which is fine since each quote gets its own fresh array. Per the decision above, this will need `crypto.randomUUID()` once events get combined into one shared log (Week 2 Day 8).
- [ ] **TODO**: `getQuoteForProduct` doesn't log anything when stock is hidden due to role (`canSeeStock === false`). It just skips silently. Should probably add a "stock hidden: not visible to this account" event, since Track C will eventually need to explain why a field is missing, not just that it's missing.
- [ ] **TODO**: When `getERPStock()` throws a timeout, any events collected so far (like "Price Calculated") get lost, since the function just throws a plain error with no events attached. Worth fixing once we redesign error handling (maybe a custom error class that carries the events). Skipped today to stay focused on Day 6's actual task.
- [ ] **TODO**: The _counter_ inside `productQuote.ts` will need to change to a fully unique ID using `crypto.randomUUID()` around _Week 2 - Day 8_. This is bcuz we plan to have one activity log showing everything across all products and events, and we _MUST_ have unique IDs for that or React will throw errors and render wrong due to duplicates.

## August 12, 2026 - Track A

- [ ] **TODO**: `getERPStock` doesn't actually look up stock per product yet, it just returns a random number no matter which SKU asked. Right now every product in one test run can get completely unrelated stock values. Should add a SKU/product parameter so stock is at least consistently tied to the product being checked.
- [X] **DECISION**: `account.warehouse` represents the buyer's delivery region, not a warehouse they belong to. `product.warehouse` represents where that product ships from. Visibility rules compare the two to determine whether a product is actually available to that buyer's region.
- [X]**DECISION**: Renamed `UserContext`'s `warehouse` field to `assignedWarehouse`. Originally called `warehouse`, which wrongly implied the account owned or worked at a warehouse. Briefly tried `location`, but that was too vague and could be mistaken for a physical address. `assignedWarehouse` accurately describes what it actually is: the one specific warehouse a buyer's account is tied to for stock/warehouse visibility.
- [X] **DECISION**: This is a direct 1:1 match, not "nearest warehouse" or a region-based lookup. A buyer only sees stock/warehouse info for products whose `warehouse` field exactly matches their `assignedWarehouse` — no distance or routing logic exists or is planned.
- [ ] **TODO**: If real regional routing is ever needed (e.g. "show nearest warehouse with stock", multiple warehouses per account), the data model and comparison logic here would need to change — currently it's a flat equality check.