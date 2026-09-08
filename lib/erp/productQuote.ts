import type { AccountProductParams, ActivityEvent, ForcedFailure, ErrorType, ActivityCategory, LineItemResult, QuoteResult} from "../../types";
import { calculatePrice, seeStock, accessWarehouse } from "./accountRules";
import { getERPStock } from "./mockERP";
import { randomUUID } from "crypto";

// +++++ This file combines the 3 functions created in Week 1: 'accountRules.ts' +++++

// maps whatever getERPStock throws into our ErrorType shape
function mapStockErrorToReason(err: unknown): ErrorType {
  const message = err instanceof Error ? err.message : "Unknown stock check error";

  if (message.includes("timed out")) return { type: "timeout", message };
  if (message.includes("not found")) return { type: "not found", message };

  // mockERP doesn't currently throw "restricted" or "invalid input" for stock checks, this is a fallback in case that changes later.
  return { type: "invalid input", message };
}

// Builds a full quote for one account + product. forceFailure optionally triggers a specific ERP error for testing.
export async function getQuoteForProduct({ account, product}: AccountProductParams, forceFailure?: ForcedFailure): Promise<QuoteResult> {

  // +++++ Activity log setup +++++
  const events: ActivityEvent[] = [];                               // will hold every log entry for this quote

  // +++++ addEvent helper function
  // prevents repeating the same 4-line object everytime we log something
  function addEvent(message: string, category: ActivityCategory) {
    events.push({
      id: randomUUID(),                                             // creates a unique 36character long v4 UUID - https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
      message,                                                      // human-friendly description of what happened
      timestamp: new Date().toISOString(),                          // when it happened
      category,
    });
  }

  // +++++ First call to 'addEvent': After calculatePrice runs, LOG the PRICE. +++++
  const price = calculatePrice({ account, product });
  addEvent(`Price Calculated: $${price} — ${product.name}`, "price");


  const canSeeStock = seeStock({ account, product });               // is this role allowed to see stock?
  const canSeeWarehouse = accessWarehouse({ account, product });    // is this role allowed to see warehouse?

  let stock: number | "hidden" | "error" = "hidden";                // default to hidden until proven visible
  let stockLastUpdated: string | "hidden" | "error" = "hidden";     // same default for the timestamp
  let stockError: ErrorType | undefined;

  // +++++ After a successful getERPStock() call, LOG the STOCK. +++++
  if (canSeeStock) {

    // +++++ Retry up to 2 times before giving up +++++
    const maxAttempts = 2;                                          // 1 try & 1 retry
    let lastError: unknown = undefined;                             // holds the most recent failure in case we need to throw it later
    let succeeded = false;                                          // flips to true once a stock check actually works

    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // if checking stock fails, save the error and let the loop retry. nothing is thrown here, so events/price already gathered aren't lost
      try {
        const stockResponse = await getERPStock(product.sku, forceFailure);           // ask the fake ERP for stock (normally random), but throws immediately if forceFailure was passed.
        stock = stockResponse.stock;                                                  // pull the number out of the response
        stockLastUpdated = stockResponse.lastUpdated;                                 // pull the timestamp out too
        addEvent(`Stock Checked: ${stock} available — ${product.name}`, "stock");     // log that the stock check finished
        succeeded = true;                                                             // mark success so we know not to retry
        break;                                                                        // it worked, stop trying.
    } catch (err) {
      lastError = err;                                                                // save it, but dont throw yet, let the loop try again.
      addEvent(`Stock check attempt ${attempt} failed — ${product.name}`, "stock");   // log the failed attempt so its not silent
    }
  } 
   
  /* +++++ IF EVERY ATTEMPT FAILED, record the reason and keep going+++++
  - Instead of throwing (which discarded price/events), we fall through to the normal return below 
  with everything else that was already calculated still intact.
  - it only reaches this if the loop above finished without ever returning true. */
  if (!succeeded) {
    stock = "error";
    stockLastUpdated = "error";
    stockError = mapStockErrorToReason(lastError);
    addEvent(`Stock check failed for ${product.name}: ${stockError.message}`, "stock");
    }   
  } else {
      // if unsuccessful (false)
      // logs the event instead of staying hidden. (now every quote produces a log entry)
      addEvent(`Stock Hidden: not visible for this account's role of "${account.role}" — ${product.name}`, "access");  
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
    stockError,
    leadTime: product.leadTime,
    warehouse: canSeeWarehouse ? product.warehouse : "hidden",      // only include warehouse if allowed
    events,                                                         // full log of everything that happened above
    calculatedAt,
  };
}