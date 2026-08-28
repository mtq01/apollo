import type { UserContext, Invoice, VisibleInvoice } from "../../types";

interface AccountInvoiceParams {
  account: UserContext;
  invoice: Invoice;
}

export function visibleInvoice({
  account,
  invoice,
  //this fucntion takes the invoice from track b, and returns a  "visible invoice" depending on the accounts role
}: AccountInvoiceParams): VisibleInvoice {
  let canSeeDiscount = false;
  let canSeeInternalCost = false;

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
  // Return the"vibile invoice type" in full to make track b's life easier, copying "productQuotes.ts" form
  return {
    id: invoice.id,
    accountId: invoice.accountId,
    items: invoice.items,
    totalAmount: invoice.totalAmount,
    discount: canSeeDiscount ? invoice.discount : "hidden",
    internalCost: canSeeInternalCost ? invoice.internalCost : "hidden",
    timestamp: invoice.timestamp,
  };
}
