/* Keeps the cart's prices fresh. Whenever the cart changes, it waits for a
   short pause, then asks the server to price only the lines that need it.
   This is the trickiest logic in the cart, so it lives in one hook that can
   be tested on its own. Prices are never stored on a line, so the numbers
   always match the current catalog and account. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { DraftLine } from "@/components/draft-order/DraftOrderContext";
import {
  isStale,
  type PricedRow,
} from "@/components/draft-order/pricedRow";
import { buyerErrorMessage } from "@/lib/erp/errorMessages";
import type { ActivityCategory, ForcedFailure } from "@/types";

// Wait this long after the last change so we don't send a request on every keystroke.
const PRICE_REFRESH_DELAY_MS = 500;

type UseCartPricingParams = {
  accountId: number | null;
  lines: DraftLine[];
  logEvent: (message: string, category?: ActivityCategory) => void;
  // From the demo dropdown. Makes the price check fail on purpose.
  forceFailure?: ForcedFailure | null;
  // Clears the dropdown after one use. Keeps the "Action" name it has on DraftOrder.
  setForceFailureAction?: (value: ForcedFailure | null) => void;
};

export function useCartPricing({
  accountId,
  lines,
  logEvent,
  forceFailure,
  setForceFailureAction,
}: UseCartPricingParams) {
  // Latest prices from the server, keyed by sku.
  const [pricedBySku, setPricedBySku] = useState<Record<string, PricedRow>>({});

  /* The same prices, kept in a ref too. refreshPrices reads the ref, not the
     state, so saving a new price does not trigger another refresh. */
  const pricedBySkuRef = useRef(pricedBySku);
  const updatePricedBySku = useCallback((next: Record<string, PricedRow>) => {
    pricedBySkuRef.current = next;
    setPricedBySku(next);
  }, []);

  /* The account the cached prices belong to. A new account can mean new
     prices and stock for everyone, so every line gets checked again. */
  const lastPricedAccountId = useRef(accountId);

  /* Always holds the latest forceFailure. It is a ref so that resetting it
     does not restart the price check by itself. */
  const forceFailureRef = useRef(forceFailure);
  useEffect(() => {
    forceFailureRef.current = forceFailure;
  }, [forceFailure]);

  // True while a price request is running.
  const [isPricing, setIsPricing] = useState(false);

  // Shown under the cart when a request fails.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The in-flight request, so an old response can't overwrite newer prices.
  const priceRequestRef = useRef<AbortController | null>(null);

  // useCallback so the timer below only restarts when its inputs change.
  const refreshPrices = useCallback(async () => {
    // Cancel the earlier request so a slow one can't land after a newer one.
    priceRequestRef.current?.abort();

    // Nothing to price without an account or items.
    if (!accountId || lines.length === 0) {
      updatePricedBySku({});
      setErrorMessage(null);
      return;
    }

    /* After an account switch, check every line. Otherwise only check lines
       with no price yet, a past failure, or stale stock. A line that priced
       fine keeps its cached result. */
    const needsFullRefresh = lastPricedAccountId.current !== accountId;
    lastPricedAccountId.current = accountId;

    const linesToCheck = needsFullRefresh
      ? lines
      : lines.filter((line) => {
          const cached = pricedBySkuRef.current[line.sku];
          return !cached || cached.stockError || isStale(cached);
        });

    // Keep prices we are not rechecking. Lines removed from the cart drop out.
    const carriedOver: Record<string, PricedRow> = {};
    for (const line of lines) {
      const cached = pricedBySkuRef.current[line.sku];
      const isBeingChecked = linesToCheck.some((l) => l.sku === line.sku);
      if (cached && !isBeingChecked) carriedOver[line.sku] = cached;
    }

    // Nothing new to check, so just apply the removals.
    if (linesToCheck.length === 0) {
      updatePricedBySku(carriedOver);
      return;
    }

    const abortController = new AbortController();
    priceRequestRef.current = abortController;
    setIsPricing(true);
    setErrorMessage(null);

    try {
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

      /* A forced failure only applies to this one batch. Resetting it here is
         safe because refreshPrices reads it from a ref, so no new check starts. */
      if (forceFailureForThisBatch) setForceFailureAction?.(null);

      const data = await response.json();

      if (!response.ok) {
        const message = data?.error?.message ?? "Couldn't price this order.";
        setErrorMessage(message);
        logEvent(message, "error");
        return;
      }

      // Start with the carried-over prices, then add the fresh ones.
      const nextPricedBySku: Record<string, PricedRow> = { ...carriedOver };
      for (const quoteRow of (data.quotes ?? []) as PricedRow[]) {
        if (quoteRow.sku) nextPricedBySku[quoteRow.sku] = quoteRow;
      }

      /* One log line per failure reason. Not one per item, and not one line
         that mixes every reason together. */
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

      /* Stale stock is not an error, because the check worked. It has no
         stockError, so it needs its own log line. */
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
      // Cancelled requests land here too, so only real failures get a message.
      if (!abortController.signal.aborted) {
        setErrorMessage("Couldn't reach the server.");
        logEvent("Could not reach the server", "error");
      }
    } finally {
      if (!abortController.signal.aborted) setIsPricing(false);
    }
  }, [accountId, lines, logEvent, updatePricedBySku, setForceFailureAction]);

  // Debounce: each change resets the timer, so only a pause triggers a refresh.
  useEffect(() => {
    const timerId = setTimeout(refreshPrices, PRICE_REFRESH_DELAY_MS);
    return () => clearTimeout(timerId);
  }, [refreshPrices]);

  return { pricedBySku, isPricing, errorMessage, setErrorMessage };
}
