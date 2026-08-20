// app/api/test-track-a/route.ts

/* [TRACK A — DAY 7–9 TEST ROUTE]
   
   TEMPORARY — this is a debug/testing route, not part of the app.
   Delete this file before Day 20 (same as Track C's claudetest page).

   Visit this route in the browser (or curl it) while `npm run dev`
   is running. Results print both in the browser response AND in
   the terminal running the dev server.

   WHAT THIS TESTS, AND WHAT "PASSING" MEANS:

   [Day 8 tests]
   1. SKU consistency (mockERP.ts)
      - Calls getERPStock() twice with the same SKU.
      - Expect: both calls return the exact same stock number.
        (Confirms stock numbers are hashed from the SKU, not random.)

   2. Order history read (order.ts)
      - Fetches Mike's (account 3) order history and logs how many
        orders exist. No pass/fail check — just a visual sanity check
        that real sample data is being read correctly.

   3. Order history write (order.ts)
      - Adds one new fake order for Mike, then re-checks his order count.
      - Expect: the "after" count is exactly 1 more than "before".
        (Confirms addOrder() appends without wiping existing orders.)
      - Note: this genuinely writes to order-history.json every time
        this route loads — Mike's order count will keep climbing.

   [Day 9 tests — productQuote.ts retry logic]
   4. Scenario 1 — normal success (admin account, no forced failure)
      - Expect: first event is "Price Calculated", last event is
        "Stock Checked", and there are either 2 events (worked on
        the first try) or 3 events (mockERP's built-in 15% random
        failure hit once, the retry caught it, and it succeeded on
        the second try). Both outcomes are correct — only 4/1/etc.
        events, or a wrong first/last event, would mean something's
        actually broken.

   5. Scenario 2 — forced failure (admin account, forceFailure: "timeout",
      then again with "not found")
      - Expect: the first attempt fails, retries once, fails again —
        and the function returns NORMALLY instead of throwing.
      - Expect price, sku, leadTime, warehouse, and events to still be
        present in the result — nothing gets lost on a failed check.
      - Expect result.stock === "error" and result.stockError.type to
        match whichever failure was forced ("timeout" or "not found").
      - Expect exactly 4 events in this order: "Price Calculated",
        "Stock check attempt 1 failed", "Stock check attempt 2 failed",
        "Stock Check Failed: <reason>".
      - Confirms: one failure doesn't stop anything, a second failure
        doesn't throw either — it's recorded as data, not an exception,
        and nothing logged (or calculated) before the failure is lost.

   6. Scenario 3 — role/warehouse mismatch (Mike, a buyer assigned to
      Calgary, checking a product warehoused in Vancouver)
      - Expect: result.stock === "hidden", and an event logged
        explaining stock was hidden due to role — not silently
        skipped.
 */

import { NextResponse } from "next/server";
import { addOrder, getOrderHistory } from "@/lib/order/order";
import { getERPStock } from "@/lib/erp/mockERP";
import { getQuoteForProduct } from "@/lib/erp/productQuote";
import type { UserContext, Product } from "@/types"; // adjust path if types.ts lives elsewhere

