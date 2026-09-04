"use client";

/* The Orders page. Lists past orders. Each is a card where the buyer ticks
   lines, adjusts quantities, and adds them to the reorder-page cart. */

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { AccountContext } from "@/components/account/AccountContext";
import { DraftOrderContext } from "@/components/draft-order/DraftOrderContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { TAX_RATE } from "@/lib/erp/summarizeOrder";

// One line of a past order, priced by GET /api/orders. productName and price
// are null when the sku has left the catalog.
type OrderItem = {
  sku: string;
  quantity: number;
  productName: string | null;
  price: number | null; // per unit, paid
  listPrice: number | null; // per unit, before discount
  internalCost: number | "hidden" | null; // per unit; "hidden" for non-admins
};
type PastOrder = { id: string; timestamp: string; items: OrderItem[] };

// A timestamp as a short date like "Sep 3, 2026".
function formatDate(isoTimestamp: string) {
  return new Date(isoTimestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrdersPage() {
  const { accountId } = useContext(AccountContext);
  const { addLines } = useContext(DraftOrderContext);

  const [orders, setOrders] = useState<PastOrder[] | null>(null); // null = loading
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null); // "Add selected" confirmation

  // Load this account's orders. Re-runs when the account changes.
  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/orders?accountId=${accountId}`);
        const data = await response.json();
        if (cancelled) return;
        if (data?.error) {
          setErrorMessage(data.error.message ?? "Couldn't load your orders.");
          setOrders([]);
        } else {
          setErrorMessage(null);
          setOrders(data.orders ?? []);
        }
      } catch {
        if (!cancelled) setErrorMessage("Couldn't load your orders.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  // Add the ticked lines to the cart, tagged with the order, then confirm.
  function handleAdd(
    orderId: string,
    pickedItems: { sku: string; productName: string; quantity: number }[],
  ) {
    if (pickedItems.length === 0) return;
    addLines(
      pickedItems.map((item) => ({
        ...item,
        source: "past-order" as const,
        sourceRef: orderId,
      })),
    );
    const itemCount = pickedItems.length;
    const message = `Added ${itemCount} item${itemCount === 1 ? "" : "s"} from ${orderId}`;
    toast.success(message);
    setAddedMessage(`${message}.`);
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-start px-16 py-16 text-left">
      <h1 className="mb-8 max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black">
        Order History
      </h1>

      {!accountId ? (
        <p className="text-sm text-gray-600">
          Select an account to see your past orders.
        </p>
      ) : errorMessage ? (
        <p className="text-sm text-red-700">{errorMessage}</p>
      ) : orders === null ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-600">No past orders yet.</p>
      ) : (
        <>
          {addedMessage && (
            <p className="mb-6 text-sm text-green-700">
              {addedMessage}{" "}
              <Link href="/" className="underline hover:no-underline">
                Go to Reorder
              </Link>
            </p>
          )}
          {/* max-w controls the width of the table card on orders page */}
          <ul className="flex w-full max-w flex-col gap-6">
            {orders.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} onAdd={handleAdd} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function OrderCard({
  order,
  onAdd,
}: {
  order: PastOrder;
  onAdd: (
    orderId: string,
    pickedItems: { sku: string; productName: string; quantity: number }[],
  ) => void;
}) {
  // Ticked lines, keyed by sku. Lines with no catalog match start unticked.
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      order.items.map((item) => [item.sku, Boolean(item.productName)]),
    ),
  );
  // Quantity per line, keyed by sku. Starts at the order's own quantity.
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.items.map((item) => [item.sku, item.quantity])),
  );

  // Ticked lines that still exist in the catalog.
  const chosenItems = order.items.filter(
    (item) => selected[item.sku] && item.productName,
  );

  // Totals over the ticked lines, so the card shows what you're about to add.
  // subTotal: list price × qty
  const subTotal = chosenItems.reduce(
    (runningTotal, item) =>
      runningTotal +
      (item.listPrice ?? item.price ?? 0) * (quantities[item.sku] ?? 0),
    0,
  );
  // discount: the saving (list price minus paid)
  const discount = chosenItems.reduce(
    (runningTotal, item) =>
      runningTotal +
      ((item.listPrice ?? 0) - (item.price ?? 0)) * (quantities[item.sku] ?? 0),
    0,
  );
  // tax: TAX_RATE after discount. total: the three combined.
  const tax = (subTotal - discount) * TAX_RATE;
  const total = subTotal - discount + tax;

  // internalCost: admin-only; the API sends "hidden" for everyone else.
  const internalCostHidden = order.items.some(
    (item) => item.internalCost === "hidden",
  );
  const internalCost = chosenItems.reduce(
    (runningTotal, item) =>
      runningTotal +
      (typeof item.internalCost === "number" ? item.internalCost : 0) *
        (quantities[item.sku] ?? 0),
    0,
  );

  return (
    <Card className="relative w-full">
      <CardHeader>
        <CardAction>
          <Badge variant="secondary">
            {order.items.length} item{order.items.length === 1 ? "" : "s"}
          </Badge>
        </CardAction>
        <CardTitle>Purchase Order: {order.id}</CardTitle>
        <CardDescription>
          Submitted: {formatDate(order.timestamp)}
        </CardDescription>
      </CardHeader>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1" />
            <TableHead className="w-1/5">SKU</TableHead>
            <TableHead className="w-1/5">Quantity</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Line total</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {order.items.map((item) => {
            // Only lines with a catalog match can be picked.
            const available = Boolean(item.productName);
            const lineTotal =
              item.price != null
                ? item.price * (quantities[item.sku] ?? 0)
                : null;
            return (
              <TableRow key={item.sku}>
                {/* Include this line */}
                <TableCell>
                  <input
                    type="checkbox"
                    checked={!!selected[item.sku]}
                    disabled={!available}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        [item.sku]: event.target.checked,
                      }))
                    }
                    className="size-4"
                    aria-label={`Include ${item.productName ?? item.sku}`}
                  />
                </TableCell>

                <TableCell className="font-medium">
                  <div>
                    {item.productName ?? (
                      <span className="text-gray-500">
                        no longer in the catalog
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-gray-500">
                    {item.sku}
                  </div>
                </TableCell>

                {/* Editable qty, min 1 */}
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={quantities[item.sku]}
                    disabled={!available}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.sku]: Math.max(
                          1,
                          Math.floor(Number(event.target.value) || 1),
                        ),
                      }))
                    }
                    className="w-20"
                    aria-label={`Quantity for ${item.productName ?? item.sku}`}
                  />
                </TableCell>

                <TableCell className="text-right">
                  {item.price != null ? `$${item.price.toFixed(2)}` : "—"}
                </TableCell>

                <TableCell className="text-right">
                  {lineTotal != null ? `$${lineTotal.toFixed(2)}` : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>

        {/* Totals (see the comments above the calculations) */}
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Sub Total</TableCell>
            <TableCell className="text-right">${subTotal.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={4}>Discount</TableCell>
            <TableCell className="text-right">
              {discount > 0 ? `-$${discount.toFixed(2)}` : "$0.00"}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={4}>Tax</TableCell>
            <TableCell className="text-right">${tax.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={4}>Total</TableCell>
            <TableCell className="text-right">${total.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={4}>Internal Cost</TableCell>
            <TableCell className="text-right">
              {internalCostHidden
                ? "Restricted"
                : `$${internalCost.toFixed(2)}`}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <CardFooter>
        <Button
          onClick={() =>
            onAdd(
              order.id,
              chosenItems.map((item) => ({
                sku: item.sku,
                productName: item.productName as string,
                quantity: quantities[item.sku],
              })),
            )
          }
          disabled={chosenItems.length === 0}
          className="rounded-lg bg-black px-3 py-1.5 text-apollo-light hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add selected to your order
        </Button>
      </CardFooter>
    </Card>
  );
}
