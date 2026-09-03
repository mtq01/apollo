/* Deterministic quote path. Same response shape as /api/quote, but here the
   caller already knows the SKUs (a past order being reordered, or a SKU the
   buyer typed), so there is nothing to parse. This skips parseOrder and Claude
   and goes straight to the catalog. */
import accounts from "@/data/accounts.json";
import type { UserContext, ErrorType } from "@/types";
import { z } from "zod";
import { priceItems } from "@/lib/erp/priceItems";

// The request body comes from the browser, so we cannot trust its shape.
// This schema checks it before we use it.
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
  // only sent from the demo dropdown; forces the ERP call to fail
  forceFailure: z.enum(["timeout", "not found"]).optional(),
});

export async function POST(request: Request) {
  // request.json() throws on a broken body, so fall back to null and let the
  // schema reject it below.
  const body = await request.json().catch(() => null);

  const validated = itemsRequest.safeParse(body);

  if (!validated.success) {
    const { fieldErrors } = z.flattenError(validated.error);

    // A bad account id means "not logged in". Otherwise show the first item
    // problem, or a generic message.
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

  // The id has to match a real account.
  const account = (accounts as UserContext[]).find(
    (candidate) => candidate.id === accountId,
  );

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

  // priceItems takes a wider item shape than we have here. We already know the
  // sku, so there is no product name to guess and rawText is just the sku.
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
