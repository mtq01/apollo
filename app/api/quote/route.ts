/* quote route ping test :*/
import accounts from "@/data/accounts.json";
import { getQuoteForProduct } from "@/lib/erp/productQuote";
import type { Product, UserContext, ErrorType, ForcedFailure } from "@/types";
import { cacheTag } from "next/cache";
import { accessWarehouse, calculatePrice } from "@/lib/erp/accountRules";
import { parseOrder } from "@/lib/agent/parseOrder";
import { lookupProduct } from "@/lib/erp/productLookup";
import { z } from "zod";

// Creating a zod schema to validate the user input. we need to do this because
// it is coming from an outside source and typescript cannot validate it at runtime
const userRequest = z.object({
  text: z.string("text is required").trim().min(1, "text can't be empty."),
  accountId: z
    //.EXPECTED("ERROR MESSAGE")
    .number("The account id is not a number or null")
    .int("The account id must be a whole number")
    .positive("the account id must be a positive number"),
  // the value must be exactly one of these strings, nothing else. z.enum() is for strings only
  forceFailure: z.enum(["timeout", "not found"]).optional(),
  //These error messages are for us, the User will just receive a generic  "Please log in" message.
});

async function getCachedQuote(
  account: UserContext,
  product: Product,
  forceFailure?: ForcedFailure,
) {
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
  return getQuoteForProduct({ account, product }, forceFailure);
}

//Will Need to send to post later down the line once the claude and finder logic is in place. for now, jsut grab the whole catalogue
export async function POST(request: Request) {
  // For now, Just grab an account 1-3 to test the quote system

  /* .catch(() => null) is the same thing as 
   
   try {
      await request.json()
   } catch {
      return null
   }
   */
  const body = await request.json().catch(() => null);

  // If the body is broken, return a 400 error with a message
  // https://zod.dev/error-formatting?id=zflattenerror#zflattenerror
  /* zod has a built in error handling system, it will return a zod error 
  object if the validation fails, and we can use that to return a 
  proper error message to the user. */
  /* z.flattenError() takes the zod error object and flattens it into a more usable format. Normally it is quite convoluted */
  const validated = userRequest.safeParse(body);
  /* safeparse returns this object: 
  { { success: true;  data: { text: string; accountId: number; forceFailure?: ... } }
{ success: false; error: ZodError }
 */

  if (!validated.success) {
    const { fieldErrors } = z.flattenError(validated.error);

    return Response.json(
      {
        error: {
          type: "invalid input",
          // Basically we are saying, if the user dosent have an accound id, Adress that first.
          // If they do have an account id, but the text is invalid, adress that next.
          message: fieldErrors.accountId
            ? "Please log in"
            : (fieldErrors.text?.[0] ?? "Invalid request body."),
        } satisfies ErrorType,
      },
      { status: 400 },
    );
  }

  const { text, accountId, forceFailure } = validated.data;
  const account = (accounts as UserContext[]).find((a) => a.id === accountId);
  // If the account is not found, return a 400 error with a message
  if (!account) {
    // This is where we actaully search our database to see if that account exist
    return Response.json(
      //satisfies tells typescript that this object is ErrorType.
      // Since we wrote it, we use this instead of "as ErrorType"
      {
        error: {
          type: "request failed",
          message: "Cannot find account.",
        } satisfies ErrorType,
      },
      { status: 400 },
    );
  }

  const parsed = await parseOrder(text, account).catch(() => null);

  if (parsed === null) {
    return Response.json(
      {
        error: {
          type: "request failed",
          message: "Couldn't read that order.",
        } satisfies ErrorType,
      },
      { status: 400 },
    );
  }

  const quotes = [];
  // Each time round, the loop body is a fresh scope, so `const product` isn't being reassigned.

  for (const item of parsed.products) {
    const product = lookupProduct({
      sku: item.sku,
      productName: item.productGuess.name,
    });
    /* continue, to skip the rest of this loop body and start the next item.
     Not break (which exits the loop entirely), not return
    */
    if (!product) {
      quotes.push({
        name: item.rawText,
        quantity: item.quantity,
        stock: {
          type: "not found",
          message: "We couldn't find this in the catalog.",
        } satisfies ErrorType,
      });
      continue;
    }
    try {
      //if a product is not able to be quoted, it will throw an error, and we will push that error.
      const quote = await getCachedQuote(account, product, forceFailure);
      // ...quote is the spread operator. It copies every key and value out of quote
      // into this new object, then name gets added alongside them.
      // Note: this builds a NEW object, quote itself is untouched.

      quotes.push({ ...quote, name: product.name, quantity: item.quantity });
    } catch (error) {
      // If the error is an instance of StockCheckError, we can access its properties.
      const cause = error instanceof Error ? error.cause : undefined;
      const causeMessage = cause instanceof Error ? cause.message : "";
      const notFound = causeMessage.includes("not found");
      /*
        NOTE FOR TRACK A (Mike) 

        Could getQuoteForProduct always return what it can? and send back the error type?
        Right now a failed stock check means nothing returns, And I have to re do the logic in to get information that didnt fail.
        the problem if lets say only 1 thing failed, and the rest worked, I get nothing back, and I have to re do the logic to get the rest of the information that did work.
        I think it would be better if getQuoteForProduct always returned what it could, and sent back the error type for the things that failed. 
       

        */

      if (notFound) {
        quotes.push({
          name: item.rawText,
          quantity: item.quantity,
          stock: {
            type: "not found",
            message: "We couldn't find this item in the inventory system.",
          } satisfies ErrorType,
        });
      } else {
        quotes.push({
          sku: product.sku,
          price: calculatePrice({ account, product }),
          stock: {
            type: "timeout",
            message:
              "Couldn't check stock for this item. Try again in a moment.",
          } satisfies ErrorType,
          stockLastUpdated: "hidden",
          leadTime: product.leadTime,
          warehouse: accessWarehouse({ account, product })
            ? product.warehouse
            : "hidden",
          calculatedAt: new Date().toISOString(),
          name: product.name,
          quantity: item.quantity,
        });
      }
    }
  }
  return Response.json(quotes);
}
