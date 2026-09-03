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

import { randomUUID } from "crypto";

interface AccountInvoiceParams {
  account: UserContext;
  invoice: Invoice;
}
const filePath = path.join(process.cwd(), "data", "invoices.json");

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

  const raw = await fs.readFile(filePath, "utf-8");
  const invoices: Invoice[] = JSON.parse(raw);

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
  //this fucntion takes the invoice from track b, and returns a  "visible invoice" depending on the accounts role
}: AccountInvoiceParams): VisibleInvoice {
  let canSeeDiscount = false;
  let canSeeInternalCost = false;

  const events: ActivityEvent[] = [];

  function addEvent(message: string, category: ActivityCategory) {
    events.push({
      id: randomUUID(), // creates a unique 36character long v4 UUID - https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
      message, // human-friendly description of what happened
      timestamp: new Date().toISOString(), // when it happened
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
    `Invoice Viewed: ${invoice.id} — $${invoice.totalAmount.toFixed(2)}`,
    "access",
  );

  if (!canSeeDiscount) {
    addEvent(
      `Discount Hidden: not visible for this account's role of "${account.role}" — ${invoice.id}`,
      "access",
    );
  }

  if (!canSeeInternalCost) {
    addEvent(
      `Internal Cost Hidden: not visible for this account's role of "${account.role}" — ${invoice.id}`,
      "access",
    );
  }
  // Return the"vibile invoice type" in full to make track b's life easier, copying "productQuotes.ts" form
  return {
    id: invoice.id,
    accountId: invoice.accountId,
    items: invoice.items,
    totalAmount: invoice.totalAmount,
    discount: canSeeDiscount ? invoice.discount : "hidden",
    internalCost: canSeeInternalCost ? invoice.internalCost : "hidden",
    timestamp: invoice.timestamp,
    events,
  };
}
