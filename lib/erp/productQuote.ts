import type { AccountProductParams, ActivityEvent, ForcedFailure} from "../../types";
import { calculatePrice, seeStock, accessWarehouse } from "./accountRules";
import { getERPStock } from "./mockERP";
import { randomUUID } from "crypto";

/* This function combines the 3 functions created in Week 1: 'accountRules.ts' */

// shape of the final result this function returns
interface QuoteResult {
  sku: string;                                                      // product identifier
  price: number;                                                    // final price after any discount
  stock: number | "hidden";                                         // real stock count, or "hidden" if not allowed to see it
  stockLastUpdated: string | "hidden";                              // when stock was checked, or "hidden"
  leadTime: number;                                                 // days until product ships
  warehouse: string | "hidden";                                     // ship-from warehouse, or "hidden"
  events: ActivityEvent[];                                          // log of what happened while building this quote
}


// Builds a full quote for one account + product. forceFailure optionally triggers a specific ERP error for testing.
export async function getQuoteForProduct({ account, product}: AccountProductParams, forceFailure?: ForcedFailure): Promise<QuoteResult> {

  // +++++ Activity log setup +++++
  const events: ActivityEvent[] = [];                               // will hold every log entry for this quote

  // +++++ addEvent helper function
  // prevents repeating the same 4-line object everytime we log something
  function addEvent(message: string) {
    events.push({
      id: crypto.randomUUID(),                                      // creates a unique 36character long v4 UUID - https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
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
    const stockResponse = await getERPStock(forceFailure);          // ask the fake ERP for stock (normally random), but throws immediately if forceFailure was passed.
    stock = stockResponse.stock;                                    // pull the number out of the response
    stockLastUpdated = stockResponse.lastUpdated;                   // pull the timestamp out too
    addEvent(`Stock Checked: ${stock} available`);                  // log that the stock check finished
  }

  // Build and return the final combined result.
  return {
    sku: product.sku,
    price,
    stock,
    stockLastUpdated,
    leadTime: product.leadTime,
    warehouse: canSeeWarehouse ? product.warehouse : "hidden",      // only include warehouse if allowed
    events,                                                         // full log of everything that happened above
  };
}