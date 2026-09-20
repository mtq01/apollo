"use client";

/* The "Your Cart" section on the reorder page.

   The item list lives in DraftOrderContext, so the paste box and the orders
   page can add to it. This component only wires things together: the hooks
   do the pricing and the ordering, and the small components draw the pieces. */

import { useContext } from "react";
import { AccountContext } from "@/components/account/AccountContext";
import { ActivityContext } from "@/components/activity-log/ActivityContext";
import { CartBanners } from "@/components/draft-order/CartBanners";
import { CartEmptyState } from "@/components/draft-order/CartEmptyState";
import { CartTable } from "@/components/draft-order/CartTable";
import { computeCartTotals } from "@/components/draft-order/cartTotals";
import { DraftOrderContext } from "@/components/draft-order/DraftOrderContext";
import {
  hasStockFailure,
  isStale,
} from "@/components/draft-order/pricedRow";
import { useCartPricing } from "@/components/draft-order/useCartPricing";
import { usePlaceOrder } from "@/components/draft-order/usePlaceOrder";
import { Button } from "@/components/ui/button";
import type { ForcedFailure } from "@/types";

export function DraftOrder({
  forceFailure,
  setForceFailureAction,
  isLoading,
}: {
  // From the demo dropdown. Makes the re-price fail on purpose.
  forceFailure?: ForcedFailure | null;
  // Clears the dropdown after one use. The name must end in "Action" so Next allows a function prop on a client component.
  setForceFailureAction?: (value: ForcedFailure | null) => void;
  isLoading?: boolean;
}) {
  // Prices depend on the account, and actions are blocked until one is picked.
  const { accountId } = useContext(AccountContext);
  const { logEvent } = useContext(ActivityContext);

  // The shared cart: the items plus the ways to change them.
  const { lines, setQuantity, removeLine, clear } =
    useContext(DraftOrderContext);

  const { pricedBySku, isPricing, errorMessage, setErrorMessage } =
    useCartPricing({
      accountId,
      lines,
      logEvent,
      forceFailure,
      setForceFailureAction,
    });

  const failedLines = lines.filter((line) =>
    hasStockFailure(pricedBySku[line.sku]),
  );
  const hasStaleStock = lines.some((line) => isStale(pricedBySku[line.sku]));

  const { isPlacingOrder, placedOrderId, placeOrder, clearDraft } =
    usePlaceOrder({
      accountId,
      lines,
      hasFailedLines: failedLines.length > 0,
      clear,
      logEvent,
      setErrorMessage,
    });

  if (lines.length === 0) {
    return (
      <section className="mb-8 w-full">
        <CartEmptyState placedOrderId={placedOrderId} isLoading={isLoading} />
      </section>
    );
  }

  return (
    <section className="mb-8 w-full">
      {/* Heading and empty-cart button. */}
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

      <CartBanners
        isLoading={isLoading}
        failedCount={failedLines.length}
        hasStaleStock={hasStaleStock}
      />

      <CartTable
        lines={lines}
        pricedBySku={pricedBySku}
        totals={computeCartTotals(lines, pricedBySku)}
        setQuantity={setQuantity}
        removeLine={removeLine}
      />

      {errorMessage && (
        <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
      )}

      {/* Explains why the button is off when a stock check failed. */}
      {failedLines.length > 0 && (
        <p className="mt-2 text-sm text-red-700">
          Fix or remove the item(s) that could not be checked before placing
          this order.
        </p>
      )}

      {/* Off while busy, with no account, or when a stock check failed. */}
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
