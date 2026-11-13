# Decisions Log

How to use this file:

- **Decisions:** add a row when you make a judgment call. Newest at the bottom.
- **Open TODOs:** add a row for something that should be done later. When it's done, delete the row and add a decision row saying what was done.
- One idea per row, in plain language. When a later decision replaces an earlier one, say so in the earlier row ("Changed 2026-09-03").
- Write `|` inside a cell as `\|`, or the table breaks.

## Decisions

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-08-11 | `ActivityEvent` lives in `types.ts`. | Track A produces events and Track B renders them. One shared copy can't drift apart. |
| 2026-08-11 | No `isSameWarehouse` helper for the `account.assignedWarehouse === product.warehouse` check. | Only three uses, so a helper adds more to read than it saves. Revisit if the rule changes or spreads. |
| 2026-08-11 | `AccountProductParams` (`{ account, product }`) is one interface in `types.ts`, used by `calculatePrice`, `seeStock`, `accessWarehouse` and `productQuote.ts`. | Replaces three copies of the same shape. |
| 2026-08-11 | `getQuoteForProduct` builds its events with a local `addEvent(message, category)` helper. | Avoids writing the full event object every time. |
| 2026-08-11 | Stock hidden by role logs a "Stock Hidden" event with `category: "access"`. | A later step can explain why a field is missing, not just that it is. |
| 2026-08-11 | Event ids use `crypto.randomUUID()`, replacing a per-quote counter (`event-1`, `event-2`). | Duplicate ids in one shared log make React render the list wrong. |
| 2026-08-12 | `getERPStock(sku, forceFailure?)` takes the SKU, and the same SKU always returns the same stock count. | Random stock per call gave products in one run unrelated values. |
| 2026-08-12 | `UserContext.warehouse` is renamed `assignedWarehouse`: the one warehouse an account is tied to (its delivery region). `product.warehouse` is where a product ships from. | The old name suggested the account owned or worked at a warehouse. `location` was too vague and sounded like a street address. |
| 2026-08-12 | Visibility is an exact match: an account sees stock and warehouse info only for products whose `warehouse` equals its `assignedWarehouse`. No nearest-warehouse or routing logic. | Simple and predictable. None is planned. |
| 2026-08-18 | `getQuoteForProduct` never throws on a failed stock check. It returns price, sku, lead time, warehouse, events and `calculatedAt`, plus a `stockError`. | A thrown timeout used to lose everything already worked out, including the log events. |
| 2026-08-18 | `stockError` reuses the shared `ErrorType`. | Every part of the app describes errors the same way. |
| 2026-08-18 | `stock` and `stockLastUpdated` are a number, `"hidden"` or `"error"`. | A role-based hide and a real failure used to look the same to the caller. |
| 2026-08-18 | Removed `StockCheckError`. | Nothing threw it anymore. Checked that nothing imported or caught it first. |
| 2026-08-18 | `addEvent` requires a `category` (`"price"`, `"stock"`, `"access"`, …) using `ActivityCategory`. | Makes events filterable. The filter UI is still an open TODO. |
| 2026-08-18 | Stock hidden by role is tagged `"access"`, not `"stock"`. | Nothing failed, so it shouldn't look like an error in the log. |
| 2026-08-19 | No permission table (role, capability, condition) to replace the switch statements in `seeStock` and `accessWarehouse`. | Real duplication, but small (three roles, two functions). Revisit with more roles or a rule that isn't a flat equality check. |
| 2026-08-19 | Writing the orders file with read-then-write and no lock is accepted. | Demo scope. No real concurrent traffic before the deadline. Still true for `saveInvoice` (see open TODOs). |
| 2026-08-19 | `ActivityEvent` stays both the buyer-facing log and internal debug logging. | Splitting them touches every file that logs. Revisit if this runs against a real ERP. |
| 2026-08-20 | `/api/quote` returns one of three row shapes per line, decided in `route.ts`: (1) quoted: the full row; (2) stock check timed out: the full row with `stock: "error"` and `stockError.type: "timeout"`; (3) not found: only `name`, `quantity`, `stock`, `stockError` and `events`. The page renders what it's given. | A timeout keeps everything because price, lead time and warehouse are still correct. A price next to "we couldn't find this" contradicts itself. Narrowed 2026-09-02. |
| 2026-08-20 | Not-found rows put the buyer's raw text in `name`. | A product name would claim more than we know, and the raw text shows which line failed. |
| 2026-08-20 | Fields a row shouldn't show are left out at the route, not blanked in the page. | Unused data invites a future component to render it. The blank-in-page version was tried and removed. |
| 2026-08-20 | Not-found rows still carry `events`. | The log shows what happened before the ERP call (price calculated, both retries failing). |
| 2026-08-20 | An unmatched line still produces a row instead of being dropped. | A buyer who pasted three items and got two back couldn't tell which was missing. NN/g guidance: keep the input, never fail silently, offer the fix. |
| 2026-08-20 | `QuoteRow` makes `sku`, `price`, `leadTime`, `warehouse`, `calculatedAt` and `events` optional. `name`, `quantity` and `stock` stay required. | An incomplete row is a normal row, and every column already falls back to a dash. |
| 2026-08-20 | The Stock column reads `stockError` when `stock === "error"`. | After the 2026-08-18 change, the old `row.stock.message` rendered nothing. |
| 2026-08-20 | Table rows are keyed by array index, not `sku`. | Not-found rows have no sku, so two of them collided on `key={undefined}`. |
| 2026-08-20 | The activity log markup moved into the `DisplayActivity` component. | It was written on Day 4 and never used. |
| 2026-08-20 | A demo dropdown on the reorder page sends an optional `forceFailure` (`"timeout"` or `"not found"`). | Both failures can be shown on demand instead of waiting for the random 15% timeout. |
| 2026-08-20 | `forceFailure` is an argument to `getCachedQuote`, so it's part of the cache key. | Otherwise a cached success replays and the menu looks broken. Changed 2026-11-12: the quote cache was removed. |
| 2026-08-20 | `null` is turned into `undefined` before `forceFailure` is sent. | `JSON.stringify` sends `null`, which fails the `z.enum` check. |
| 2026-08-20 | The request body is checked with a Zod schema (`text`, `accountId`, optional `forceFailure`) using `safeParse`. | Replaces hand-written `if` checks. `safeParse` never throws, so it fits the guard-clause style. |
| 2026-08-20 | Any `accountId` problem reports "Please log in". Text errors keep their specific messages. | Zod's wording never reaches a buyer, but "too long" and "empty" need different fixes. |
| 2026-08-20 | Error objects use `satisfies ErrorType`, not `as ErrorType`. | `satisfies` checks the object, `as` silences the check. It caught a live `type: "parse failed"` typo. |
| 2026-08-26 | `findClosestMatches(query)` imports `catalog.json` itself, like `lookupProduct`. | Keeps the call site a one-argument function. |
| 2026-08-26 | `findClosestMatches` returns `{ product: Product; score: number }[]`. | A suggestion must be selectable, so it needs the full product. The score belongs to the match, not the product. |
| 2026-08-26 | The "too different, suggest nothing" cutoff is applied inside the helper. Callers never check the score. | "Close enough" is decided once, in one place. |
| 2026-08-26 | Track C owns the suggestion function in `lib/agent/`, and Track B wires it into `route.ts`. | Same split as `parseOrder`: nobody edits `route.ts` from another track. |
| 2026-08-26 | Suggestions are an optional field on the `unmatched` variant of `LineItemResult`, not on `ErrorType`. | `ErrorType` is used app-wide, and suggestions only matter for a catalog miss. |
| 2026-08-26 | `LineItemResult` replaces the shared `type: "not found"`: `status: "unmatched"` means no catalog match (the only case that gets suggestions), and a matched quote with a `stockError` is an ERP miss. | One type used to cover two different failures, told apart only by which field carried them. |
| 2026-08-26 | Catalog SKUs changed from `SKU-1001`–`SKU-1008` to codes like `PER-2284`, `ACC-3391` and `DSP-7742`, and the order history was updated to match. | The old SKUs differed by one digit, so every product was one typo from every other and fuzzy matching couldn't tell them apart. |
| 2026-08-26 | Fuzzy matching uses `fastest-levenshtein`. | `leven` only supports import styles that caused issues here. `fuzzysort` is built for search ranking, and its scores don't compare fairly between a name and a SKU. |
| 2026-08-26 | Fuzzy matching compares the buyer's text against each word of a product name, not the whole name. | A one-word typo like "kabord" looks very different from "Mechanical Keyboard" as a whole. |
| 2026-08-26 | The fuzzy cutoff is 40% of the typed text's length, raised from 30%. | 30% rejected "kabord" for "keyboard". Re-tested every typo case plus nonsense ("banana"). |
| 2026-08-26 | A `lookupProduct` miss falls through to `findClosestMatches`. | "wireless mice" now gets a suggestion instead of a dead end. |
| 2026-08-26 | `parseOrder` calls Claude at `temperature: 0`. | The same typo was sometimes silently corrected and sometimes not, so exact matching was inconsistent. |
| 2026-08-26 | `tool_choice` is `"any"` instead of `"auto"`. | Claude sometimes answered without calling a tool, which `parseOrder` had no handling for. |
| 2026-09-02 | Per-item pricing lives in `priceItems(account, items, forceFailure)` in `lib/erp/priceItems.ts`, shared by both quote routes. | Both paths return the same response shape. |
| 2026-09-02 | Added `POST /api/quote/items` (`{ accountId, items: [{ sku, quantity }], forceFailure? }`), which skips `parseOrder` and Claude. | A caller that already knows the SKUs has nothing to parse. Faster, cheaper, and the same answer every time. |
| 2026-09-02 | The reorder page has one text box, with no separate "add by SKU" field. | The paste box already accepts SKUs. One entry point. |
| 2026-09-02 | Text that is only product codes (`parseSkuList`) goes to `/api/quote/items`; anything with words goes to `/api/quote`. Codes starting with `inv-`, `order-` or `po-` are excluded, so a PO lookup still goes through Claude. | Skips Claude when there's nothing to interpret. |
| 2026-09-02 | Lookup results drop straight into one editable cart ("Your Cart"), with no separate add-to-cart step or floating panel. A new paste adds to the same cart. | Simpler than a persistent cart that builds up across many searches. |
| 2026-09-02 | Matched rows go into the cart. Everything else goes to "Couldn't add these" with its suggestions, and picking one adds it to the cart. | |
| 2026-09-02 | The cart lives in React Context (`DraftOrderProvider`), in memory, and is lost on refresh. | Demo scope. A real cart would be server-backed. `localStorage` is the middle option. |
| 2026-09-02 | The cart context lives in `DraftOrderContext.tsx`, separate from the `DraftOrder` component. | The paste box and the Orders page can both add to the cart without prop drilling. |
| 2026-09-02 | `addLines` merges by sku, adding quantities. A merged row keeps its original source and `sourceRef`. | One row per product. The rare mixed source is low stakes. |
| 2026-09-02 | The cart re-prices on every change, debounced 500ms, through `/api/quote/items`. Price is never stored on a cart line. Quantities below 1 clamp to 1. | The numbers on screen always match the current catalog and account. Narrowed 2026-09-15. |
| 2026-09-02 | The cart and order cards show Sub Total, Discount, Tax (7%, after discount), Total and Internal Cost. `priceItems` returns `listPrice` and `internalCost` per row. | The same breakdown the invoice used. |
| 2026-09-02 | `Product.internalCost` added (about 60% of `basePrice`), admin only: the API sends the number to admins and `"hidden"` to everyone else. | Same rule `visibleInvoice()` uses. Changed 2026-09-15. |
| 2026-09-02 | Typing a PO number like `inv-1001` drops that order's lines into the cart instead of showing an invoice card. Removed the card, its tax math, `formatInvoiceDate` and the `Results` union. | It works the same as reordering a past order. The backend invoice lookup is unchanged. |
| 2026-09-02 | Added the `/orders` page and an "Orders" sidebar item. | Listing past orders is basic and shouldn't need a sentence for Claude. |
| 2026-09-02 | Orders show as cards with a checkbox per line (checked by default, disabled for a discontinued sku) and an editable quantity. "Add selected to your order" adds ticked lines to the cart. | |
| 2026-09-02 | The Orders page uses a native `<input type="checkbox">`. | `components/ui/checkbox.tsx` was removed earlier, and re-adding it wasn't worth it for one column. |
| 2026-09-02 | The demo `forceFailure` value is also sent on the cart's re-price requests, through a prop on `DraftOrder`. | A forced timeout used to re-price cleanly, so the error never showed. |
| 2026-09-02 | `priceItems`'s ERP "not found" row keeps its `sku`. | The catalog match succeeded, so the cart can still show the row and its error. Narrows the 2026-08-20 "not found keeps nothing" rule to this path. |
| 2026-09-02 | Two banners above the cart: red when a line failed, otherwise an orange "stock may be a few hours old" reminder. | Changed 2026-09-15. |
| 2026-09-02 | A line from a PO or past order shows a green tag ("from inv-1001"), and a line from a suggestion shows "suggested". `DraftLine` gained `sourceRef`. | The buyer can see where each line came from. Typed lines show nothing. |
| 2026-09-02 | A `sonner` toast confirms each add. The Orders page keeps an inline confirmation with a link back to the reorder page. | The buyer has to navigate off the Orders page. |
| 2026-09-02 | Removed the debug routes (`ping`, `lookup`, `stock`, `price`, `test`, `track-a-test`) and `testt.ts`. | One-line stubs and scratch files. |
| 2026-09-02 | `useIsMobile` and `useIsBelowLg` share one `useSyncExternalStore` helper in `hooks/use-mobile.ts`. | Also removed a `set-state-in-effect` lint warning. |
| 2026-09-02 | Comments in the cart, activity log and orders code rewritten in plain language, with descriptive names. | Easier to read. |
| 2026-09-03 | `POST /api/orders` prices the whole order once and saves a full `Invoice` to `invoices.json`: per line `listPrice`, `price` and `internalCost`, plus `subtotal`, `discount`, `tax`, `totalAmount` and `internalCost`. Readers display the stored numbers and never price anything. | Orders used to be re-priced on every load, so the totals shown were never the totals the buyer agreed to. |
| 2026-09-03 | All order money math lives in `lib/erp/summarizeOrder.ts` (`TAX_RATE`, `summarizeOrder`). `DraftOrder.tsx` and the Orders page import `TAX_RATE`. | One source instead of separate `0.07`s. |
| 2026-09-03 | New order ids continue the invoice numbers: `inv-<highest + 1>`. | A placed order can be pasted back into the reorder box like any other invoice, because it is one. |
| 2026-09-03 | Deleted `order-history.json`, `lib/erp/order.ts` and the `Order` type. Their functions moved into `lib/erp/invoice.ts` as `getAllInvoices`, `getAccountInvoices` and `saveInvoice`. | Orders and invoices are one thing now. |
| 2026-09-03 | `GET /api/orders` runs each invoice through `visibleInvoice`. | The same role gate the paste flow uses. No second set of rules. |
| 2026-09-03 | The `get_order_history` tool keeps its name and returns invoices. | To a buyer, past orders and invoices are the same list. |
| 2026-09-04 | Deleted dead files: `components/EmptyState.tsx`, `components/Spinner.tsx`, `components/activity-log/testData.ts`, `components/ui/select.tsx`, `components/ui/label.tsx`, and the `SelectAccount` component. | No importers found. |
| 2026-09-04 | Removed `app/claudetest/page.tsx` and its nav link. | It posted to the deleted `/api/test`, so it 404'd on every submit. |
| 2026-09-14 | `priceItems` checks stock for every item at the same time. | Each check is independent. A 5-item paste used to run 5 checks back to back. |
| 2026-09-14 | Four quick-action buttons on the Reorder page: last invoice, look up a PO, simulate a stock delay, paste a product list. They only fill the text box, and stay disabled until an account is picked, with a note explaining why. | Fast demos. Every quote needs an account. |
| 2026-09-14 | "Reorder my last order" has Claude pick one exact invoice, which plain code then fetches, instead of letting Claude choose products from the history. | Claude lost track of the source invoice (no tag or date in the cart) and once mixed items from two invoices. |
| 2026-09-14 | Lead time depends on the account: +2 days if the product ships from another warehouse, −1 day for contract accounts, never below 1. | Same idea as account-based pricing. |
| 2026-09-15 | Cart re-pricing and the Orders page log every failure (stock check, pricing request, network). | Neither logged failures before, and the Orders page had no log wiring at all. |
| 2026-09-15 | Failed stock checks are logged one line per distinct reason, naming every affected item. The banner says "N items could not be checked". | One item's error was never true for all of them, and a timeout and a "not found" used to log identical text. |
| 2026-09-15 | Stock failures show the product name, not the SKU, including on the rare unexpected-error path in `priceItems`. | `priceItems` already had the matched product. |
| 2026-09-15 | `errorMessages.ts` rewording: the timeout message says the cart rechecks on its own; "not found" doesn't always say "product"; "invalid input" drops form-validation phrasing. | Messages promised actions the buyer couldn't take, or named the wrong thing. |
| 2026-09-15 | `ErrorMessage.tsx` shows the server's specific message first, and falls back to the generic one. | The specific message, like "Invoice with ID inv-9999 not found.", was being thrown away. |
| 2026-09-15 | Seeded 3 more invoices, so every demo account has at least 3 (1 to 8 items) and one (account 3) covers every product. | Better demos. |
| 2026-09-15 | The cart, the activity log and the text box all clear on an account switch through one hook, `useResetOnAccountSwitch`. | They each had a copy of the same `useRef`/`useEffect`. |
| 2026-09-15 | Stale stock logs a line. Staleness is one shared `isStale()` used by the log and the banner. | Stale stock never logged, because it isn't a failure. |
| 2026-09-15 | The Stock cell wraps text. | The longer timeout message pushed the table wide and shrank the activity sidebar. |
| 2026-09-15 | The cart only re-checks lines that are new, previously failed or stale. `forceFailure` clears itself after one use. | Forcing a failure while adding one item flagged every item already in the cart. |
| 2026-09-15 | `refreshPrices` reads `forceFailure` through a ref instead of depending on it. | Resetting it triggered an unforced re-price that quietly overwrote the failure being shown. |
| 2026-09-15 | "Place order" is disabled while any line has a stock error, with a message explaining why, and `placeOrder()` checks again. | Nothing stopped an order being placed on a failed stock check. |
| 2026-09-15 | `POST /api/orders` re-checks stock fresh and uncached right before saving, and rejects the whole order naming the products it couldn't confirm. | It only checked that each sku existed. Changed 2026-11-12. |
| 2026-09-15 | Renamed the `setForceFailure` prop to `setForceFailureAction`. | With `cacheComponents` on, Next requires function props on a `"use client"` component to be named `action` or end in `Action`. |
| 2026-09-15 | "Couldn't add these" rows can be dismissed one at a time, or all at once with "Clear". | There was no way to dismiss anything. |
| 2026-09-15 | A cart line with no priced result yet shows a pulsing placeholder. | "—" means hidden data, so an in-progress row looked finished. |
| 2026-09-15 | A purple "Updating cart..." banner shows while a lookup runs, even when the cart has items. | The spinner only showed on an empty cart. |
| 2026-09-15 | The Internal Cost row is hidden entirely for non-admins. | It's restricted for them 100% of the time, unlike Warehouse or Stock. |
| 2026-09-15 | `GET /api/orders` returns every account's invoices for admin. The Orders page shows which account an order belongs to only when more than one appears. | Admin could only fetch one invoice by typing its id. Buyers' and managers' views are unchanged. |
| 2026-09-15 | The README's "Accounts and roles" section explains buyer and manager are customers, admin is supplier staff, and notes the assisted-ordering gap. | Documented instead of built. |
| 2026-09-20 | Vitest is the test runner. | Handles TypeScript and modern imports with almost no setup, and runs fast. |
| 2026-09-20 | Added `jsdom` and React Testing Library. | The cart hook tests will need them. Saves a second setup PR. |
| 2026-09-20 | Left out `@vitejs/plugin-react`. | It clashed with the Babel 7 that `shadcn` brings in, and plain `.ts` tests don't need it. |
| 2026-09-20 | Bumped `@types/node` from 20 to 22. | We run Node 22, and Vitest wouldn't install with the old types. |
| 2026-09-20 | The Vitest config is `vitest.config.mts`, without setting `"type": "module"`. | Node warned on `.ts`. `.mts` marks a modern module without changing how other config files load. |
| 2026-09-20 | `@/` imports in tests use Vite's built-in `resolve.tsconfigPaths`. Removed `vite-tsconfig-paths`. | The plugin is no longer needed. |
| 2026-09-20 | Unit tests sit next to the code they test (`fuzzyMatch.test.ts` beside `fuzzyMatch.ts`). End-to-end tests get their own folder. | Easy to find the test for a file. |
| 2026-09-20 | The first test covers `findClosestMatches`: a typo, letter case, and nonsense. One was made to fail on purpose. | A plain function that already existed. The deliberate failure confirms the runner really checks results. |
| 2026-11-11 | CI runs on pushes and PRs to `staging` and `main`: lint, type check and Vitest, then Playwright against a local production build. The Playwright specs use the local server, not the live demo. | Tests check the branch's own code. Closes the 2026-08-19 and 2026-09-20 CI TODOs. |
| 2026-11-11 | Regenerated `package-lock.json`, which was missing `@playwright/test`. Vitest skips the `tests/` folder. | `npm ci` failed on the lockfile, and Vitest was running the Playwright specs. |
| 2026-11-12 | Seeing stock and confirming stock are separate. `seeStock` only decides whether a number is shown. `POST /api/orders` always checks stock through `checkStock()`, for every role. | A buyer who couldn't see a product's stock could place an order with no stock check at all. |
| 2026-11-12 | An order is rejected when any sku's total quantity across lines is more than its stock. The message shows the available count only to roles allowed to see it. | Orders only checked that the stock call succeeded, never that there was enough. |
| 2026-11-12 | `POST /api/orders` returns `visibleInvoice()`, not the stored invoice. | It was sending internal cost and discount to every role. |
| 2026-11-12 | Request limits live in one file, `lib/orderLimits.ts`: pasted text up to 5,000 characters, up to 100 lines per request, and quantities from 1 to 10,000. All three routes, the paste box and both quantity inputs use it. | Pasted text goes to Claude, so an unlimited paste was an unlimited bill. One shared file keeps the client and server agreeing. |
| 2026-11-12 | A quantity from Claude that can't be priced (0, negative, a decimal like "2.5 boxes", or over 10,000) becomes an unmatched row with an `"invalid input"` error and no suggestions. It isn't rounded or guessed. | It used to go into the cart and fail every re-price for the whole cart. This extends `status: "unmatched"` (2026-08-26) beyond catalog misses. |
| 2026-11-12 | The cart clamps quantities to 1–10,000, including when merging two lines for the same sku, and logs when a merge hits the cap. | The same failure: one out-of-range line broke the whole cart's re-price. |
| 2026-11-12 | Removed the quote cache (`"use cache"` and `cacheTag("stock")` in `priceItems.ts`, and `revalidateTag` in `saveInvoice`). Every quote checks stock with the ERP. | Confirmed in dev: three quotes for the same product returned the same `calculatedAt`. The stock number never refreshed, the log replayed "Stock Checked" lines for checks that never ran, and a saved failure would stay failed. The cart already only re-checks new, failed or stale lines, so the cache bought little. Replaces the 2026-08-20 cache-key decision for `forceFailure`. |
| 2026-11-12 | `mockERP.ts` throws an `ERPError` with a `code` (`"timeout"` or `"not found"`), and `mapStockErrorToReason` maps by that code, never by the message. Anything that isn't an `ERPError` becomes `"request failed"`. | It used to check whether the message included "timed out", which breaks silently when the wording changes, and it labelled unknown errors `"invalid input"`, as if the buyer did something wrong. Closes the 2026-08-18 TODO. |
| 2026-11-12 | `priceItems`'s unexpected-error row uses the same shape as any failed line (`stock: "error"` plus `stockError`) and keeps its `sku`. | The cart matches results to lines by sku, so the old row (no sku, error object in `stock`) was dropped: the line showed a loading placeholder forever and never counted as failed. |

