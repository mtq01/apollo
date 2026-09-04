"use client";

/* Holds the cart in memory and the functions that change it. Wrap the app in
   this so any page can read and update the same cart. Also writes a line to
   the activity log for each add and remove. */

import { useCallback, useContext, useState } from "react";

import { ActivityContext } from "@/components/activity-log/ActivityContext";
import { DraftLine, DraftOrderContext } from "./DraftOrderContext";

// "1 item" or "3 items"
function itemCount(count: number) {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

export function DraftOrderProvider({ children }: { children: React.ReactNode }) {
  const { logEvent } = useContext(ActivityContext);
  const [lines, setLines] = useState<DraftLine[]>([]);

  // Add lines. If a sku is already in the cart, add the new quantity onto the
  // existing line and keep that line's source and sourceRef.
  const addLines = useCallback(
    (incoming: DraftLine[]) => {
      if (incoming.length === 0) return;

      // One log line for the whole batch. If every incoming line shares a
      // sourceRef, say where it came from. Otherwise describe what was added.
      const ref = incoming[0].sourceRef;
      const sameRef = ref && incoming.every((line) => line.sourceRef === ref);
      if (sameRef) {
        logEvent(`Added ${itemCount(incoming.length)} from ${ref}`, "order");
      } else if (incoming.length === 1) {
        const line = incoming[0];
        const quantity = line.quantity > 1 ? ` x${line.quantity}` : "";
        logEvent(`Added ${line.productName}${quantity} to the cart`, "order");
      } else {
        logEvent(`Added ${itemCount(incoming.length)} to the cart`, "order");
      }

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
    },
    [logEvent],
  );

  // Set one line's quantity. Never below 1, always a whole number. Not logged,
  // because typing a number fires this on every keystroke.
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
  const removeLine = useCallback(
    (sku: string) => {
      const removed = lines.find((line) => line.sku === sku);
      if (removed) {
        logEvent(`Removed ${removed.productName} from the cart`, "order");
      }
      setLines((current) => current.filter((line) => line.sku !== sku));
    },
    [lines, logEvent],
  );

  // Empty the whole cart. The "Clear" button and "Place order" both call this,
  // so the log line for it lives in the caller, not here.
  const clear = useCallback(() => setLines([]), []);

  return (
    <DraftOrderContext.Provider
      value={{ lines, addLines, setQuantity, removeLine, clear }}
    >
      {children}
    </DraftOrderContext.Provider>
  );
}
