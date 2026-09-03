"use client";

import { useCallback, useState } from "react";

import { DraftLine, DraftOrderContext } from "./DraftOrderContext";

export function DraftOrderProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<DraftLine[]>([]);

  const addLines = useCallback((incoming: DraftLine[]) => {
    setLines((current) => {
      const next = [...current];
      for (const line of incoming) {
        const at = next.findIndex((l) => l.sku === line.sku);
        if (at === -1) {
          next.push(line);
        } else {
          // same sku already in the draft: sum the quantities, keep the first
          // line's source.
          next[at] = {
            ...next[at],
            quantity: next[at].quantity + line.quantity,
          };
        }
      }
      return next;
    });
  }, []);

  const setQuantity = useCallback((sku: string, quantity: number) => {
    setLines((current) =>
      current.map((l) =>
        l.sku === sku
          ? { ...l, quantity: Math.max(1, Math.floor(quantity)) }
          : l,
      ),
    );
  }, []);

  const removeLine = useCallback((sku: string) => {
    setLines((current) => current.filter((l) => l.sku !== sku));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  return (
    <DraftOrderContext.Provider
      value={{ lines, addLines, setQuantity, removeLine, clear }}
    >
      {children}
    </DraftOrderContext.Provider>
  );
}
