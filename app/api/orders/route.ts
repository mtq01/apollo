/* 
GET  lists an account's past orders. Each one is a stored invoice, so the
        route just reads them and hides fields the account may not see.

POST places a new order: takes the draft's {sku, quantity} lines, checks
        every sku is real, prices the whole order once, and saves it as a full
        invoice in invoices.json. 
*/
import accounts from "@/data/accounts.json";
import catalog from "@/data/catalog.json";
import type { UserContext, ErrorType, Product, Invoice } from "@/types";
import { z } from "zod";
import {
  getAccountInvoices,
  getAllInvoices,
  saveInvoice,
  visibleInvoice,
} from "@/lib/erp/invoice";
import { summarizeOrder } from "@/lib/erp/summarizeOrder";
import { getQuoteForProduct } from "@/lib/erp/productQuote";

// Find the highest inv-<n> id we have and return the next one.
function nextInvoiceId(existing: Invoice[]): string {
  const numbers = existing
    .map((invoice) => /^inv-(\d+)$/.exec(invoice.id)?.[1])
    .filter((digits): digits is string => digits != null)
    .map(Number);
  const highest = numbers.length > 0 ? Math.max(...numbers) : 1000;
  return `inv-${highest + 1}`;
}

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

  /* admin is staff, not a customer, so they can browse every account's
     orders, not just their own. everyone else only sees their own. */
  const invoices =
    account.role === "admin"
      ? await getAllInvoices()
      : await getAccountInvoices(accountId);

  // Read this account's stored invoices and hide fields by role. Newest first.
  const orders = invoices
    .map((invoice) => visibleInvoice({ account, invoice }))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return Response.json({ orders });
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

  // check stock for real right now, do not trust whatever the cart last showed. an order should never be placed on stock that was never confirmed, or that just failed to confirm.
  const stockChecks = await Promise.all(
    items.map(async (item) => {
      const product = (catalog as Product[]).find((p) => p.sku === item.sku)!;
      const quote = await getQuoteForProduct({ account, product });
      return { productName: product.name, stockError: quote.stockError };
    }),
  );

  const failedStockChecks = stockChecks.filter((check) => check.stockError);

  if (failedStockChecks.length > 0) {
    return Response.json(
      {
        error: {
          type: failedStockChecks[0].stockError!.type,
          message: `Stock could not be confirmed for: ${failedStockChecks
            .map((check) => check.productName)
            .join(", ")}`,
        } satisfies ErrorType,
      },
      { status: 400 },
    );
  }

  // Price the whole order once, in the one place that does this math.
  const summary = summarizeOrder(account, items);

  const invoice: Invoice = {
    id: nextInvoiceId(await getAllInvoices()),
    accountId,
    items: summary.lines,
    subtotal: summary.subtotal,
    discount: summary.discount,
    tax: summary.tax,
    totalAmount: summary.totalAmount,
    internalCost: summary.internalCost,
    restrictedFields: ["discount", "internalCost"],
    timestamp: new Date().toISOString(),
  };

  await saveInvoice(invoice);

  // The client reads data.order.id, so return the invoice under "order".
  return Response.json({ order: invoice });
}
