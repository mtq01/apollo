import type { AccountProductParams, ActivityEvent, ForcedFailure} from "../../types";
import { calculatePrice, seeStock, accessWarehouse } from "./accountRules";
import { getERPStock } from "./mockERP";
import { randomUUID } from "crypto";

/* This file combines the 3 functions created in Week 1: 'accountRules.ts' */

/* [WHAT] Custom Error for Failed Stock Check

  [HOW] Works like a normal Error, but carries two extra pieces of information:
    1. events: everything that was already logged before the failure (ex. 'price was calculated') so that work isnt lost.
    2. cause: the original error that caused the failure, so we know exactly what went wrong.

  [WHY] Without this, if the stock check failed partway through, we would lose track of everything that happened before the failure.
    - We would also lose the real error too, replacing it with something vague.
    - This way, nothing gets thrown away when something breaks.

  +++ This pairs with the 'try/catch' below inside the if (canSeeStock) conditional
*/
export class StockCheckError extends Error {
  constructor(message: string, public events: ActivityEvent[], public cause?: unknown) {
    super(message);
    this.name = "StockCheckError";
  }
}


// shape of the final result this function returns
interface QuoteResult {
  sku: string;                                                      // product identifier
  price: number;                                                    // final price after any discount
  stock: number | "hidden";                                         // real stock count, or "hidden" if not allowed to see it
  stockLastUpdated: string | "hidden";                              // when stock was checked, or "hidden"
  leadTime: number;                                                 // days until product ships
  warehouse: string | "hidden";                                     // ship-from warehouse, or "hidden"
  events: ActivityEvent[];                                          // log of what happened while building this quote
  calculatedAt: string;                                             // when it was calculated
}


// Builds a full quote for one account + product. forceFailure optionally triggers a specific ERP error for testing.
export async function getQuoteForProduct({ account, product}: AccountProductParams, forceFailure?: ForcedFailure): Promise<QuoteResult> {

  // +++++ Activity log setup +++++
  const events: ActivityEvent[] = [];                               // will hold every log entry for this quote

  // +++++ addEvent helper function
  // prevents repeating the same 4-line object everytime we log something
  function addEvent(message: string) {
    events.push({
      id: randomUUID(),                                             // creates a unique 36character long v4 UUID - https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
      message,                                                      // human-friendly description of what happened
      timestamp: new Date().toISOString(),                          // when it happened
    });
  }

  // +++++ First call to 'addEvent': After calculatePrice runs, LOG the PRICE. +++++
  const price = calculatePrice({ account, product });
  addEvent(`Price Calculated: $${price}`);


  const canSeeStock = seeStock({ account, product });               // is this role allowed to see stock?
  const canSeeWarehouse = accessWarehouse({ account, product });    // is this role allowed to see warehouse?

  let stock: number | "hidden" = "hidden";                          // default to hidden until proven visible
  let stockLastUpdated: string | "hidden" = "hidden";               // same default for the timestamp

  // +++++ After a successful getERPStock() call, LOG the STOCK. +++++
  if (canSeeStock) {
    // if checking stock fails, catch it & wrap in StockCheckError so we dont lose the events logged so far
    try {
      const stockResponse = await getERPStock(product.sku, forceFailure);   // ask the fake ERP for stock (normally random), but throws immediately if forceFailure was passed.
      stock = stockResponse.stock;                                          // pull the number out of the response
      stockLastUpdated = stockResponse.lastUpdated;                         // pull the timestamp out too
      addEvent(`Stock Checked: ${stock} available`);                        // log that the stock check finished
    } catch (err) {
        throw new StockCheckError("Stock check failed", events, err);
    }
  } else {
    // if unsuccessful (false)
    // logs the event instead of staying hidden. (now every quote produces a log entry)
    addEvent(`Stock Hidden: not visible for this account's role of "${account.role}"`);  
  }


  /* +++++ Record when this quote was ACTUALLY calculated +++++
    - Save the exact time this quote was put together.
    - If this same quote gets reused later from a saved copy instead of being rebuilt 
    from scratch, the time stays the same. It always tells the truth about how old 
    the price/stock numbers really are. */
  const calculatedAt = new Date().toISOString();


  // Build and return the final combined result.
  return {
    sku: product.sku,
    price,
    stock,
    stockLastUpdated,
    leadTime: product.leadTime,
    warehouse: canSeeWarehouse ? product.warehouse : "hidden",      // only include warehouse if allowed
    events,                                                         // full log of everything that happened above
    calculatedAt,
  };
}