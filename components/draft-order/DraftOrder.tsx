"use client";

/* The "Your Cart" section on the reorder page.

  The item list lives in DraftOrderContext, so the paste box and the orders
  page can add to it. This component reads that list, re-prices it on the
  server whenever it changes, shows the table with totals, and places the
  order. Prices are never stored on a line, so the numbers always match the
  current catalog and account. */

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import Loader from "@/components/Loader";
import { AccountContext } from "@/components/account/AccountContext";
import { ActivityContext } from "@/components/activity-log/ActivityContext";
import { DraftOrderContext } from "@/components/draft-order/DraftOrderContext";
import { buyerErrorMessage } from "@/lib/erp/errorMessages";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangleIcon, CircleX, Loader2 } from "lucide-react";
import type { ErrorType, ForcedFailure } from "@/types";
import { TAX_RATE } from "@/lib/erp/summarizeOrder";

/* A priced line from POST /api/quote/items, looked up by sku. Most fields are
   optional because a line can fail to price and still come back. */
type PricedRow = {
  sku?: string;
  name: string;
  quantity: number | null;
  price?: number; // per unit, after discount
  listPrice?: number; // per unit, before discount
  internalCost?: number | "hidden" | null; // per unit; admins only
  stock?: number | "hidden" | "error" | ErrorType;
  stockError?: ErrorType; // set when the stock check failed
  leadTime?: number; // days until it ships
  warehouse?: string | "hidden";
  calculatedAt?: string; // when the server ran this quote
  stockLastUpdated?: string | "hidden" | "error"; // when the ERP last refreshed this number
};

// Wait this long after the last change before re-pricing, so we don't fire a request on every keystroke.
const PRICE_REFRESH_DELAY_MS = 500;

// stock numbers older than this trigger the "confirm before ordering" message
const STALE_STOCK_AFTER_MS = 2 * 60 * 60 * 1000; // 2 hours

