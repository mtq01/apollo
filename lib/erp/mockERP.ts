import type { ForcedFailure } from "@/types";

/* [Simulates an ERP inventory lookup]
      - Random delay between 300ms and 1500ms
      - 15% chance of throwing a timeout error
      - Otherwise returns stock + timestamp
      - Can also be forced to throw a specific failure on demand, for
        testing/demo purposes, instead of waiting for the random chance
 */


// Shape of a successful stock check. How much stock and when it was checked.
type ERPStockResponse = {
  stock: number;
  lastUpdated: string;
};


/* sku identifies which product to check. It gets passed into hashSkuToStock() below so the same product 
always returns the same stock count. forceFailure is optional: when passed, it skips the random logic entirely 
and throws that specific failure immediately (used by tests and Track B's demo panel). */
export async function getERPStock(sku: string, forceFailure?: ForcedFailure): Promise<ERPStockResponse> {

  // If a specific failure was requested, throw it immediately and skip the random delay/logic below. Makes failures reliable for testing/demos.
  switch (forceFailure) {
    case "timeout":
      // human readable error msg
      throw new Error("ERP request timed out");

    case "not found":
      // human readabl error msg
      throw new Error("Product not found in ERP system.");

      case "stale stock": {
        // real stock count, refreshed 3hrs ago. shows 'confirm before ordering' reminder without a random wait
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        return {
          stock: hashSkuToStock(sku),
          lastUpdated: threeHoursAgo.toISOString(),
        }
      }
        
    default:
      // forceFailure was undefined, so nothing was thrown here. This just exits the switch and moves on to the normal random logic below.
      break;
  }

  // Random delay (300–1500ms), simulates real network/API latency.
  const delay = Math.floor(Math.random() * 1200) + 300;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // 15% random chance of simulating a real (unforced) timeout.
  if (Math.random() < 0.15) {
    throw new Error("ERP request timed out (15% chance of this happening)");
  }

  return {
    stock: hashSkuToStock(sku), // same sku always gives the same stock count, instead of a fresh random guess every time
    lastUpdated: new Date().toISOString(), // timestamp of this "check"
  };
}


/* [Helper Function] - Mahtab's original version gave every stock check a
   brand new random number, even for the same product. 
   
   This improves that: 
   It turns a SKU string into a number between 0-499 that's always the same
   for that exact SKU, by walking through each character and mixing it into
   a running total. 
   
   Different SKUs still land on different numbers. It's just no longer random within 
   the same product. Not meant to be 'smart', just repeatable.
*/
function hashSkuToStock(sku: string): number {
  let hash = 0;
  for (let i = 0; i < sku.length; i++) {
    hash = hash * 31 + sku.charCodeAt(i);
  }
  return Math.abs(hash) % 500;
}