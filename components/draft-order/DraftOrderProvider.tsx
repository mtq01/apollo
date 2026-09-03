"use client";

/* Holds the cart in memory and the functions that change it. Wrap the app in
   this so any page can read and update the same cart. */

import { useCallback, useState } from "react";

import { DraftLine, DraftOrderContext } from "./DraftOrderContext";

export function DraftOrderProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<DraftLine[]>([]);

  // Add lines. If a sku is already in the cart, add the new quantity onto the existing line and keep that line's source and sourceRef.
  const addLines = useCallback((incoming: DraftLine[]) => {
    setLines((current) => {
      const updatedLines = [...current];
      for (const line of incoming) {
        const existingIndex = updatedLines.findIndex(
          (existing) => existing.sku === line.sku,
        );
        if (existingIndex === -1) {
          updatedLines.push(line);
        } else {
          updatedLines[existingIndex] = {
            ...updatedLines[existingIndex],
            quantity: updatedLines[existingIndex].quantity + line.quantity,
          };
        }
      }
      return updatedLines;
    });
  }, []);

  // Set one line's quantity. Never below 1, always a whole number.
  const setQuantity = useCallback((sku: string, quantity: number) => {
    setLines((current) =>
      current.map((line) =>
        line.sku === sku
          ? { ...line, quantity: Math.max(1, Math.floor(quantity)) }
          : line,
      ),
    );
  }, []);

  // Drop one line by sku.
  const removeLine = useCallback((sku: string) => {
    setLines((current) => current.filter((line) => line.sku !== sku));
  }, []);

  // Empty the whole cart.
  const clear = useCallback(() => setLines([]), []);

  return (
    <DraftOrderContext.Provider
      value={{ lines, addLines, setQuantity, removeLine, clear }}
    >
      {children}
    </DraftOrderContext.Provider>
  );
}
