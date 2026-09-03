"use client";

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

type OrderItem = {
  sku: string;
  quantity: number;
  productName: string | null;
  price: number | null;
  listPrice: number | null;
  internalCost: number | "hidden" | null;
};
type PastOrder = { id: string; timestamp: string; items: OrderItem[] };

// same 7% the reorder page uses on invoices
const TAX_RATE = 0.07;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrdersPage() {
  const { accountId } = useContext(AccountContext);
  const { addLines } = useContext(DraftOrderContext);

  const [orders, setOrders] = useState<PastOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch(`/api/orders?accountId=${accountId}`);
        const data = await r.json();
        if (cancelled) return;
        if (data?.error) {
          setError(data.error.message ?? "Couldn't load your orders.");
          setOrders([]);
        } else {
          setError(null);
          setOrders(data.orders ?? []);
        }
      } catch {
        if (!cancelled) setError("Couldn't load your orders.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  function handleAdd(
    orderId: string,
    picked: { sku: string; productName: string; quantity: number }[],
  ) {
    if (picked.length === 0) return;
    addLines(
      picked.map((p) => ({
        ...p,
        source: "past-order" as const,
        sourceRef: orderId,
      })),
    );
    const msg = `Added ${picked.length} item${picked.length === 1 ? "" : "s"} from ${orderId}`;
    toast.success(msg);
    setAdded(`${msg}.`);
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
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : orders === null ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-600">No past orders yet.</p>
      ) : (
        <>
          {added && (
            <p className="mb-6 text-sm text-green-700">
              {added}{" "}
              <Link href="/" className="underline hover:no-underline">
                Go to Reorder
              </Link>
            </p>
          )}
          <ul className="flex w-full max-w-3xl flex-col gap-6">
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
    picked: { sku: string; productName: string; quantity: number }[],
  ) => void;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(order.items.map((i) => [i.sku, Boolean(i.productName)])),
  );
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.items.map((i) => [i.sku, i.quantity])),
  );

  const chosen = order.items.filter((i) => selected[i.sku] && i.productName);

  // totals over the ticked lines, so the card reflects what you're about to add
  const subTotal = chosen.reduce(
    (sum, i) => sum + (i.listPrice ?? i.price ?? 0) * (qty[i.sku] ?? 0),
    0,
  );
  const discount = chosen.reduce(
    (sum, i) =>
      sum + ((i.listPrice ?? 0) - (i.price ?? 0)) * (qty[i.sku] ?? 0),
    0,
  );
  const tax = (subTotal - discount) * TAX_RATE;
  const total = subTotal - discount + tax;

  // internal cost is admin-only; the API sends "hidden" for everyone else
  const costHidden = order.items.some((i) => i.internalCost === "hidden");
  const internalCost = chosen.reduce(
    (sum, i) =>
      sum +
      (typeof i.internalCost === "number" ? i.internalCost : 0) *
        (qty[i.sku] ?? 0),
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
            <TableHead className="w-8" />
            <TableHead className="w-25">SKU</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Line total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((it) => {
            const available = Boolean(it.productName);
            const lineTotal =
              it.price != null ? it.price * (qty[it.sku] ?? 0) : null;
            return (
              <TableRow key={it.sku}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={!!selected[it.sku]}
                    disabled={!available}
                    onChange={(e) =>
                      setSelected((s) => ({
                        ...s,
                        [it.sku]: e.target.checked,
                      }))
                    }
                    className="size-4"
                    aria-label={`Include ${it.productName ?? it.sku}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{it.sku}</TableCell>
                <TableCell>
                  {it.productName ?? (
                    <span className="text-gray-500">
                      no longer in the catalog
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={qty[it.sku]}
                    disabled={!available}
                    onChange={(e) =>
                      setQty((q) => ({
                        ...q,
                        [it.sku]: Math.max(
                          1,
                          Math.floor(Number(e.target.value) || 1),
                        ),
                      }))
                    }
                    className="w-20"
                    aria-label={`Quantity for ${it.productName ?? it.sku}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {it.price != null ? `$${it.price.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {lineTotal != null ? `$${lineTotal.toFixed(2)}` : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5}>Sub Total</TableCell>
            <TableCell className="text-right">${subTotal.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={5}>Discount</TableCell>
            <TableCell className="text-right">
              {discount > 0 ? `-$${discount.toFixed(2)}` : "$0.00"}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={5}>Tax</TableCell>
            <TableCell className="text-right">${tax.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={5}>Total</TableCell>
            <TableCell className="text-right">${total.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={5}>Internal Cost</TableCell>
            <TableCell className="text-right">
              {costHidden ? "Restricted" : `$${internalCost.toFixed(2)}`}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <CardFooter>
        <Button
          onClick={() =>
            onAdd(
              order.id,
              chosen.map((i) => ({
                sku: i.sku,
                productName: i.productName as string,
                quantity: qty[i.sku],
              })),
            )
          }
          disabled={chosen.length === 0}
          className="rounded-lg bg-black px-3 py-1.5 text-apollo-light hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add selected to your order
        </Button>
      </CardFooter>
    </Card>
  );
}
