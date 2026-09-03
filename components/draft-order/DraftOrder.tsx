"use client";

/* The "Your Cart" section on the reorder page.

  The item list lives in DraftOrderContext, so the paste box and the orders
  page can add to it. This component reads that list, re-prices it on the
  server whenever it changes, shows the table with totals, and places the
  order. Prices are never stored on a line, so the numbers always match the
  current catalog and account. */

import { useCallback, useContext, useEffect, useRef, useState } from "react";

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
import { AlertTriangleIcon } from "lucide-react";
import type { ActivityEvent, ErrorType, ForcedFailure } from "@/types";

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
  events?: ActivityEvent[]; // steps for the activity log
};

// Same rate the reorder page uses on invoices.
const TAX_RATE = 0.07;

// Wait this long after the last change before re-pricing, so we don't fire a
// request on every keystroke.
const PRICE_REFRESH_DELAY_MS = 500;

// A server timestamp as a short time like "2:45 PM".
function formatStockCheckTime(isoTimestamp: string) {
  return new Date(isoTimestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DraftOrder({
  forceFailure,
}: {
  // From the demo dropdown; makes the re-price fail on purpose.
  forceFailure?: ForcedFailure | null;
}) {
  // The active account. Prices depend on it; actions are blocked until one is picked.
  const { accountId } = useContext(AccountContext);

  // The activity log sidebar. We push the server's steps into it on each re-price.
  const { setEvents } = useContext(ActivityContext);

  // The shared cart: the items plus the ways to change them.
  const { lines, setQuantity, removeLine, clear } =
    useContext(DraftOrderContext);

  // Latest prices from the server, keyed by sku.
  const [pricedBySku, setPricedBySku] = useState<Record<string, PricedRow>>({});

  // True while a price request is running.
  const [isPricing, setIsPricing] = useState(false);

  // Shown when a request fails.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // True while "Place order" is running.
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // The new order id after a successful "Place order"; shown as a confirmation.
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  // AbortController for the in-flight price request, so a stale response can't overwrite newer prices.
  const priceRequestRef = useRef<AbortController | null>(null);

  /* Re-price every line. In useCallback so the timer effect only restarts when
     its inputs change. */
  const refreshPrices = useCallback(async () => {
    // Drop any earlier request so a slow one can't land after a newer one.
    priceRequestRef.current?.abort();

    // Nothing to price without an account or items.
    if (!accountId || lines.length === 0) {
      setPricedBySku({});
      setEvents([]);
      setErrorMessage(null);
      return;
    }

    // Start a request we can cancel later.
    const abortController = new AbortController();
    priceRequestRef.current = abortController;
    setIsPricing(true);
    setErrorMessage(null);

    try {
      // Price every line. forceFailure is only set from the demo dropdown.
      const response = await fetch("/api/quote/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          items: lines.map((line) => ({
            sku: line.sku,
            quantity: line.quantity,
          })),
          forceFailure: forceFailure ?? undefined,
        }),
        signal: abortController.signal,
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data?.error?.message ?? "Couldn't price this order.");
        return;
      }

      // Index the priced rows by sku, and gather the activity events.
      const nextPricedBySku: Record<string, PricedRow> = {};
      const activityEvents: ActivityEvent[] = [];
      for (const quoteRow of (data.quotes ?? []) as PricedRow[]) {
        if (quoteRow.sku) nextPricedBySku[quoteRow.sku] = quoteRow;
        if (quoteRow.events) activityEvents.push(...quoteRow.events);
      }
      setPricedBySku(nextPricedBySku);
      setEvents(activityEvents);
    } catch {
      // Aborts land here too; only a real failure gets a message.
      if (!abortController.signal.aborted) {
        setErrorMessage("Couldn't reach the server.");
      }
    } finally {
      if (!abortController.signal.aborted) setIsPricing(false);
    }
  }, [accountId, lines, forceFailure, setEvents]);

  // Debounce: every change clears the old timer and starts a new one, so only a pause triggers the re-price.
  useEffect(() => {
    const timerId = setTimeout(refreshPrices, PRICE_REFRESH_DELAY_MS);
    return () => clearTimeout(timerId);
  }, [refreshPrices]);

  // Place the order via POST /api/orders, then remember the id and empty the cart.
  async function placeOrder() {
    if (!accountId || lines.length === 0) return;
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
        setErrorMessage(data?.error?.message ?? "Couldn't place the order.");
        return;
      }
      setPlacedOrderId(data.order.id);
      clear();
    } catch {
      setErrorMessage("Couldn't reach the server.");
    } finally {
      setIsPlacingOrder(false);
    }
  }

  // Empty the cart and clear any leftover messages.
  function clearDraft() {
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
  const firstFailedError = failedLines[0]
    ? pricedBySku[failedLines[0].sku]?.stockError
    : undefined;

  // Empty cart: the "order placed" confirmation, or a hint.
  if (lines.length === 0) {
    return (
      <section className="mb-8 w-full max-w-4xl">
        <h2 className="mb-2 text-lg font-semibold">Your Cart</h2>
        {placedOrderId ? (
          <p className="text-sm text-green-700">
            Order {placedOrderId} placed.
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            Nothing added yet. Paste SKUs or a product list above, or reorder a
            past order.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mb-8 w-full max-w-4xl">
      {/* Heading + Clear button */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Your Cart: Continue adding or removing items
          {isPricing && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              pricing…
            </span>
          )}
        </h2>
        <button
          onClick={clearDraft}
          className="text-sm text-gray-600 underline hover:no-underline"
        >
          Clear
        </button>
      </div>

      {/* Red banner if a stock check failed, otherwise the stale-data reminder. */}
      {failedLines.length > 0 ? (
        <Alert variant="destructive" className="my-3 border-red-600 bg-red-50">
          <AlertTriangleIcon />
          <AlertDescription>
            {failedLines[0].productName}:{" "}
            {firstFailedError
              ? buyerErrorMessage(firstFailedError)
              : "Something went wrong checking stock."}
            {failedLines.length > 1 &&
              ` (${failedLines.length} items affected)`}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="my-3 border-amber-300 bg-orange-100 text-black">
          <AlertTriangleIcon />
          <AlertDescription>
            Stock data may be a few hours old, please confirm before ordering.
          </AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="w-24">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Lead time</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead className="text-right">Line total</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>

        <TableBody>
          {lines.map((line) => {
            // The priced row for this line, if any.
            const pricedRow = pricedBySku[line.sku];
            const unitPrice = pricedRow?.price;
            const stockLevel = pricedRow?.stock;
            return (
              <TableRow key={line.sku}>
                {/* Name, sku, and a green source tag for PO/order/suggestion. */}
                <TableCell>
                  <div>{line.productName}</div>
                  <div className="font-mono text-xs text-gray-500">
                    {line.sku}
                  </div>
                  {line.sourceRef ? (
                    <div className="text-xs font-medium text-green-700">
                      from {line.sourceRef}
                    </div>
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
                <TableCell className="text-right">
                  {typeof unitPrice === "number"
                    ? `$${unitPrice.toFixed(2)}`
                    : "—"}
                </TableCell>

                {/* Stock count + check time, or "—" if hidden, or an error. */}
                <TableCell>
                  {typeof stockLevel === "number" ? (
                    <>
                      {stockLevel}
                      {pricedRow?.calculatedAt && (
                        <div className="text-xs text-gray-600">
                          as of {formatStockCheckTime(pricedRow.calculatedAt)}
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
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Lead time in days. */}
                <TableCell>
                  {pricedRow?.leadTime != null
                    ? `${pricedRow.leadTime} ${
                        pricedRow.leadTime === 1 ? "day" : "days"
                      }`
                    : "—"}
                </TableCell>

                {/* Warehouse, or "Restricted". */}
                <TableCell>
                  {pricedRow?.warehouse === "hidden"
                    ? "Restricted"
                    : (pricedRow?.warehouse ?? "—")}
                </TableCell>

                {/* Price per unit × qty. */}
                <TableCell className="text-right">
                  {typeof unitPrice === "number"
                    ? `$${(unitPrice * line.quantity).toFixed(2)}`
                    : "—"}
                </TableCell>

                {/* Remove line. */}
                <TableCell>
                  <button
                    onClick={() => removeLine(line.sku)}
                    aria-label={`Remove ${line.productName}`}
                    className="px-1 text-gray-500 hover:text-black"
                  >
                    ×
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

      {/* Place order. Disabled while busy or with no account. */}
      <div className="mt-4">
        <Button
          onClick={placeOrder}
          disabled={isPlacingOrder || isPricing || !accountId}
          className="rounded-lg bg-black px-4 py-2 text-apollo-light hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPlacingOrder ? "Placing…" : "Place order"}
        </Button>
      </div>
    </section>
  );
}