// A server timestamp as a short time like "2:45 PM".
function formatStockCheckTime(isoTimestamp: string) {
  return new Date(isoTimestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSourceDate(isoTimestamp: string) {
  return new Date(isoTimestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// small pulsing placeholder for a cell whose line has not been priced yet.
// different from "—", which means there is nothing to show, not "wait for it."
function LoadingCell() {
  return (
    <span className="inline-block h-3 w-10 animate-pulse rounded bg-gray-200" />
  );
}

// was this row's stock number already old when the quote was built?
function isStale(pricedRow: PricedRow | undefined): boolean {
  const checkedAt = pricedRow?.stockLastUpdated;
  const quotedAt = pricedRow?.calculatedAt;
  if (
    typeof checkedAt !== "string" ||
    checkedAt === "hidden" ||
    checkedAt === "error" ||
    !quotedAt
  ) {
    return false;
  }
  return (
    new Date(quotedAt).getTime() - new Date(checkedAt).getTime() >
    STALE_STOCK_AFTER_MS
  );
}

export function DraftOrder({
  forceFailure,
  setForceFailureAction,
  isLoading,
}: {
  // From the demo dropdown; makes the re-price fail on purpose.
  forceFailure?: ForcedFailure | null;
  // clears the dropdown after one use, so it only affects the batch that asked for it. named ...Action so next treats this function prop as safe at the "use client" boundary.
  setForceFailureAction?: (value: ForcedFailure | null) => void;
  isLoading?: boolean;
}) {
  // The active account. Prices depend on it; actions are blocked until one is picked.
  const { accountId } = useContext(AccountContext);
  // Write to the activity log when the order is placed or cleared.
  const { logEvent } = useContext(ActivityContext);

  // The shared cart: the items plus the ways to change them.
  const { lines, setQuantity, removeLine, clear } =
    useContext(DraftOrderContext);

  // Latest prices from the server, keyed by sku.
  const [pricedBySku, setPricedBySku] = useState<Record<string, PricedRow>>({});

  // same data as pricedBySku, kept in a ref too. refreshPrices reads this instead of the state, so it does not need pricedBySku as a dependency and does not re-trigger itself every time it saves a new price.
  const pricedBySkuRef = useRef(pricedBySku);
  const updatePricedBySku = useCallback(
    (next: Record<string, PricedRow>) => {
      pricedBySkuRef.current = next;
      setPricedBySku(next);
    },
    [],
  );

  // which account the cached prices belong to. switching accounts means prices and stock could be different for everyone, so check everyone again.
  const lastPricedAccountId = useRef(accountId);

  // always has the latest forceFailure, read inside refreshPrices. resetting forceFailure should not by itself start a new price check, so it stays out of refreshPrices' own dependency list.
  const forceFailureRef = useRef(forceFailure);
  useEffect(() => {
    forceFailureRef.current = forceFailure;
  }, [forceFailure]);

  // True while a price request is running.
  const [isPricing, setIsPricing] = useState(false);

  // Shown when a request fails.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // True while "Place order" is running.
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // The new order id after a successful "Place order". shown as a confirmation.
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  // AbortController for the in-flight price request, so a stale response can't overwrite newer prices.
  const priceRequestRef = useRef<AbortController | null>(null);

  // Re-price the cart. In useCallback so the timer effect only restarts when its inputs change.
  const refreshPrices = useCallback(async () => {
    // Drop any earlier request so a slow one can't land after a newer one.
    priceRequestRef.current?.abort();

    // Nothing to price without an account or items.
    if (!accountId || lines.length === 0) {
      updatePricedBySku({});
      setErrorMessage(null);
      return;
    }

    // an account switch means every line needs a fresh check. otherwise only check lines with no cached price, a past failure, or stale stock. a line that already priced fine keeps its cached result.
    const needsFullRefresh = lastPricedAccountId.current !== accountId;
    lastPricedAccountId.current = accountId;

    const linesToCheck = needsFullRefresh
      ? lines
      : lines.filter((line) => {
          const cached = pricedBySkuRef.current[line.sku];
          return !cached || cached.stockError || isStale(cached);
        });

    // carry over anything not being rechecked, drop lines removed from the cart
    const carriedOver: Record<string, PricedRow> = {};
    for (const line of lines) {
      const cached = pricedBySkuRef.current[line.sku];
      const isBeingChecked = linesToCheck.some((l) => l.sku === line.sku);
      if (cached && !isBeingChecked) carriedOver[line.sku] = cached;
    }

    // nothing new to check, just apply the removals and stop.
    if (linesToCheck.length === 0) {
      updatePricedBySku(carriedOver);
      return;
    }

    // Start a request we can cancel later.
    const abortController = new AbortController();
    priceRequestRef.current = abortController;
    setIsPricing(true);
    setErrorMessage(null);

    try {
      // Price only the lines that need it. forceFailure is only set from the demo dropdown.
      const forceFailureForThisBatch = forceFailureRef.current;
      const response = await fetch("/api/quote/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          items: linesToCheck.map((line) => ({
            sku: line.sku,
            quantity: line.quantity,
          })),
          forceFailure: forceFailureForThisBatch ?? undefined,
        }),
        signal: abortController.signal,
      });

      // a forced failure only applies to this one batch. resetting it here does not start another price check, since refreshPrices reads forceFailure from a ref instead of depending on it directly.
      if (forceFailureForThisBatch) setForceFailureAction?.(null);

      const data = await response.json();

      if (!response.ok) {
        // Show this failure in the cart and in the log.
        const message = data?.error?.message ?? "Couldn't price this order.";
        setErrorMessage(message);
        logEvent(message, "error");
        return;
      }

      // Start from what we carried over, then add the fresh results.
      const nextPricedBySku: Record<string, PricedRow> = { ...carriedOver };
      for (const quoteRow of (data.quotes ?? []) as PricedRow[]) {
        if (quoteRow.sku) nextPricedBySku[quoteRow.sku] = quoteRow;
      }

      // one log line per reason a stock check failed, not one line per item, and not one line for every reason mixed together either.
      const failedByReason = new Map<string, string[]>();
      for (const quoteRow of Object.values(nextPricedBySku)) {
        if (!quoteRow.stockError) continue;
        const reason = buyerErrorMessage(quoteRow.stockError);
        const names = failedByReason.get(reason) ?? [];
        names.push(quoteRow.name);
        failedByReason.set(reason, names);
      }
      for (const [reason, names] of failedByReason) {
        const word = names.length === 1 ? "item" : "items";
        logEvent(
          `Stock check failed for ${names.length} ${word}: ${names.join(", ")}.  ${reason}`,
          "stock",
        );
      }

      // stale stock is not an error, the check still succeeds, so it needs its own log line instead of piggybacking on the one above.
      const staleNames = Object.values(nextPricedBySku)
        .filter((quoteRow) => isStale(quoteRow))
        .map((quoteRow) => quoteRow.name);
      if (staleNames.length > 0) {
        const word = staleNames.length === 1 ? "item" : "items";
        logEvent(
          `Stock data may be a few hours old for ${staleNames.length} ${word}: ${staleNames.join(", ")}`,
          "stock",
        );
      }

      updatePricedBySku(nextPricedBySku);
    } catch {
      // Aborts land here too; only a real failure gets a message.
      if (!abortController.signal.aborted) {
        setErrorMessage("Couldn't reach the server.");
        logEvent("Could not reach the server", "error");
      }
    } finally {
      if (!abortController.signal.aborted) setIsPricing(false);
    }
  }, [accountId, lines, logEvent, updatePricedBySku, setForceFailureAction]);

  // Debounce: every change clears the old timer and starts a new one, so only a pause triggers the re-price.
  useEffect(() => {
    const timerId = setTimeout(refreshPrices, PRICE_REFRESH_DELAY_MS);
    return () => clearTimeout(timerId);
  }, [refreshPrices]);

  // Place the order via POST /api/orders, then remember the id and empty the cart.
  async function placeOrder() {
    // never place an order with a line whose stock could not be confirmed. the button is disabled for this too, this is a second check just in case.
    if (!accountId || lines.length === 0 || failedLines.length > 0) return;
    setIsPlacingOrder(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          items: lines.map((line) => ({
            sku: line.sku,
            quantity: line.quantity,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data?.error?.message ?? "Couldn't place the order.";
        setErrorMessage(message);
        logEvent(message, "error");
        return;
      }
      const itemWord = lines.length === 1 ? "item" : "items";
      logEvent(
        `Placed order ${data.order.id}, ${lines.length} ${itemWord}`,
        "order",
      );
      setPlacedOrderId(data.order.id);
      clear();
    } catch {
      setErrorMessage("Couldn't reach the server.");
      logEvent("Could not reach the server", "error");
    } finally {
      setIsPlacingOrder(false);
    }
  }

  // Empty the cart and clear any leftover messages.
  function clearDraft() {
    if (lines.length > 0) logEvent("Cleared the cart", "order");
    clear();
    setPlacedOrderId(null);
    setErrorMessage(null);
  }

  // Footer totals. Each one sums a value across every line.

  // subTotal: list price × qty, before discount
  const subTotal = lines.reduce((runningTotal, line) => {
    const pricedRow = pricedBySku[line.sku];
    const unitListPrice = pricedRow?.listPrice ?? pricedRow?.price;
    return typeof unitListPrice === "number"
      ? runningTotal + unitListPrice * line.quantity
      : runningTotal;
  }, 0);

  // discount: what the account saves (list price minus paid price)
  const discount = lines.reduce((runningTotal, line) => {
    const pricedRow = pricedBySku[line.sku];
    const listPrice = pricedRow?.listPrice;
    const paidPrice = pricedRow?.price;
    if (typeof listPrice === "number" && typeof paidPrice === "number") {
      return runningTotal + (listPrice - paidPrice) * line.quantity;
    }
    return runningTotal;
  }, 0);

  // tax: TAX_RATE on the amount after discount
  const tax = (subTotal - discount) * TAX_RATE;

  // total: subtotal minus discount plus tax
  const total = subTotal - discount + tax;

  // internalCost: our cost × qty. "hidden" for non-admins, then we show "Restricted".
  const internalCostIsHidden = lines.some(
    (line) => pricedBySku[line.sku]?.internalCost === "hidden",
  );
  const internalCost = lines.reduce((runningTotal, line) => {
    const costValue = pricedBySku[line.sku]?.internalCost;
    return typeof costValue === "number"
      ? runningTotal + costValue * line.quantity
      : runningTotal;
  }, 0);

  // Lines whose stock check failed; the first one fills the red banner.
  const failedLines = lines.filter((line) => {
    const pricedRow = pricedBySku[line.sku];
    return pricedRow?.stock === "error" || pricedRow?.stockError != null;
  });

  const hasStaleStock = lines.some((line) => isStale(pricedBySku[line.sku]));

  // Empty cart: the "order placed" confirmation, or a hint.
  if (lines.length === 0) {
    return (
      <section className="mb-8 w-full">
        {placedOrderId ? (
          <>
            <h2 className="mb-2 text-lg font-semibold">Your Cart</h2>
            <p className="text-sm text-green-700">
              Order {placedOrderId} placed.
            </p>
          </>
        ) : isLoading ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader />
            <p className="text-lg">Getting quote...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-4 py-16">
            <div className="py-16">
              <p className="text-3xl text-gray-600">Nothing added yet.</p>
              <p className="text-lg">
                Paste SKUs or a product list above, or reorder a past order.
              </p>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mb-8 w-full">
      {/* Heading + Clear button */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Cart Summary
          {isPricing && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              pricing…
            </span>
          )}
        </h2>
        <button
          onClick={clearDraft}
          className="text-sm text-apollo-dark hover:text-red-500 underline cursor-pointer hover:no-underline"
        >
          Empty Cart
        </button>
      </div>

      {/* Purple while the buyer's last submit is still being looked up, then
          the red stock-failure banner, then the stale-data reminder.
          Kept generic, the row and the log below both have the real reason. */}
      {isLoading ? (
        <Alert className="my-3 border-purple-300 bg-purple-100 text-black">
          <Loader2 className="animate-spin" />
          <AlertDescription>Updating cart...</AlertDescription>
        </Alert>
      ) : failedLines.length > 0 ? (
        <Alert variant="destructive" className="my-3 border-red-600 bg-red-50">
          <AlertTriangleIcon />
          <AlertDescription>
            {failedLines.length} {failedLines.length === 1 ? "item" : "items"}{" "}
            could not be checked. See below for details.
          </AlertDescription>
        </Alert>
      ) : hasStaleStock ? (
        <Alert className="my-3 border-amber-300 bg-orange-100 text-black">
          <AlertTriangleIcon />
          <AlertDescription>
            Stock data may be a few hours old, please <strong>call</strong> to
            confirm before ordering. 604-236-0000
          </AlertDescription>
        </Alert>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="w-1/7">Qty</TableHead>
            <TableHead className="w-1/7">Price</TableHead>
            <TableHead className="w-1/7">Stock</TableHead>
            <TableHead className="w-1/7">Lead time</TableHead>
            <TableHead className="w-1/7">Warehouse</TableHead>
            <TableHead className="text-right">Line total</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>

        <TableBody>
          {lines.map((line) => {
            // The priced row for this line, if any.
            const pricedRow = pricedBySku[line.sku];
            // no priced row yet means the line has never been checked. it is waiting on the current price request, not permanently blank.
            const isRowLoading = !pricedRow;
            const unitPrice = pricedRow?.price;
            const stockLevel = pricedRow?.stock;
            const stockCheckedAt =
              typeof pricedRow?.stockLastUpdated === "string" &&
              pricedRow.stockLastUpdated !== "hidden" &&
              pricedRow.stockLastUpdated !== "error"
                ? pricedRow.stockLastUpdated
                : pricedRow?.calculatedAt;
            return (
              <TableRow key={line.sku}>
                {/* Name, sku, and a green source tag for PO/order/suggestion. */}
                <TableCell>
                  <div>{line.productName}</div>
                  <div className="font-mono text-xs text-gray-500">
                    {line.sku}
                  </div>
                  {line.sourceRef ? (
                    <>
                      <div className="text-xs font-medium text-green-700">
                        from {line.sourceRef}
                      </div>

                      {line.sourceDate && (
                        <div className="text-xs text-gray-500">
                          {formatSourceDate(line.sourceDate)}
                        </div>
                      )}
                    </>
                  ) : line.source === "suggestion" ? (
                    <div className="text-xs font-medium text-green-700">
                      suggested
                    </div>
                  ) : null}
                </TableCell>

                {/* Editable qty, min 1. */}
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(event) =>
                      setQuantity(line.sku, Number(event.target.value) || 1)
                    }
                    className="w-20"
                    aria-label={`Quantity for ${line.productName}`}
                  />
                </TableCell>

                {/* Price per unit. */}
                <TableCell>
                  {typeof unitPrice === "number" ? (
                    `$${unitPrice.toFixed(2)}`
                  ) : isRowLoading ? (
                    <LoadingCell />
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Stock count + check time, or "—" if hidden, or an error.
                    whitespace-normal so a long error message wraps here
                    instead of forcing the whole table wider. */}
                <TableCell className="whitespace-normal">
                  {typeof stockLevel === "number" ? (
                    <>
                      {stockLevel}
                      {stockCheckedAt && (
                        <div className="text-xs text-gray-600">
                          as of {formatStockCheckTime(stockCheckedAt)}
                        </div>
                      )}
                    </>
                  ) : stockLevel === "hidden" ? (
                    "—"
                  ) : stockLevel === "error" ? (
                    <span className="text-red-900">
                      {pricedRow?.stockError
                        ? buyerErrorMessage(pricedRow.stockError)
                        : "Stock check failed."}
                    </span>
                  ) : stockLevel ? (
                    <span className="text-red-900">
                      {buyerErrorMessage(stockLevel)}
                    </span>
                  ) : isRowLoading ? (
                    <LoadingCell />
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Lead time in days. */}
                <TableCell>
                  {pricedRow?.leadTime != null ? (
                    `${pricedRow.leadTime} ${
                      pricedRow.leadTime === 1 ? "day" : "days"
                    }`
                  ) : isRowLoading ? (
                    <LoadingCell />
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Warehouse, or "Restricted". */}
                <TableCell>
                  {pricedRow?.warehouse === "hidden" ? (
                    "Restricted"
                  ) : pricedRow?.warehouse ? (
                    pricedRow.warehouse
                  ) : isRowLoading ? (
                    <LoadingCell />
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Price per unit × qty. */}
                <TableCell className="text-right">
                  {typeof unitPrice === "number" ? (
                    `$${(unitPrice * line.quantity).toFixed(2)}`
                  ) : isRowLoading ? (
                    <LoadingCell />
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Remove Item line. */}
                <TableCell>
                  <button
                    onClick={() => removeLine(line.sku)}
                    aria-label={`Remove ${line.productName}`}
                    className="px-1 align-middle text-gray-500 hover:text-red-600"
                  >
                    <CircleX size={16} className="cursor-pointer" />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>

        {/* Totals (see the comments above the calculations). */}
        <TableFooter>
          <TableRow>
            <TableCell colSpan={6}>Sub Total</TableCell>
            <TableCell className="text-right">${subTotal.toFixed(2)}</TableCell>
            <TableCell />
          </TableRow>
          <TableRow>
            <TableCell colSpan={6}>Discount</TableCell>
            <TableCell className="text-right">
              {discount > 0 ? `-$${discount.toFixed(2)}` : "$0.00"}
            </TableCell>
            <TableCell />
          </TableRow>
          <TableRow>
            <TableCell colSpan={6}>Tax</TableCell>
            <TableCell className="text-right">${tax.toFixed(2)}</TableCell>
            <TableCell />
          </TableRow>
          <TableRow>
            <TableCell colSpan={6}>Total</TableCell>
            <TableCell className="text-right">${total.toFixed(2)}</TableCell>
            <TableCell />
          </TableRow>
          <TableRow>
            <TableCell colSpan={6}>Internal Cost</TableCell>
            <TableCell className="text-right">
              {internalCostIsHidden
                ? "Restricted"
                : `$${internalCost.toFixed(2)}`}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>

      {errorMessage && (
        <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
      )}

      {/* can't place an order while a line's stock could not be confirmed. */}
      {failedLines.length > 0 && (
        <p className="mt-2 text-sm text-red-700">
          Fix or remove the item(s) that could not be checked before placing
          this order.
        </p>
      )}

      {/* Place order. Disabled while busy, with no account, or a stock check failed. */}
      <div className="mt-4">
        <Button
          onClick={placeOrder}
          disabled={
            isPlacingOrder || isPricing || !accountId || failedLines.length > 0
          }
          className="rounded-lg bg-black px-4 py-2 text-apollo-light hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPlacingOrder ? "Placing…" : "Place order"}
        </Button>
      </div>
    </section>
  );
}
