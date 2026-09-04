<!--
Track technical decisions here. Explain what you did and why.

- Add a TODO when you think of something that should be done later.
- Add a DECISION when you make a judgment call.
- Not needed every day. Just the days you made a real call or did something
  technical worth writing down.

Format: a checkbox, a bold label, then plain text.
-->

## August 6, 2026 - Track B

- [ ] **TODO**: Add an optional "type" or "category" field to `ActivityEvent`, plus a filter in the activity log UI. Right now the log shows everything at once. Being able to filter by event type (errors, orders, stock checks) would help with debugging and demos.

## August 11, 2026 - Track A

- [x] **DECISION**: Moved `ActivityEvent` into `types.ts`. Track A produces events and Track B renders them, so the type is shared. Keeping one copy avoids two definitions that drift apart.
- [x] **DECISION**: Thought about a private `isSameWarehouse` helper so `seeStock` and `accessWarehouse` do not both repeat `account.warehouse === product.warehouse`. Decided not to. It is only used three times, so the helper adds more to read than it saves. Revisit if this logic changes or gets used more.
- [x] **DECISION**: `AccountProductParams` (the shared `{ account, product }` shape used by `calculatePrice`, `seeStock`, and `accessWarehouse`) is now one interface in `types.ts` instead of three copies. `productQuote.ts` reuses it too.
- [x] **DECISION**: `getQuoteForProduct` builds its `events` array with a small local `addEvent(message)` helper instead of writing the full `{ id, message, timestamp }` object every time. IDs are a simple counter for now (`event-1`, `event-2`), which is fine while each quote has its own fresh array. This will need `crypto.randomUUID()` once all events go into one shared log.
- [x] **TODO**: `getQuoteForProduct` did not log anything when stock was hidden by role. It just skipped. Added a "Stock Hidden" event with `category: "access"` so a later step can explain why a field is missing, not just that it is. Done in `productQuote.ts`.
- [x] **TODO**: When `getERPStock()` timed out, any events gathered so far (like "Price Calculated") were lost, because the function threw a plain error with no events attached. Worth fixing when we redesign error handling. Skipped for now. (Later fixed by the Aug 18 change below.)
- [x] **TODO**: The counter in `productQuote.ts` needs to become a real unique id using `crypto.randomUUID()` once there is one shared activity log. Duplicate ids would make React render the list wrong. Done. `addEvent` uses `randomUUID()`.

## August 12, 2026 - Track A

- [x] **TODO**: `getERPStock` returned a random number no matter which SKU was asked for, so products in one run got unrelated stock values. Added a SKU parameter so stock is at least tied to the product. Done. `getERPStock(sku, forceFailure?)` now takes the SKU.
- [x] **DECISION**: `account.warehouse` means the buyer's delivery region, not a warehouse they work at. `product.warehouse` means where that product ships from. The visibility rules compare the two.
- [x] **DECISION**: Renamed `UserContext.warehouse` to `assignedWarehouse`. The old name wrongly suggested the account owned or worked at a warehouse. Tried `location`, but that was too vague and sounded like a street address. `assignedWarehouse` says what it is: the one warehouse the account is tied to for stock and warehouse visibility.
- [x] **DECISION**: This is a direct one to one match, not a "nearest warehouse" lookup. A buyer only sees stock and warehouse info for products whose `warehouse` exactly equals their `assignedWarehouse`. There is no distance or routing logic and none is planned.
- [ ] **TODO**: If real regional routing is ever needed (nearest warehouse with stock, multiple warehouses per account), the data model and this comparison would need to change. Right now it is a flat equality check.

## August 18, 2026 - Track A

