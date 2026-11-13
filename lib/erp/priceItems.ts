import { getQuoteForProduct } from "@/lib/erp/productQuote";
import { lookupProduct } from "@/lib/erp/productLookup";
import { suggestAlternatives } from "@/lib/agent/suggestAlternatives";
import { isValidQuantity, MAX_QUANTITY_LABEL } from "@/lib/orderLimits";
import type { UserContext, ErrorType, ForcedFailure } from "@/types";

/* One line item to price. `sku` or `productName` may be null; the loop resolves
   whichever is present against the catalog. `rawText` is what we show the buyer
   when nothing matches (the pasted words, or the SKU they typed). */
export type PriceableItem = {
  sku: string | null;
  productName: string | null;
  quantity: number | null;
  rawText: string;
};

/* Resolves each item against the catalog and builds a priced quote row for it.
   Shared by the text path (/api/quote, after parseOrder) and the deterministic
   path (/api/quote/items, where the SKU is already known).

   [No caching, on purpose]
   Every call checks stock with the ERP. Quotes used to be cached with
   "use cache", which handed back the same saved quote for the same account and
   product: the stock number never refreshed, the activity log replayed old
   "Stock Checked" lines for checks that never ran, and a saved failure stayed
   failed. The cart already avoids repeat checks on its own (it only re-checks
   new, failed or stale lines), and all items are checked in parallel. */
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
      /* Claude can read a quantity we can't price: 0, -1, 2.5 ("2.5 boxes"), or a huge number.
         Don't guess what the buyer meant, and don't let it into the cart, where it would fail
         every re-price. Return it as a row the buyer can see and fix. (null is fine: it means
         the buyer gave no quantity, and the page treats that as 1.) */
      if (item.quantity !== null && !isValidQuantity(item.quantity)) {
        return {
          status: "unmatched",
          rawText: item.rawText,
          matchError: {
            type: "invalid input",
            message: `Couldn't use the quantity ${item.quantity}. Enter a whole number from 1 to ${MAX_QUANTITY_LABEL}.`,
          } satisfies ErrorType,
          suggestions: [],
          quantity: null,
        };
      }

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

        const quote = await getQuoteForProduct({ account, product }, forceFailure); 

        if (quote.stockError?.type === "not found") {
          // the catalog match succeeded; it's the ERP that couldn't confirm it.
          // keep the sku so the draft can still show the row + its error.
          return {
            sku: product.sku,
            name: product.name,
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
        /* Only reached for a genuinely unexpected error, not a stock-check failure, that's already handled above via `quote.stockError`.
           Same shape as any other failed line (stock "error" plus a stockError), and it keeps its sku: the cart
           matches results to lines by sku, so a row without one is dropped and the line never shows it failed. */
        return {
          sku: product.sku,
          name: product.name,
          quantity: item.quantity,
          stock: "error",
          stockError: {
            type: "request failed",
            message: "Something went wrong pricing this item.",
          } satisfies ErrorType,
        };
      }
    }),
  );
}
