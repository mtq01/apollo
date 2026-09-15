import { cacheTag } from "next/cache";
import { getQuoteForProduct } from "@/lib/erp/productQuote";
import { lookupProduct } from "@/lib/erp/productLookup";
import { suggestAlternatives } from "@/lib/agent/suggestAlternatives";
import type { Product, UserContext, ErrorType, ForcedFailure } from "@/types";

/* One line item to price. `sku` or `productName` may be null; the loop resolves
   whichever is present against the catalog. `rawText` is what we show the buyer
   when nothing matches (the pasted words, or the SKU they typed). */
export type PriceableItem = {
  sku: string | null;
  productName: string | null;
  quantity: number | null;
  rawText: string;
};

async function getCachedQuote(
  account: UserContext,
  product: Product,
  forceFailure?: ForcedFailure,
) {
  /*
[Caching]
    - What it does: do the call once, save the answer, and hand the saved
      answer back if the same request comes in again.

    - Why it's needed here: every quote runs an ERP stock call, ~300-1500ms.
      Ask for the same product again with nothing changed and it does the
      round trip again for the same answer.

    - What's actually slow: only the stock lookup. mockERP.ts deliberately
      waits. Price is instant maths, and lead time and warehouse are facts
      already sitting in catalog.json. So the product is free; the quote
      costs a round trip.
*/

  "use cache";
  cacheTag("stock");
  return getQuoteForProduct({ account, product }, forceFailure);
}

/* Resolves each item against the catalog and builds a priced quote row for it.
   Shared by the text path (/api/quote, after parseOrder) and the deterministic
   path (/api/quote/items, where the SKU is already known). */
export async function priceItems(
  account: UserContext,
  items: PriceableItem[],
  forceFailure?: ForcedFailure,
) {
  /* Price every item concurrently instead of one at a time. Each item's ERP stock check is independent of the others, 
  so there's no reason a paste of 5 SKUs should pay 5x the ERP's per-call delay serially. 
  
  - Promise.all keeps the result order lined up with `items`, same as the old for-loop did. */
  return Promise.all(
    items.map(async (item) => {
      const product = lookupProduct({
        sku: item.sku,
        productName: item.productName,
      });

      // return ends this item's work early and moves on to the next. Not break, not continue, those were for the old for-loop.
      if (!product) {
        // no exact match in the catalog. get 2-3 close-guess suggestions and a plain-English message instead of just saying "not found."
        const { suggestions, matchError } = suggestAlternatives(
          item.productName ?? item.rawText,
        );

        return {
          status: "unmatched",          // no product found, different shape than a normal quote row
          rawText: item.rawText,        // what the buyer typed, since we don't have a real product name
          matchError,                   // the "did you mean X?" message from suggestAlternatives
          suggestions,                  // the actual close-guess products, so the UI can show them as options
          quantity: item.quantity,
        };
      }

      try {
        /* getQuoteForProduct no longer throws on a failed stock check, it always returns normally and reports the failure via 
        `stockError` on the result instead (see DECISIONS.md, Aug 18). So the quote already carries whatever succeeded (price, 
        warehouse, etc.) plus the error for what didn't. */

        const quote = await getCachedQuote(account, product, forceFailure); 

        if (quote.stockError?.type === "not found") {
          // the catalog match succeeded; it's the ERP that couldn't confirm it.
          // keep the sku so the draft can still show the row + its error.
          return {
            sku: product.sku,
            name: item.rawText,
            quantity: item.quantity,
            stock: quote.stock,
            stockError: quote.stockError,
            events: quote.events,
          };
        }

        /* ...quote is the spread operator. It copies every key and value out of quote into this new object, 
        then name gets added alongside them. 
        
        - listPrice (pre-discount) and internalCost (admin-only, same rule as invoices) let the draft table show 
        the discount and cost lines. */
        return {
          ...quote,
          name: product.name,
          quantity: item.quantity,
          listPrice: product.basePrice,
          internalCost:
            account.role === "admin"
              ? (product.internalCost ?? null)
              : ("hidden" as const),
        };
      } catch {
        // Only reached for a genuinely unexpected error, not a stock-check failure, that's already handled above via `quote.stockError`.
        return {
          name: item.rawText,
          quantity: item.quantity,
          stock: {
            type: "request failed",
            message: "Something went wrong pricing this item.",
          } satisfies ErrorType,
        };
      }
    }),
  );
}