- [x] **DECISION**: `getQuoteForProduct` no longer throws when the stock check fails. It always returns normally with everything it already worked out (price, sku, lead time, warehouse, events, calculatedAt). This fixes the Aug 11 problem where events were lost on a timeout, and it also stopped losing price, sku, lead time, and warehouse.
- [x] **DECISION**: Added a `stockError` field, filled in only when the stock check fails. Reused the existing `ErrorType` from `types.ts` so every part of the app talks about errors the same way.
- [x] **DECISION**: `stock` and `stockLastUpdated` can now be a number, `"hidden"`, or `"error"`. Before, a role based hide and a real failure looked the same to the caller. Now they do not.
- [x] **DECISION**: Removed `StockCheckError`. Nothing throws it anymore. Checked the rest of the code first to be sure nothing imported or caught it.
- [x] **DECISION**: `addEvent` now requires a `category` (`"price"`, `"stock"`, or `"access"`), using the `ActivityCategory` type that already existed. This is part of the Aug 6 TODO about filtering the log. The events are taggable now. The filter UI still needs building.
- [x] **DECISION**: Stock hidden by role is tagged `category: "access"`, not `"stock"`. Nothing failed. The buyer just is not allowed to see it, so it should not look like an error in the log.
- [ ] **TODO**: `mapStockErrorToReason` reads the exact wording of the error message from `getERPStock` (it checks if the message includes "timed out"). This works while `mockERP.ts` throws only two distinct messages, but it breaks silently the first time that wording changes. Move to error codes or custom error classes in `mockERP.ts` instead.
- [x] **TODO**: There was no way to tell "the buyer's text never matched any product" from "a real product was found but its stock check failed." Proposed a `LineItemResult` type (matched vs unmatched). Done on Day 11. `LineItemResult` is live in `route.ts`, and `QuoteResult` already lives in `types.ts`.

## August 19, 2026 - Architecture review (whole team)

> From a review of the code and git history, asking how we would do this at a professional level. Sorted into what is worth doing before the deadline and what we are choosing to defer.

- [ ] **TODO**: Define a real `ERPAdapter` interface (for example `getStock(sku): Promise<{ stock, lastUpdated }>`) that `mockERP.ts` implements, instead of `productQuote.ts` importing `getERPStock` directly. Right now "swappable backend" is true in spirit, but nothing in the types enforces it, so a second backend could quietly not match. This is the cheapest, highest value item on the list.
- [ ] **TODO**: `forceFailure` lives on the same public `/api/quote` request schema real orders use, so any caller can force a failure. Move it behind a dev only path or env check before deploy.
- [ ] **TODO**: Check for required env vars (`ANTHROPIC_API_KEY`) once at startup instead of failing wherever the Anthropic client first runs. Zod, which we already use, works for this.
- [ ] **TODO**: Add a GitHub Action that runs lint and typecheck on every PR, and require it to pass before merging into `staging`. Does not need real tests first.
- [x] **DECISION**: Thought about a permission table (role, capability, condition) to replace the switch statements in `seeStock` and `accessWarehouse`, which repeat the same `assignedWarehouse` check for manager and buyer. Decided not to now. It is real duplication but small (three roles, two functions), and not worth the time this close to the deadline. Revisit if we add more roles or the rule stops being a flat equality check.
- [x] **DECISION**: `addOrder()` in `order.ts` reads the file, changes it, and writes it back with no lock. Two orders at the same instant could overwrite each other. Accepting this for demo scope. We will not hit real concurrent traffic before the deadline.
- [x] **DECISION**: Thought about splitting the buyer facing activity log from internal debug logging. Right now `ActivityEvent` is both. Decided against it. It would touch every file that logs an event, and better internal debugging does not matter much for a demo. Revisit if this ever runs against a real ERP.

## August 20, 2026 - Track B

> Wiring Track C's parser into `/api/quote`, plus a forced failure menu on the reorder page. Track A's Aug 18 change (return instead of throw) landed mid day and changed what the route had to do.

**What the route sends back, per line item**

