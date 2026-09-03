"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";

import { AccountContext } from "@/components/account/AccountContext";
import { DraftOrderContext } from "@/components/draft-order/DraftOrderContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrderItem = { sku: string; quantity: number; productName: string | null };
type PastOrder = { id: string; timestamp: string; items: OrderItem[] };

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
    const controller = new AbortController();

    fetch(`/api/orders?accountId=${accountId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.error) {
          setError(data.error.message ?? "Couldn't load your orders.");
          setOrders([]);
        } else {
          setError(null);
          setOrders(data.orders ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your orders.");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accountId]);

  function handleAdd(
    picked: { sku: string; productName: string; quantity: number }[],
  ) {
    if (picked.length === 0) return;
    addLines(picked.map((p) => ({ ...p, source: "past-order" as const })));
    setAdded(
      `Added ${picked.length} item${picked.length === 1 ? "" : "s"} to your order.`,
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-start px-16 py-16 text-left">
      <h1 className="mb-8 max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black">
        Orders
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
          <ul className="flex w-full max-w-2xl flex-col gap-4">
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

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-medium">Order {order.id}</span>
        <span className="text-sm text-gray-500">
          {formatDate(order.timestamp)}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {order.items.map((it) => (
          <li key={it.sku} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={!!selected[it.sku]}
              disabled={!it.productName}
              onChange={(e) =>
                setSelected((s) => ({ ...s, [it.sku]: e.target.checked }))
              }
              className="size-4"
              aria-label={`Include ${it.productName ?? it.sku}`}
            />
            <span className="flex-1">
              {it.productName ? (
                <>
                  {it.productName}
                  <span className="ml-2 font-mono text-xs text-gray-500">
                    {it.sku}
                  </span>
                </>
              ) : (
                <span className="text-gray-500">
                  {it.sku} — no longer in the catalog
                </span>
              )}
            </span>
            <Input
              type="number"
              min={1}
              value={qty[it.sku]}
              disabled={!it.productName}
              onChange={(e) =>
                setQty((q) => ({
                  ...q,
                  [it.sku]: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                }))
              }
              className="w-20"
              aria-label={`Quantity for ${it.productName ?? it.sku}`}
            />
          </li>
        ))}
      </ul>

      <Button
        onClick={() =>
          onAdd(
            chosen.map((i) => ({
              sku: i.sku,
              productName: i.productName as string,
              quantity: qty[i.sku],
            })),
          )
        }
        disabled={chosen.length === 0}
        className="mt-3 rounded-lg bg-black px-3 py-1.5 text-apollo-light hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add selected to your order
      </Button>
    </div>
  );
}
