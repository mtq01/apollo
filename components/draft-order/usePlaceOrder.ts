/* Places the order and clears the cart. It only handles the order request
   and the confirmation. Pricing lives in useCartPricing. */

import { useState } from "react";
import type { DraftLine } from "@/components/draft-order/DraftOrderContext";
import type { ActivityCategory } from "@/types";

type UsePlaceOrderParams = {
  accountId: number | null;
  lines: DraftLine[];
  // True when any line's stock check failed. Blocks the order.
  hasFailedLines: boolean;
  clear: () => void;
  logEvent: (message: string, category?: ActivityCategory) => void;
  setErrorMessage: (message: string | null) => void;
};

export function usePlaceOrder({
  accountId,
  lines,
  hasFailedLines,
  clear,
  logEvent,
  setErrorMessage,
}: UsePlaceOrderParams) {
  // True while "Place order" is running.
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // The new order id after a successful order. Shown as a confirmation.
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  // Sends the order to POST /api/orders, then saves the id and empties the cart.
  async function placeOrder() {
    /* Never place an order with a line whose stock could not be confirmed.
       The button is disabled for this too. This is a second check, just in case. */
    if (!accountId || lines.length === 0 || hasFailedLines) return;
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
      setErrorMessage(
        "This demo doesn't have a database connected, so orders can't actually be saved. In a real deployment this would complete the checkout process.",
      );
      logEvent("Could not reach the server", "error");
    } finally {
      setIsPlacingOrder(false);
    }
  }

  // Empties the cart and clears leftover messages.
  function clearDraft() {
    if (lines.length > 0) logEvent("Cleared the cart", "order");
    clear();
    setPlacedOrderId(null);
    setErrorMessage(null);
  }

  return { isPlacingOrder, placedOrderId, placeOrder, clearDraft };
}
