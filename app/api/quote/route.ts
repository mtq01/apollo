/* quote route ping test :*/
import catalog from "@/data/catalog.json";
import accounts from "@/data/accounts.json";
import { getQuoteForProduct } from "@/lib/erp/productQuote";
import type { Product, UserContext, ErrorType } from "@/types";
import { cacheTag } from "next/cache";
import { accessWarehouse, calculatePrice } from "@/lib/erp/accountRules";

async function getCachedQuote(account: UserContext, product: Product) {
  /*
[Caching]
    - What it does: do the call once, save the answer, and have the saved results
      back the saved if the same request comes in again.

    - Why it's needed here: every Get Quote runs 8 ERP calls, ~2.5 seconds.
      Press it again with nothing changed and it does all 8 again for the same
      answer.

    - What's actually slow: only the stock lookup. mockERP.ts deliberately waits
      300-1500ms per call. Price is instant maths (basePrice x 0.9), and lead
      time and warehouse are facts already sitting in catalog.json. So the
      product is free; the quote costs a round trip.
*/

  "use cache";
  cacheTag("stock");
  // here it checks if the quote is stored in the chache, if it is, it returns the saved andswer, if not it runs like normal
  return getQuoteForProduct({ account, product });
}

//Will Need to send to post later down the line once the claude and finder logic is in place. for now, jsut grab the whole catalogue
export async function POST(request: Request) {
  // For now, Just grab an account 1-3 to test the quote system
  const { text, accountId } = await request.json();
  const account = (accounts as UserContext[]).find((a) => a.id === accountId);
  if (!account) {
    return Response.json(
      { error: { type: "request failed", message: "Please Log In" } },
      { status: 400 },
    );
  }

  const quotes = [];
  // Each time round, the loop body is a fresh scope, so `const product` isn't being reassigned.
  // `for (const product of catalog)` is just shorthand for the loop below:
  //
  // for (let i = 0; i < products.length; i++) {
  //   const product = products[i];
  //   const quote = await getQuoteForProduct({ account, product });
  //   quotes.push(quote);
  // }
  for (const product of catalog as Product[]) {
    try {
      //if a product is not able to be quoted, it will throw an error, and we will push that error.
      const quote = await getCachedQuote(account, product);
      // ...quote is the spread operator. It copies every key and value out of quote
      // into this new object, then name gets added alongside them.
      // Note: this builds a NEW object, quote itself is untouched.

      quotes.push({ ...quote, name: product.name });
    } catch {
      // Later on, We should make it so that gequoteforproduct returns whatever information it can, not just throw an error completely if it fails the stock check.
      // right now it only fails if the stock check fails, so im re doing logic here to make sure that the rest of the quote still returns, even if the stock check fails
      quotes.push({
        sku: product.sku,
        price: calculatePrice({ account, product }),
        stock: {
          type: "timeout",
          message: "Couldn't check stock for this item. Try again in a moment.",
        },
        stockLastUpdated: "hidden",
        leadTime: product.leadTime,
        warehouse: accessWarehouse({ account, product })
          ? product.warehouse
          : "hidden",
        events: [],
        calculatedAt: new Date().toISOString(),
        name: product.name,
      });
    }
  }
  return Response.json(quotes);
}
