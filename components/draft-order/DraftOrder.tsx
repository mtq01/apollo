"use client";

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

// one priced row back from /api/quote/items, keyed by sku for lookup
type PricedRow = {
  sku?: string;
  name: string;
  quantity: number | null;
  price?: number;
  listPrice?: number;
  internalCost?: number | "hidden" | null;
  stock?: number | "hidden" | "error" | ErrorType;
  stockError?: ErrorType;
  leadTime?: number;
  warehouse?: string | "hidden";
  calculatedAt?: string;
  events?: ActivityEvent[];
};

// same 7% the reorder page uses on invoices
const TAX_RATE = 0.07;

function formatCheckedAt(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

const REPRICE_DELAY = 500;

export function DraftOrder({
  forceFailure,
}: {
  forceFailure?: ForcedFailure | null;
}) {
  const { accountId } = useContext(AccountContext);
  const { setEvents } = useContext(ActivityContext);
  const { lines, setQuantity, removeLine, clear } =
    useContext(DraftOrderContext);

  const [priced, setPriced] = useState<Record<string, PricedRow>>({});
  const [pricing, setPricing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  // re-price the whole draft against /api/quote/items so the total is always
  // real, even after a quantity edit.
  const reprice = useCallback(async () => {
    controller.current?.abort();

    if (!accountId || lines.length === 0) {
      setPriced({});
      setEvents([]);
      setError(null);
      return;
    }

    const ac = new AbortController();
    controller.current = ac;
    setPricing(true);
    setError(null);

    try {
      const res = await fetch("/api/quote/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          items: lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
          forceFailure: forceFailure ?? undefined,
        }),
        signal: ac.signal,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message ?? "Couldn't price this order.");
        return;
      }

      const bySku: Record<string, PricedRow> = {};
      const events: ActivityEvent[] = [];
      for (const row of (data.quotes ?? []) as PricedRow[]) {
        if (row.sku) bySku[row.sku] = row;
        if (row.events) events.push(...row.events);
      }
      setPriced(bySku);
      setEvents(events);
    } catch {
      if (!ac.signal.aborted) setError("Couldn't reach the server.");
    } finally {
      if (!ac.signal.aborted) setPricing(false);
    }
  }, [accountId, lines, forceFailure, setEvents]);

  useEffect(() => {
    const t = setTimeout(reprice, REPRICE_DELAY);
    return () => clearTimeout(t);
  }, [reprice]);

  async function placeOrder() {
    if (!accountId || lines.length === 0) return;
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          items: lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Couldn't place the order.");
        return;
      }
      setPlacedOrderId(data.order.id);
      clear();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setPlacing(false);
    }
  }

  function clearDraft() {
    clear();
    setPlacedOrderId(null);
    setError(null);
  }

  // full breakdown over every draft line, mirroring the order cards
  const subTotal = lines.reduce((sum, l) => {
    const row = priced[l.sku];
    const lp = row?.listPrice ?? row?.price;
    return typeof lp === "number" ? sum + lp * l.quantity : sum;
  }, 0);
  const discount = lines.reduce((sum, l) => {
    const row = priced[l.sku];
    return typeof row?.listPrice === "number" && typeof row?.price === "number"
      ? sum + (row.listPrice - row.price) * l.quantity
      : sum;
  }, 0);
  const tax = (subTotal - discount) * TAX_RATE;
  const total = subTotal - discount + tax;
  const costHidden = lines.some(
    (l) => priced[l.sku]?.internalCost === "hidden",
  );
  const internalCost = lines.reduce((sum, l) => {
    const ic = priced[l.sku]?.internalCost;
    return typeof ic === "number" ? sum + ic * l.quantity : sum;
  }, 0);

  // lines whose ERP stock check failed (timeout, not found, ...)
  const failedLines = lines.filter((l) => {
    const row = priced[l.sku];
    return row?.stock === "error" || row?.stockError != null;
  });
  const firstFailedError = failedLines[0]
    ? priced[failedLines[0].sku]?.stockError
    : undefined;

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
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Your Cart: Continue adding or removing items
          {pricing && (
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

      {failedLines.length > 0 ? (
        <Alert
          variant="destructive"
          className="my-3 border-red-600 bg-red-50"
        >
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
            const row = priced[line.sku];
            const unit = row?.price;
            const stock = row?.stock;
            return (
              <TableRow key={line.sku}>
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
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      setQuantity(line.sku, Number(e.target.value) || 1)
                    }
                    className="w-20"
                    aria-label={`Quantity for ${line.productName}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {typeof unit === "number" ? `$${unit.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell>
                  {typeof stock === "number" ? (
                    <>
                      {stock}
                      {row?.calculatedAt && (
                        <div className="text-xs text-gray-600">
                          as of {formatCheckedAt(row.calculatedAt)}
                        </div>
                      )}
                    </>
                  ) : stock === "hidden" ? (
                    "—"
                  ) : stock === "error" ? (
                    <span className="text-red-900">
                      {row?.stockError
                        ? buyerErrorMessage(row.stockError)
                        : "Stock check failed."}
                    </span>
                  ) : stock ? (
                    <span className="text-red-900">
                      {buyerErrorMessage(stock)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {row?.leadTime != null
                    ? `${row.leadTime} ${row.leadTime === 1 ? "day" : "days"}`
                    : "—"}
                </TableCell>
                <TableCell>
                  {row?.warehouse === "hidden"
                    ? "Restricted"
                    : (row?.warehouse ?? "—")}
                </TableCell>
                <TableCell className="text-right">
                  {typeof unit === "number"
                    ? `$${(unit * line.quantity).toFixed(2)}`
                    : "—"}
                </TableCell>
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
              {costHidden ? "Restricted" : `$${internalCost.toFixed(2)}`}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4">
        <Button
          onClick={placeOrder}
          disabled={placing || pricing || !accountId}
          className="rounded-lg bg-black px-4 py-2 text-apollo-light hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {placing ? "Placing…" : "Place order"}
        </Button>
      </div>
    </section>
  );
}