- [x] **DECISION**: Three outcomes, three row shapes, decided in `app/api/quote/route.ts`. The page renders whatever it is given. It does not decide what to hide.
  1. **Quoted**: full row with `sku`, `name`, `price`, `stock` (a number or `"hidden"`), `stockLastUpdated`, `leadTime`, `warehouse`, `events`, `calculatedAt`, `quantity`.
  2. **Stock check timed out**: the same full row. The ERP just did not answer in time, so price, lead time, and warehouse are all still correct. `stock` is `"error"` and `stockError.type` is `"timeout"`.
  3. **Not found** (the catalog has no match, or the ERP has no record): only `name` (set to the buyer's raw text), `quantity`, `stock`, `stockError`, and `events`. No `sku`, `price`, `leadTime`, or `warehouse`.
- [x] **DECISION**: Not found rows put the buyer's raw text in `name`, not a product name. If we cannot confirm the item exists, saying "Wireless Mouse" claims more than we know. The raw text also shows the buyer exactly which line failed.
- [x] **DECISION**: Those fields are left out at the route, not blanked in the page. Sending a price we have decided not to show is dead weight and invites some future component to render it. We tried the blank it in the page version first and removed it.
- [x] **DECISION**: A stock timeout keeps everything. A not found keeps nothing. A price next to "we could not find this" contradicts itself. A price next to "stock check timed out" does not.
- [x] **DECISION**: Not found rows still carry `events`, so the activity log shows what happened before the ERP call (price calculated, both retries failing). Those events are useful for debugging even when the row is mostly empty.

**Unmatched items are shown, not dropped**

- [x] **DECISION**: When `lookupProduct` finds no match, the line still produces a row. Before, it hit `continue` and vanished, so a buyer who pasted three items got two back with no idea which one was missing. Backed by NN/g's error message guidance: keep the user's input, never fail silently, offer the fix.

**Page changes**

- [x] **DECISION**: `QuoteRow` makes `sku`, `price`, `leadTime`, `warehouse`, `calculatedAt`, and `events` optional. `name`, `quantity`, and `stock` stay required. An incomplete row is a normal row, and every column already falls back to a dash.
- [x] **DECISION**: The Stock column reads `stockError.message` when `stock === "error"`. Before Track A's change the error object was in `stock` itself, so the old code read `row.stock.message` and rendered nothing once `stock` became the string `"error"`.
- [x] **DECISION**: Table rows are keyed by array index, not `row.sku`. Not found rows have no sku, so two of them in one order collided on `key={undefined}`.
- [x] **DECISION**: The activity log markup moved out of the page and into the `DisplayActivity` component, which had been written on Day 4 and never used.

**Forced failure menu**

- [x] **DECISION**: A dropdown on the reorder page sends an optional `forceFailure` (`"timeout"` or `"not found"`) with the quote request, using Track A's existing `forceFailure` parameter. Both failures can now be demoed on demand instead of waiting for the random 15% timeout.
- [x] **DECISION**: `forceFailure` is passed as an argument to `getCachedQuote`, not read from an outer variable, so it is part of the cache key. Otherwise a cached success would replay and the menu would look broken.
- [x] **DECISION**: `null` is turned into `undefined` before the request is sent. `JSON.stringify` drops `undefined` keys but sends `null`, and `null` fails the `z.enum` check.

**Request validation**

- [x] **DECISION**: The request body is checked with a Zod schema (`text`, `accountId`, optional `forceFailure`) instead of hand written `if` checks. `safeParse` never throws, so it fits the guard clause style the route already uses.
- [x] **DECISION**: Any problem with `accountId` reports "Please log in", no matter which check failed, so Zod's internal wording never reaches a buyer. Text errors keep their specific messages, because "too long" and "empty" need different fixes.
- [x] **DECISION**: Error objects use `satisfies ErrorType`, not `as ErrorType`. `satisfies` checks the object. `as` silences the check. A `type: "parse failed"` typo was live in this file until the annotation caught it.

**Things this turned up**

- [ ] **TODO**: The Stock column prints `stockError.message` straight from Track A, which is internal wording ("Product not found in ERP system."). Map `stockError.type` to buyer facing copy in the page instead.
- [x] **TODO**: The catalog miss and the ERP not found were both `type: "not found"`, told apart only by which field carried them. Fixed on Day 11. `status: "unmatched"` on `LineItemResult` is the catalog miss. A `stockError` on a matched row is the ERP miss.
- [ ] **TODO**: The parser drops items when a quantity trails the product name. `"2 mouses, 2 lanterns"` returns two items. `"mouse 2, page 2"` returns one item named "mouse" and loses "page". Trailing numbers read as model numbers, not quantities. Look at the tool description in `recordItemsTool.ts`.
- [x] **TODO**: `parseOrder` runs on every request and is not cached, so it dominates request time now that the ERP calls are cached. Same text plus same account should parse the same way. Half done on Day 11. `temperature: 0` makes the parse deterministic. The caching and performance half is still open.
- [x] **TODO**: `lookupProduct` only matched by substring, so "wireless mice" did not find "Wireless Mouse". Fixed on Day 11. `lookupProduct` is unchanged, but a miss now falls through to `findClosestMatches`, so "wireless mice" comes back as a suggestion instead of a dead end.

## August 26, 2026 - Track C

> Interface contract for Track A's Day 11 fuzzy match helper, worked out before Track A built it so the signature is right the first time. Resolves the Aug 18 and Aug 20 notes about catalog miss vs ERP miss.

- [x] **DECISION**: The fuzzy match helper imports `catalog.json` itself instead of taking the catalog as an argument, the same pattern `lookupProduct` uses. The call site stays a one argument function, `findClosestMatches(query)`.
- [x] **DECISION**: The helper returns matches shaped as `{ product: Product; score: number }[]`, not `Product[]` with a score bolted on. A suggestion has to be something the buyer can actually select, so it needs the full `Product` (for the sku). Wrapping it in `{ product, score }` keeps `Product` a clean data type and shows the score belongs to the match, not the product.
- [x] **DECISION**: The "too different, suggest nothing" cutoff is applied inside the helper, before it returns anything. The caller never checks the score. "Close enough" is decided once, in one place. The score still comes back on each match, as extra information, not as a threshold the caller has to apply.
- [x] **DECISION**: Track C owns a new function (in `lib/agent/`) that calls the helper and produces suggestions plus buyer facing text. Track B wires that into the "not found" branch of `route.ts`. Same split as `parseOrder`: Track C writes the function, Track B wires it, nobody edits `route.ts` from another track.
- [x] **DECISION**: Suggestions are a new optional field on `LineItemResult`'s `unmatched` variant, not on the shared `ErrorType`. `ErrorType` is used app wide (timeout, restricted, invalid input), and suggestions never matter for those. Putting the field on `unmatched` keeps it where it is the only case that uses it.
- [x] **DECISION**: `LineItemResult` replaces the inline "not found" logic in `route.ts` and the shared `type: "not found"` that used to cover both a catalog miss and an ERP miss. `status: "unmatched"` now means "no catalog match", the only case fuzzy suggestions should fire for. A matched quote that carries a `stockError` (an ERP timeout) never gets suggestions, because the product was real, just not checkable.

## August 26, 2026 - Track A and Track C (Day 11 build)

> What got decided while building the fuzzy match feature, on top of the contract above.

- [x] **DECISION**: Changed the catalog SKUs from `SKU-1001` through `SKU-1008` to codes like `PER-2284`, `ACC-3391`, `DSP-7742` (a different prefix per category, random looking numbers). The old SKUs only differed by their last digit, so every product was one typo away from every other product, and fuzzy matching could not tell them apart. `data/order-history.json` was updated to match, so old fake orders still point at real products.
- [x] **DECISION**: Used the `fastest-levenshtein` library to measure how different two strings are. Picked it over `leven` (which only supports import styles that cause issues here) and `fuzzysort` (built for search ranking, its scores do not compare fairly between a product name and a SKU).
- [x] **DECISION**: The helper checks the buyer's text against each word in a product name, not the whole name at once. A short typo like "kabord" compared against the full name "Mechanical Keyboard" looks very different, mostly because of the extra word "Mechanical". Checking word by word lets a one word typo match the one word it is close to.
- [x] **DECISION**: The cutoff (how different a guess can be before we stop suggesting it) started at 30% of the typed text's length. Testing showed that was too strict. "kabord" for "keyboard" was rejected. Raised it to 40% and re tested every typo case plus a nonsense input ("banana") to be sure it did not start showing bad guesses.
- [x] **DECISION**: Set `temperature: 0` on the Claude call in `parseOrder.ts`. Without it, Claude could read the same typo differently across identical requests. Sometimes it silently fixed it to the real product name before our code saw it, sometimes not. `temperature: 0` makes it answer the same way every time.
- [x] **DECISION**: Changed `tool_choice` from `"auto"` to `"any"` on the same call. Claude could sometimes respond without calling either tool, which `parseOrder.ts` had no handling for. `"any"` forces it to always call one of the two tools.

## August 27, 2026 - Open for the team (raised by Track A)

> Found while reviewing the Day 11 build. Not a bug in the fuzzy match work. A question about how much the parse step should change on the buyer's behalf. Nothing was changed in code.

- [ ] **TODO**: Claude silently corrects misspelled product names and the buyer is never told. `record_items` rewrites an obvious typo into a real product name before our code sees it. On the running app:

  ```
  "2 wireless mise"  ->  productGuess.name: "wireless mouse"   exact match, full priced quote
  "2 wireless mice"  ->  productGuess.name: "wireless mice"    no match, falls through to suggestions
  ```

  The first one returns a finished quote for Wireless Mouse x2 with no sign the buyer's words were changed. A quote commits real money to a product they did not type. A correction should show as "did you mean", not a silent swap. Note that `temperature: 0` does not fix this. It made the correction consistent, not visible.

- [ ] **TODO**: `confidence` cannot carry this signal, so a new field is needed. `confidence` grades how many attributes the buyer gave, not whether Claude changed their words. Measured:

  ```
  "2 wireless mise"   (corrected)     confidence: medium
  "2 wireless mouse"  (clean input)   confidence: low
  ```

  The corrected input scored higher than the clean one. The `note` field does contain the fact, but as free text, so branching on it means string matching for the word "misspelling", which breaks the first time Claude words it differently. Proposed: a `correctedFrom: string | null` on each item in `recordItemsTool.ts`, holding the buyer's original wording when Claude changed it, null when it did not.

- [ ] **TODO**: Open UX call, hard or soft. Hard: a corrected item becomes an unmatched row the buyer has to confirm, like a fuzzy miss. Safest, but typos are the normal case, so every one is an extra click. Soft: still quote it, but mark the row ("Wireless Mouse, you typed 'mise'"). Soft fits today because this screen produces a quote, not an order. That flips to hard if this screen ever places the order directly.

- [ ] **TODO**: A correctly spelled word can fail where a typo succeeds. "wireless mice" is valid English, so Claude leaves it alone, and `lookupProduct` handles plurals with `.replace(/s$/, "")`, which does nothing for mice and mouse. So the misspelled input gets a clean quote and the correct one gets a "did you mean". Same for boxes and box, knives and knife. Either match on `productGuess.attributes` alongside the name, or accept it and let the fuzzy suggestion handle it.

## September 2 to 3, 2026 - The reorder cart

> Built the "add to cart" flow. Before this, a lookup gave a one time quote and that was the end of it. Now results go into a cart the buyer builds up, edits, and places as one order.

**The shared pricing function**

- [x] **DECISION**: Pulled the per item pricing loop out of `app/api/quote/route.ts` into one shared function, `priceItems(account, items, forceFailure)` in `lib/erp/priceItems.ts`. It takes each item, resolves it against the catalog, and builds a priced row (or an unmatched row with suggestions). The text path and the new deterministic path both call it, so the response shape stays the same for both.
- [x] **DECISION**: Added `POST /api/quote/items`. It takes `{ accountId, items: [{ sku, quantity }], forceFailure? }` and calls `priceItems` directly. A caller that already knows the SKUs (a past order, a typed code) has nothing to parse, so this skips `parseOrder` and Claude. It is faster, cheaper, and gives the same answer every time.

**The paste box now feeds a cart**

- [x] **DECISION**: The reorder page has one text box, not a separate "add by SKU" field. An earlier attempt added a dedicated SKU field. It was redundant with the paste box, which already accepts SKUs. One entry point.
- [x] **DECISION**: If the whole pasted text is only product codes (a regex check in `parseSkuList`), the request goes to `/api/quote/items` and skips Claude. Anything with real words still goes through `/api/quote`. Codes that start with `inv-`, `order-`, or `po-` are left out of that check so a PO lookup still goes through Claude.
- [x] **DECISION**: The lookup result is the editable draft. There is no separate "add to cart" step and no floating cart panel. Considered a persistent cart that accumulates across many searches. Chose the simpler model: results drop straight into one draft ("Your Cart") that the buyer edits in place. A pasted list adds to the same draft rather than replacing it.
- [x] **DECISION**: Matched rows (real sku, real name, a numeric price) go into the cart. Everything else goes into a "Couldn't add these" list below, with its "did you mean" suggestions. Picking a suggestion adds it to the cart.

**The cart itself**

- [x] **DECISION**: The cart lives in React Context (`DraftOrderProvider`), in memory. It is not a server side cart. It is lost on a page refresh. This is the demo scoped choice. A real cart would be server backed. `localStorage` is the middle option if losing it on refresh becomes annoying.
- [x] **DECISION**: The context lives in `DraftOrderContext.tsx`, separate from the `DraftOrder` component, so the paste box and the orders page can both add to the same cart without prop drilling through the layout.
- [x] **DECISION**: `addLines` merges by sku. Adding a sku that is already in the cart adds the new quantity onto the existing row instead of making a second row. On a merge, the existing row keeps its original source and sourceRef. This can slightly misrepresent a merged row (part of its quantity may have come from a different place), but the collision is rare and low stakes.
- [x] **DECISION**: The cart re prices itself on every change (add, remove, quantity edit), debounced by 500ms, by calling `/api/quote/items` with the whole cart. Price is never stored on a cart line. The numbers on screen always match the current catalog and account. Quantity edits below 1 are clamped to 1.

**Price breakdown**

- [x] **DECISION**: The cart and the order cards both show Sub Total, Discount, Tax, Total, and Internal Cost. `priceItems` now returns `listPrice` (before discount) and `internalCost` per row so these can be worked out. Discount is `listPrice - price` times quantity. Tax is 7%, the same rate the invoice card uses, applied after the discount.
- [x] **DECISION**: Added `internalCost` to the catalog (`Product.internalCost?`, about 60% of `basePrice`). It is admin only, the same rule `visibleInvoice()` uses for invoices. The API sends the number for admin accounts and the string `"hidden"` for everyone else, and the UI shows "Restricted" when it is hidden.

**PO lookups**

- [x] **DECISION**: Typing a PO number like `inv-1001` no longer shows an invoice card. It drops that order's line items straight into the cart, the same as reordering a past order. Removed the invoice card and the code that supported it (the tax math, `formatInvoiceDate`, the `Results` union). The invoice lookup on the backend is unchanged.

**Orders page**

- [x] **DECISION**: Added a page at `/orders` and an "Orders" item in the sidebar. Listing every past order is a basic action and should not need the buyer to phrase a sentence for Claude. The paste box still handles the fuzzy queries and a specific PO number.
- [x] **DECISION**: `GET /api/orders` lists the account's past orders with product names and prices filled in (via `calculatePrice`). Each order is a card. Each line has a checkbox (checked by default, disabled for a discontinued sku) and an editable quantity. "Add selected to your order" puts the ticked lines into the cart.
- [x] **DECISION**: Used a native `<input type="checkbox">` on the orders page. `components/ui/checkbox.tsx` was removed in the earlier dashboard cleanup, and re adding it was not worth it for one checkbox column.
- [x] **DECISION**: `POST /api/orders` places the order. It checks every sku is real against the catalog, then calls `addOrder` with a generated `order-<uuid>` id and a timestamp.

**Forced failures in the cart**

- [x] **DECISION**: The demo "Force Failure" dropdown value is now passed into the cart's re price request, not just the first paste. Before, a forced timeout entered the cart with a price and then re priced cleanly, so the error never showed. `DraftOrder` takes `forceFailure` as a prop and sends it on every re price.
- [x] **DECISION**: `priceItems`'s "not found" row now keeps its `sku`. The catalog match succeeded, only the ERP stock check failed, so the row is a known product with no stock info. Keeping the sku lets the cart still show the row and its error. This narrows the Aug 20 "not found keeps nothing" rule to the deterministic path.
- [x] **DECISION**: Brought back the two alert banners above the cart table. A red banner names the first failed line, or the orange "stock may be a few hours old" reminder shows when nothing failed.

**Source tags and confirmation**

- [x] **DECISION**: A cart line added from a PO or a past order shows a small green tag under the sku, like "from inv-1001" or "from order-3". A line from a suggestion shows "suggested". Typed and pasted lines show nothing. `DraftLine` gained a `sourceRef` field for this.
- [x] **DECISION**: A `sonner` toast confirms each add ("Added 3 items from inv-1001"). The orders page keeps its inline confirmation with a link back to the reorder page, since the buyer needs to navigate off that page.

**Cleanup and readability**

- [x] **DECISION**: Removed unused debug routes: `ping`, `lookup`, `stock`, `price`, `test`, `track-a-test`, and the `testt.ts` scratch file. They were one line "it works" stubs and dev scratch.
- [x] **DECISION**: Merged `useIsMobile` and `useIsBelowLg` onto one `useSyncExternalStore` helper in `hooks/use-mobile.ts`. This also removed the `set-state-in-effect` lint warning the stock `useIsMobile` had.
- [x] **DECISION**: Rewrote comments across the cart, activity log, and orders code in plain language, and renamed short variable names to descriptive ones.

**Still open**

- [ ] **TODO**: The cart is in memory only. Add `localStorage` or a server cart if losing it on refresh is a problem.
- [ ] **TODO**: If a PO has a sku that has left the catalog, the line is still added to the cart but will not price. There is no warning for this yet.
- [ ] **TODO**: "Place order" only writes to `order-history.json`. Since a PO lookup now reads from `invoices.json`, an order you place cannot be looked up by its PO number afterward, and it loses its prices. Consider writing an invoice too, with the same id. That would need a `tax` field on the `Invoice` type and a rule for `restrictedFields`.
- [ ] **TODO**: **Related quirk worth deciding at the same time: a correctly spelled word can fail where a typo succeeds.** `"wireless mice"` is valid English - the plural of mouse - so Claude leaves it alone, and `lookupProduct` handles plurals with `.replace(/s$/, "")`, which does nothing for mice/mouse. So the misspelled input gets a clean quote and the correctly spelled one gets a "did you mean". Same applies to boxes/box, knives/knife, feet/foot. Either match on `productGuess.attributes` alongside the name, or accept it and let the fuzzy suggestion handle it.

## September 3, 2026 - Orders and invoices are one thing now

> Placing an order used to write a bare `{ id, items: [{sku, quantity}], timestamp }` row to `order-history.json`. The orders page then priced every line again on each load. So the totals shown were never the totals the buyer agreed to, they were recomputed against whatever the catalog said today. This merges the two.

- [x] **DECISION**: `POST /api/orders` now prices the whole order once and saves a full `Invoice` to `invoices.json`. The invoice stores per line `listPrice`, `price`, and `internalCost`, plus order level `subtotal`, `discount`, `tax`, `totalAmount`, and `internalCost`. Readers display these stored numbers and never price anything.
- [x] **DECISION**: All the money math lives in one new file, `lib/erp/summarizeOrder.ts`. It exports `TAX_RATE` and `summarizeOrder(account, items)`. `DraftOrder.tsx` and the orders page import `TAX_RATE` from here instead of each keeping their own `0.07`.
- [x] **DECISION**: New order ids are `inv-1006`, `inv-1007`, and so on. The route reads the current invoices, finds the highest `inv-<number>`, and adds one. A placed order can now be pasted back into the reorder box like any other invoice, because it is one.
- [x] **DECISION**: `order-history.json` and `lib/erp/order.ts` are deleted. Its three functions moved into `lib/erp/invoice.ts` as `getAllInvoices`, `getAccountInvoices`, and `saveInvoice`. The dead `Order` type is removed from `types.ts`.
- [x] **DECISION**: `GET /api/orders` runs each invoice through `visibleInvoice`, the same gate the paste flow already used. Buyers and managers see "Restricted" for discount and internal cost. No second set of role rules.
- [x] **DECISION**: The `get_order_history` tool keeps its name. To a buyer, "my past orders" and "my invoices" are the same list now, and the name reads better in the tool description. It returns invoices.
- [ ] **TODO**: `saveInvoice` does a read then write on `invoices.json` with no lock, so two orders placed at the same instant could clobber each other. Same known limit the old `addOrder` had. Fine for demo scale.
- [ ] **TODO**: A PO line for a sku that has left the catalog still has no warning. `summarizeOrder` throws on an unknown sku, and `POST /api/orders` checks every sku is real before calling it, so a placed order is always clean. But a stored invoice from before a product was pulled would break `visibleInvoice`. Not a live scenario yet.