## Open TODOs

| Date | TODO | Reason |
| --- | --- | --- |
| 2026-08-06 | Add a filter by event category to the activity log UI. | Events carry a `category` since 2026-08-18, but the log shows everything at once. Filtering by errors, orders or stock checks helps debugging and demos. |
| 2026-08-12 | If regional routing is ever needed (nearest warehouse with stock, several warehouses per account), change the data model and the warehouse comparison. | Today it's a flat equality check. |
| 2026-08-19 | Define an `ERPAdapter` interface (for example `getStock(sku)`) that `mockERP.ts` implements, instead of importing `getERPStock` and the data files directly. | "Swappable backend" isn't enforced by the types, so a second backend could quietly not match. The cheapest, highest-value item. |
| 2026-08-19 | Move `forceFailure` off the public request schemas, behind a dev-only path or an env check. | Any caller can force a failure, including on the live demo. |
| 2026-08-19 | Check required env vars (`ANTHROPIC_API_KEY`) once at startup, with Zod. | Today a missing key only shows up as "Couldn't read that order." wherever the client first runs. |
| 2026-08-20 | The parser drops items when a quantity trails the name: `"2 mouses, 2 lanterns"` returns two items, but `"mouse 2, page 2"` returns one item named "mouse". Look at the tool description in `recordItemsTool.ts`. | Trailing numbers are read as model numbers, not quantities. |
| 2026-08-20 | Cache `parseOrder` results for the same text and account. | It dominates request time now that ERP calls are cached. `temperature: 0` already makes it deterministic. |
| 2026-08-27 | Claude silently corrects misspelled products: `"2 wireless mise"` becomes a finished quote for Wireless Mouse with no sign the words changed. Show it as a "did you mean", not a silent swap. | A quote commits money to a product the buyer didn't type. `temperature: 0` made the correction consistent, not visible. |
| 2026-08-27 | Add `correctedFrom: string \| null` to each item in `recordItemsTool.ts`: the buyer's original wording when Claude changed it, `null` when it didn't. | `confidence` can't carry this (a corrected input scored higher than a clean one), and branching on the free-text `note` means string matching. |
| 2026-08-27 | Decide hard or soft handling for corrected items. Hard: an unmatched row the buyer confirms. Soft: still quote it, but mark the row ("Wireless Mouse, you typed 'mise'"). | Soft fit while this screen only quoted, and hard was the plan once it placed orders. The cart has placed orders since 2026-09-02, so revisit this. |
| 2026-08-27 | A correct word can fail where a typo succeeds: "wireless mice" is left alone by Claude, and `lookupProduct`'s `.replace(/s$/, "")` doesn't turn mice into mouse (also boxes, knives, feet). Match on `productGuess.attributes` too, or rely on the fuzzy suggestion. | The misspelled input gets a clean quote while the correct one gets a "did you mean". |
| 2026-09-02 | Persist the cart with `localStorage` or a server cart. | The cart is lost on refresh. |
| 2026-09-02 | Warn when a PO or stored invoice has a sku that has left the catalog. | The line is added to the cart but won't price, with no warning. |
| 2026-09-03 | `saveInvoice` reads then writes `invoices.json` with no lock. | Two orders placed at the same instant could overwrite each other. Fine at demo scale. |
| 2026-09-04 | Rewrite the dot spinner in `components/Loader.tsx` in Tailwind or plain CSS, and drop `styled-components`. | It's the dependency's only use. Everything else is Tailwind. |
| 2026-09-04 | Split `components/draft-order/DraftOrder.tsx` into a pricing hook plus a few presentational pieces. | Over 500 lines doing five jobs: re-pricing, totals, banners, table markup and placing the order. |
| 2026-09-04 | Split `lib/erp/` into the fake ERP (`mockERP.ts`, `accountRules.ts`) and our own order and pricing logic (`invoice.ts`, `summarizeOrder.ts`, `priceItems.ts`). | The folder originally meant "the fake ERP system" and keeps growing. |
| 2026-09-14 | Allow a partial reorder, or a changed quantity, through the "last order" path. | That path always returns the whole invoice. |
| 2026-09-14 | Test "last order", "last invoice" and "items from my last invoice" live with a real API key, across a few accounts. | The fix depends on Claude following the new tool instructions. |
| 2026-09-15 | The cart keeps a cached price per sku until something forces a recheck (a new item, a past failure, stale stock, an account switch). | A real catalog price change would go unnoticed until then. |
| 2026-09-15 | Assisted ordering: an admin placing an order on behalf of a customer. | An order placed as admin is saved under admin's own account. Documented in the README instead of built. |
| 2026-09-20 | `npm audit` shows 4 vulnerabilities (1 critical) in `next` 16.2.12 (with `postcss` and `sharp`) and `js-yaml`. Bump `next` and `eslint-config-next` to 16.3.5, then run `npm audit fix`. | None come from the test packages. |
| 2026-09-20 | Add `@vitejs/plugin-react` when we start testing `.tsx` components, if needed. | It needs a version that works with `shadcn`'s Babel. |
| 2026-09-20 | Add an `.nvmrc` or an `engines` field so everyone uses Node 22, and switch CI from Node 20 to 22 to match. | The team runs Node 22, but CI and the README say Node 20. |
| 2026-09-20 | Write the next tests: `parseSkuList`, then the cart code (`computeCartTotals`, `isStale`, `useCartPricing`) once the cart refactor is merged, then more end-to-end flows. | Playwright is set up since 2026-11-11. |
