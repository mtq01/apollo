import type {
  UserContext,
  Invoice,
  VisibleInvoice,
  ActivityCategory,
  ActivityEvent,
  InvoiceRequest,
  InvoiceResponse,
} from "../../types";
import accounts from "@/data/accounts.json";
import { promises as fs } from "fs";
import path from "path";
import { revalidateTag } from "next/cache";

import { randomUUID } from "crypto";

interface AccountInvoiceParams {
  account: UserContext;
  invoice: Invoice;
}

// One path to the invoices file, so it works no matter where the server runs.
const filePath = path.join(process.cwd(), "data", "invoices.json");

// Read every stored invoice.
export async function getAllInvoices(): Promise<Invoice[]> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

// Read just one account's invoices. This is the account's order history.
export async function getAccountInvoices(
  accountId: number,
): Promise<Invoice[]> {
  const invoices = await getAllInvoices();
  return invoices.filter((invoice) => invoice.accountId === accountId);
}

/* Append one invoice to the file. A placed order is saved here as a full
   priced invoice, so readers never have to price it again. */
export async function saveInvoice(invoice: Invoice): Promise<Invoice> {
  const invoices = await getAllInvoices();
  invoices.push(invoice);
  await fs.writeFile(filePath, JSON.stringify(invoices, null, 2));

  /* A new order was just saved, so any stock numbers cached under the "stock"
     tag are out of date. Clear them so the next check looks up a fresh number. */
  revalidateTag("stock", "max");

  return invoice;
}

export async function lookUpInvoice({
  invoiceId,
  accountId,
}: InvoiceRequest): Promise<InvoiceResponse> {
  const account = (accounts as UserContext[]).find(
    (account) => account.id === accountId,
  );

  if (!account) {
    return {
      invoice: null,
      error: {
        type: "invalid input",
        message: `No account with ID ${accountId}.`,
      },
    };
  }

  const invoices = await getAllInvoices();

  const invoice = invoices.find(
    (invoice) =>
      invoice.id.toLowerCase().trim() === invoiceId.toLowerCase().trim(),
  );

  if (!invoice) {
    return {
      invoice: null,
      error: {
        type: "not found",
        message: `Invoice with ID ${invoiceId} not found.`,
      },
    };
  }

  if (account.role !== "admin" && invoice.accountId !== account.id) {
    return {
      invoice: null,
      error: {
        type: "restricted",
        message: `User is not the owner of invoice ${invoiceId}.`,
      },
    };
  }

  return {
    invoice: visibleInvoice({ account, invoice }),
  };
}

export function visibleInvoice({
  account,
  invoice,
  // Takes a stored invoice and returns what this account is allowed to see.
}: AccountInvoiceParams): VisibleInvoice {
  let canSeeDiscount = false;
  let canSeeInternalCost = false;

  const events: ActivityEvent[] = [];

  function addEvent(message: string, category: ActivityCategory) {
    events.push({
      id: randomUUID(),
      message,
      timestamp: new Date().toISOString(),
      category,
    });
  }

  switch (account.role) {
    case "admin":
      canSeeDiscount = true;
      canSeeInternalCost = true;
      break;

    case "manager":
      canSeeDiscount = true;
      break;

    default:
      break;
  }
  addEvent(
    `Invoice Viewed: ${invoice.id} - $${invoice.totalAmount.toFixed(2)}`,
    "access",
  );

  if (!canSeeDiscount) {
    addEvent(
      `Discount Hidden: not visible for this account's role of "${account.role}" - ${invoice.id}`,
      "access",
    );
  }

  if (!canSeeInternalCost) {
    addEvent(
      `Internal Cost Hidden: not visible for this account's role of "${account.role}" - ${invoice.id}`,
      "access",
    );
  }

  // Return the full visible invoice. Discount and internal cost turn into
  // "hidden" when this account's role is not allowed to see them.
  return {
    id: invoice.id,
    accountId: invoice.accountId,
    items: invoice.items.map((line) => ({
      sku: line.sku,
      quantity: line.quantity,
      price: line.price,
      listPrice: line.listPrice,
      productName: line.productName,
      internalCost: canSeeInternalCost ? line.internalCost : "hidden",
    })),
    subtotal: invoice.subtotal,
    discount: canSeeDiscount ? invoice.discount : "hidden",
    tax: invoice.tax,
    totalAmount: invoice.totalAmount,
    internalCost: canSeeInternalCost ? invoice.internalCost : "hidden",
    timestamp: invoice.timestamp,
    events,
  };
}
