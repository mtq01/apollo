import accounts from "@/data/accounts.json";
import type { UserContext, ErrorType } from "@/types";
import { parseOrder } from "@/lib/agent/parseOrder";
import { lookUpInvoice } from "@/lib/erp/invoice";
import { z } from "zod";
import { priceItems } from "@/lib/erp/priceItems";

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

  if (parsed.type === "invoice") {
  const invoiceResult = await lookUpInvoice({
    invoiceId: parsed.invoiceId,
    accountId: account.id,
  });

  if (invoiceResult.error || !invoiceResult.invoice) {
    return Response.json(
      {
        error: invoiceResult.error ?? {
          type: "request failed",
          message: "Couldn't retrieve that invoice.",
        },
      },
      { status: 400 },
    );
  }

  return Response.json({
    type: "invoice",
    invoice: invoiceResult.invoice,
  });
}

  const quotes = await priceItems(
    account,
    parsed.products.map((item) => ({
      sku: item.sku,
      productName: item.productGuess.name,
      quantity: item.quantity,
      rawText: item.rawText,
    })),
    forceFailure,
  );

  return Response.json({
    type: "quotes",
    quotes,
  });
}