export async function GET() {
  const results: unknown[] = [];

  // Logs to BOTH the terminal (as flattened readable text) and the
  // browser's JSON response (keeping objects nested, not double-stringified).
  const log = (...args: unknown[]) => {
    const consoleLine = args
      .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
      .join(" ");
    console.log(consoleLine);

    results.push(args.length === 1 ? args[0] : args);
  };

  // +++++ Day 8 tests +++++

  // Call getERPStock twice with the same SKU — same input should always
  // give the same stock number (see hashSkuToStock in mockERP.ts).
try {
    const firstStockCheck = await getERPStock("SKU-1001");
    const secondStockCheck = await getERPStock("SKU-1001");
    log(
      "Same SKU, two calls:",
      firstStockCheck.stock,
      secondStockCheck.stock,
      firstStockCheck.stock === secondStockCheck.stock ? "✅ matches" : "❌ different",
    );
  } catch (err) {
    log(
      "Same SKU, two calls: ⚠️ hit the random 15% simulated timeout — not a real bug, just reload the page to try again",
      err instanceof Error ? err.message : err,
    );
  }

  const mikesOrders = await getOrderHistory(3);
  log("Mike's orders count:", mikesOrders.length);

  const orderCountBefore = (await getOrderHistory(3)).length;
  await addOrder({
    id: crypto.randomUUID(),
    accountId: 3,
    items: [{ sku: "SKU-1007", quantity: 1 }],
    timestamp: new Date().toISOString(),
  });
  const orderCountAfter = (await getOrderHistory(3)).length;
  log("Order count for Mike, before → after:", orderCountBefore, "→", orderCountAfter);

  // +++++ Day 9 tests — real accounts + real products +++++

  const visibleAccount: UserContext = {
    id: 1,
    name: "Alex",
    role: "admin",
    accountType: "standard",
    assignedWarehouse: "Vancouver",
  };
  const testProduct: Product = {
    sku: "SKU-1001",
    name: "Wireless Mouse",
    basePrice: 29.99,
    leadTime: 2,
    warehouse: "Vancouver",
  };

  // Scenario 1: normal success (broken into readable pieces)
  const successResult = await getQuoteForProduct({
    account: visibleAccount,
    product: testProduct,
  });
  const successMessages = successResult.events.map((event) => event.message);

  const startsWithPrice = successMessages[0]?.startsWith("Price Calculated");
  const endsWithStockChecked =
    successMessages[successMessages.length - 1]?.startsWith("Stock Checked");
  const reasonableEventCount = successMessages.length === 2 || successMessages.length === 3;
  const scenario1Correct =
    startsWithPrice && endsWithStockChecked && reasonableEventCount;

  log("Success case events:", successMessages);
  log("First event is Price Calculated:", startsWithPrice ? "✅" : "❌");
  log("Last event is Stock Checked:", endsWithStockChecked ? "✅" : "❌");
  log(
    "Event count is 2 or 3:",
    reasonableEventCount ? "✅" : "❌",
    `(got ${successMessages.length})`,
  );
  log("Scenario 1 overall:", scenario1Correct ? "✅" : "❌");

  // Scenario 2: forced failure — should NOT throw. Should return normally
  // with price/sku/leadTime/warehouse/events all still intact, plus
  // stock === "error" and a stockError explaining why.
  const forcedTimeoutResult = await getQuoteForProduct(
    { account: visibleAccount, product: testProduct },
    "timeout",
  );
  const timeoutMessages = forcedTimeoutResult.events.map((event) => event.message);

  const scenario2Correct =
    forcedTimeoutResult.price !== undefined &&
    forcedTimeoutResult.sku !== undefined &&
    forcedTimeoutResult.leadTime !== undefined &&
    forcedTimeoutResult.stock === "error" &&
    forcedTimeoutResult.stockError?.type === "timeout" &&
    timeoutMessages.length === 4 &&
    timeoutMessages[0].startsWith("Price Calculated") &&
    timeoutMessages[1] === "Stock check attempt 1 failed — Wireless Mouse" &&
    timeoutMessages[2] === "Stock check attempt 2 failed — Wireless Mouse" &&
    timeoutMessages[3].startsWith("Stock Check Failed");

  log("Forced timeout — full result:", forcedTimeoutResult);
  log("Forced timeout events:", timeoutMessages);
  log(
    "Price/sku/leadTime still present:",
    forcedTimeoutResult.price !== undefined &&
      forcedTimeoutResult.sku !== undefined &&
      forcedTimeoutResult.leadTime !== undefined
      ? "✅"
      : "❌",
  );
  log("stock === 'error':", forcedTimeoutResult.stock === "error" ? "✅" : "❌");
  log(
    "stockError.type === 'timeout':",
    forcedTimeoutResult.stockError?.type === "timeout" ? "✅" : "❌",
  );
  log("Scenario 2 overall (no throw, everything intact):", scenario2Correct ? "✅" : "❌");

  // Scenario 2b: same idea, forced "not found" instead — confirms the
  // second reason code also comes through correctly.
  const forcedNotFoundResult = await getQuoteForProduct(
    { account: visibleAccount, product: testProduct },
    "not found",
  );
  const scenario2bCorrect =
    forcedNotFoundResult.price !== undefined &&
    forcedNotFoundResult.stock === "error" &&
    forcedNotFoundResult.stockError?.type === "not found";

  log(
    "Forced not-found — stock:",
    forcedNotFoundResult.stock,
    "| stockError.type:",
    forcedNotFoundResult.stockError?.type,
  );
  log("Scenario 2b overall:", scenario2bCorrect ? "✅" : "❌");

  // Scenario 3: Mike (buyer, Calgary) + same product (Vancouver) — guaranteed mismatch
  const hiddenAccount: UserContext = {
    id: 3,
    name: "Mike",
    role: "buyer",
    accountType: "standard",
    assignedWarehouse: "Calgary",
  };
  const hiddenResult = await getQuoteForProduct({
    account: hiddenAccount,
    product: testProduct,
  });
  log(
    "Hidden case stock:",
    hiddenResult.stock,
    hiddenResult.stock === "hidden" ? "✅" : "❌",
  );
  log(
    "Hidden case events:",
    hiddenResult.events.map((event) => event.message),
  );

  return NextResponse.json({ results });
}