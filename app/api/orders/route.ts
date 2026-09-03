/* GET  lists an account's past orders, with product names filled in.
   POST places a new order: takes the draft's {sku, quantity} lines, checks
   every sku is real, and appends it to order-history.json via addOrder. */
import { randomUUID } from "crypto";
import accounts from "@/data/accounts.json";
import catalog from "@/data/catalog.json";
import type { UserContext, ErrorType, Product } from "@/types";
import { z } from "zod";
import { addOrder, getOrderHistory } from "@/lib/erp/order";
import { calculatePrice } from "@/lib/erp/accountRules";

const productBySku = new Map((catalog as Product[]).map((p) => [p.sku, p]));

export async function GET(request: Request) {
  const accountId = Number(
    new URL(request.url).searchParams.get("accountId"),
  );

  if (!Number.isInteger(accountId) || accountId <= 0) {
    return Response.json(
      {
        error: {
          type: "invalid input",
          message: "Please log in",
        } satisfies ErrorType,
      },
      { status: 400 },
    );
  }

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

  const orders = await getOrderHistory(accountId);
  // internal cost is admin-only, same rule as invoices (see visibleInvoice)
  const showCost = account.role === "admin";

  const enriched = orders
    .map((o) => ({
      id: o.id,
      timestamp: o.timestamp,
      items: o.items.map((it) => {
        const product = productBySku.get(it.sku);
        return {
          sku: it.sku,
          quantity: it.quantity,
          productName: product?.name ?? null,
          // price is what this account pays; listPrice is before any
          // contract discount, so the card can show the discount line.
          price: product ? calculatePrice({ account, product }) : null,
          listPrice: product?.basePrice ?? null,
          internalCost: !product
            ? null
            : showCost
              ? (product.internalCost ?? null)
              : ("hidden" as const),
        };
      }),
    }))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return Response.json({ orders: enriched });
}

const orderRequest = z.object({
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
    .min(1, "Add at least one item before placing the order."),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const validated = orderRequest.safeParse(body);

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

  const { accountId, items } = validated.data;
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

  // every line has to be a real catalog product
  const unknown = items.filter(
    (i) => !(catalog as Product[]).some((p) => p.sku === i.sku),
  );

  if (unknown.length > 0) {
    return Response.json(
      {
        error: {
          type: "not found",
          message: `Not in the catalog: ${unknown.map((i) => i.sku).join(", ")}`,
        } satisfies ErrorType,
      },
      { status: 400 },
    );
  }

  const order = await addOrder({
    id: `order-${randomUUID()}`,
    accountId,
    items: items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
    timestamp: new Date().toISOString(),
  });

  return Response.json({ order });
}
