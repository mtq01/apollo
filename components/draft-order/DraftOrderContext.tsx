"use client";

/* Shared state for the cart. It lives here, not inside DraftOrder, so the
   paste box and the orders page can add to the same cart. DraftOrderProvider
   fills in the real values. */

import { createContext } from "react";

// Where a line came from. Drives the green tag in the cart.
export type DraftLineSource =
  | "past-order"
  | "paste"
  | "manual-sku"
  | "suggestion";

// One line in the cart. No price here; it comes fresh from /api/quote/items every time the cart is shown.
export type DraftLine = {
  sku: string;
  productName: string;
  quantity: number;
  source: DraftLineSource;
  // The PO or order it came from ("inv-1001", "order-3"), shown under the sku.
  sourceRef?: string;
};

type DraftOrderContextValue = {
  lines: DraftLine[];
  // Add lines. A sku already in the cart gets its quantity added on instead of a second row.
  addLines: (lines: DraftLine[]) => void;
  setQuantity: (sku: string, quantity: number) => void;
  removeLine: (sku: string) => void;
  clear: () => void;
};

// Default value. The real one comes from DraftOrderProvider; these no-ops only run if a component reads the context with no provider above it.
export const DraftOrderContext = createContext<DraftOrderContextValue>({
  lines: [],
  addLines: () => {},
  setQuantity: () => {},
  removeLine: () => {},
  clear: () => {},
});
