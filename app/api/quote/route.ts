/* quote route ping test :*/
import catalog from "@/data/catalog.json";
import accounts from "@/data/accounts.json";
import { getQuoteForProduct } from "@/lib/erp/productQuote";
import type { Product, UserContext } from "@/types";
import { cacheTag } from "next/cache";

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
  const account = (accounts as UserContext[]).find((a) => a.id === 1)!;

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
      const quote = await getCachedQuote(account, product);
      quotes.push(quote);
    } catch {
      quotes.push({ sku: product.sku, error: "Stock check failed" });
    }
  }

  return Response.json(quotes);
}
