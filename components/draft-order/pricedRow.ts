import type { ErrorType } from "@/types";

/* A priced line from POST /api/quote/items, looked up by sku. Most fields are
   optional because a line can fail to price and still come back. */
export type PricedRow = {
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

// Stock numbers older than this trigger the "confirm before ordering" message.
const STALE_STOCK_AFTER_MS = 2 * 60 * 60 * 1000; // 2 hours

// The stock check time, only if it is a real timestamp and not a placeholder.
function realStockTimestamp(pricedRow: PricedRow | undefined) {
  const checkedAt = pricedRow?.stockLastUpdated;
  if (
    typeof checkedAt !== "string" ||
    checkedAt === "hidden" ||
    checkedAt === "error"
  ) {
    return undefined;
  }
  return checkedAt;
}

// Was the stock number already old when the quote was built?
export function isStale(pricedRow: PricedRow | undefined): boolean {
  const checkedAt = realStockTimestamp(pricedRow);
  const quotedAt = pricedRow?.calculatedAt;
  if (!checkedAt || !quotedAt) return false;
  return (
    new Date(quotedAt).getTime() - new Date(checkedAt).getTime() >
    STALE_STOCK_AFTER_MS
  );
}

// The time to show next to a stock count. Falls back to when the quote ran.
export function stockCheckedAt(pricedRow: PricedRow | undefined) {
  return realStockTimestamp(pricedRow) ?? pricedRow?.calculatedAt;
}

// Did this line's stock check fail?
export function hasStockFailure(pricedRow: PricedRow | undefined): boolean {
  return pricedRow?.stock === "error" || pricedRow?.stockError != null;
}
