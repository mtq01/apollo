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

   5. Scenario 2 — forced failure (admin account, forceFailure: "timeout")
      - Expect: the first attempt fails, retries once, fails again,
        and throws a StockCheckError — not a generic/raw error.
      - Expect exactly 3 events in this order: "Price Calculated",
        "Stock check attempt 1 failed", "Stock check attempt 2 failed".
      - Expect the thrown error's `.cause` to hold the original
        "ERP request timed out" error, not just a vague message.
      - Confirms: one failure doesn't throw immediately, a second
        failure does, and nothing logged before the failure is lost.

   6. Scenario 3 — role/warehouse mismatch (Mike, a buyer assigned to
      Calgary, checking a product warehoused in Vancouver)
      - Expect: result.stock === "hidden", and an event logged
        explaining stock was hidden due to role — not silently
        skipped.
 */

import { NextResponse } from "next/server";
import { addOrder, getOrderHistory } from "@/lib/order/order";
import { getERPStock } from "@/lib/erp/mockERP";
import { getQuoteForProduct, StockCheckError } from "@/lib/erp/productQuote";
import type { UserContext, Product } from "@/types"; // adjust path if types.ts lives elsewhere

export async function GET() {
  const results: string[] = [];
  const log = (...args: unknown[]) => {
    const line = args
      .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
      .join(" ");
    console.log(line);
    results.push(line);
  };

  // +++++ Day 8 tests +++++
  const a = await getERPStock("SKU-1001");
  const b = await getERPStock("SKU-1001");
  log(
    "Same SKU, two calls:",
    a.stock,
    b.stock,
    a.stock === b.stock ? "✅ matches" : "❌ different",
  );

  const mikesOrders = await getOrderHistory(3);
  log("Mike's orders count:", mikesOrders.length);

  const before = (await getOrderHistory(3)).length;
  await addOrder({
    id: crypto.randomUUID(),
    accountId: 3,
    items: [{ sku: "SKU-1007", quantity: 1 }],
    timestamp: new Date().toISOString(),
  });
  const after = (await getOrderHistory(3)).length;
  log("Order count for Mike, before → after:", before, "→", after);

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
  const result = await getQuoteForProduct({
    account: visibleAccount,
    product: testProduct,
  });
  const messages = result.events.map((e) => e.message);

  const startsWithPrice = messages[0]?.startsWith("Price Calculated");
  const endsWithStockChecked =
    messages[messages.length - 1]?.startsWith("Stock Checked");
  const reasonableEventCount = messages.length === 2 || messages.length === 3;
  const scenario1Correct =
    startsWithPrice && endsWithStockChecked && reasonableEventCount;

  log("Success case events:", messages);
  log("First event is Price Calculated:", startsWithPrice ? "✅" : "❌");
  log("Last event is Stock Checked:", endsWithStockChecked ? "✅" : "❌");
  log(
    "Event count is 2 or 3:",
    reasonableEventCount ? "✅" : "❌",
    `(got ${messages.length})`,
  );
  log("Scenario 1 overall:", scenario1Correct ? "✅" : "❌");

  // Scenario 2: forced failure — should retry once, then throw
  try {
    await getQuoteForProduct(
      { account: visibleAccount, product: testProduct },
      "timeout",
    );
    log("❌ Expected a throw, didn't get one");
  } catch (err) {
    if (err instanceof StockCheckError) {
      log(
        "Forced failure events:",
        err.events.map((e) => e.message),
      );
      const scenario2Correct =
        err.events.length === 3 &&
        err.events[0].message.startsWith("Price Calculated") &&
        err.events[1].message === "Stock check attempt 1 failed" &&
        err.events[2].message === "Stock check attempt 2 failed";
      log(
        "Scenario 2 (right events, in order):",
        scenario2Correct ? "✅" : "❌",
      );
      log(
        "Cause preserved:",
        err.cause instanceof Error ? err.cause.message : err.cause,
      );
    } else {
      log("❌ Wrong error type:", err);
    }
  }

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
    hiddenResult.events.map((e) => e.message),
  );

  return NextResponse.json({ results });
}
