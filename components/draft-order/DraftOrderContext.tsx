"use client";

import { createContext } from "react";

// where a draft line came from, shown in the cart so the buyer can tell a
// reordered item from one they typed or pasted.
export type DraftLineSource =
  | "past-order"
  | "paste"
  | "manual-sku"
  | "suggestion";

// one line in the buyer's working order. price is not stored here; it comes
// from /api/quote/items whenever the cart is shown, so it is always current.
export type DraftLine = {
  sku: string;
  productName: string;
  quantity: number;
  source: DraftLineSource;
  // the specific PO / order it came from (e.g. "inv-1001", "order-3"), shown
  // as a tag under the sku. on a merge the first line's ref is kept.
  sourceRef?: string;
};

type DraftOrderContextValue = {
  lines: DraftLine[];
  // add lines to the draft. a sku already in the draft has its quantity summed
  // rather than creating a second row.
  addLines: (lines: DraftLine[]) => void;
  setQuantity: (sku: string, quantity: number) => void;
  removeLine: (sku: string) => void;
  clear: () => void;
};

export const DraftOrderContext = createContext<DraftOrderContextValue>({
  lines: [],
  addLines: () => {},
  setQuantity: () => {},
  removeLine: () => {},
  clear: () => {},
});
