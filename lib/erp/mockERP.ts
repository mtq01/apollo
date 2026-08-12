import type { ForcedFailure } from "@/types";

/* [Simulates an ERP inventory lookup]
      - Random delay between 300ms and 1500ms
      - 15% chance of throwing a timeout error
      - Otherwise returns stock + timestamp
      - Can also be forced to throw a specific failure on demand, for
        testing/demo purposes, instead of waiting for the random chance
 */


// Shape of a successful stock check. How much stock and when it was checked.
export type ERPStockResponse = {
  stock: number;
  lastUpdated: string;
};


// In a real ERP system, we'd likely do something like: const response = await fetch("/api/erp");

/* forceFailure is optional. When passed, skips the random logic entirely and throws that specific 
failure immediately (used by tests and Track B's demo panel). */
export async function getERPStock(forceFailure?: ForcedFailure): Promise<ERPStockResponse> {

  // If a specific failure was requested, throw it immediately and skip the random delay/logic below. Makes failures reliable for testing/demos.
  switch (forceFailure) {
    case "timeout":
      // human readable error msg
      throw new Error("ERP request timed out");

    case "not found":
      // human readabl error msg
      throw new Error("Product not found in ERP system.");

    default:
      // forceFailure was undefined, meaning nobody asked for a forced failure, so do nothing here and fall through to the normal random logic below.
      break;
  }

  // Random delay (300–1500ms), simulates real network/API latency.
  const delay = Math.floor(Math.random() * 1200) + 300;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // 15% random chance of simulating a real (unforced) timeout.
  if (Math.random() < 0.15) {
    throw new Error("ERP request timed out");
  }

  return {
    stock: Math.floor(Math.random() * 500), // random stock count, standing in for a real lookup
    lastUpdated: new Date().toISOString(), // timestamp of this "check"
  };
}