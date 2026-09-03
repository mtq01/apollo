/* Deterministic quote path. Same response shape as /api/quote, but the caller
   already knows the SKUs (a past order being reordered, or a SKU the buyer
   typed), so there is nothing to parse. Skips parseOrder entirely. */
import accounts from "@/data/accounts.json";
import type { UserContext, ErrorType } from "@/types";
import { z } from "zod";
import { priceItems } from "@/lib/erp/priceItems";

const itemsRequest = z.object({
  accountId: z
    .number("The account id is not a number or null")
    .int("The account id must be a whole number")
    .positive("the account id must be a positive number"),
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1, "Each item needs a SKU."),
        quantity: z
          .number()
          .int()
          .positive("Quantity must be a positive whole number."),
      }),
    )
    .min(1, "Add at least one item."),
  forceFailure: z.enum(["timeout", "not found"]).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const validated = itemsRequest.safeParse(body);

  if (!validated.success) {
    const { fieldErrors } = z.flattenError(validated.error);

    return Response.json(
      {
        error: {
          type: "invalid input",
          message: fieldErrors.accountId
            ? "Please log in"
            : (fieldErrors.items?.[0] ?? "Invalid request body."),
        } satisfies ErrorType,
      },
      { status: 400 },
    );
  }

  const { accountId, items, forceFailure } = validated.data;
  const account = (accounts as UserContext[]).find((a) => a.id === accountId);

  if (!account) {
    return Response.json(
      {
        error: {
          type: "request failed",
          message: "Cannot find account.",
        } satisfies ErrorType,
      },
      { status: 400 },
    );
  }

  const quotes = await priceItems(
    account,
    items.map((item) => ({
      sku: item.sku,
      productName: null,
      quantity: item.quantity,
      rawText: item.sku,
    })),
    forceFailure,
  );

  return Response.json({
    type: "quotes",
    quotes,
  });
}
