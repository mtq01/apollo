import { TAX_RATE } from "@/lib/erp/summarizeOrder";
import type { DraftLine } from "@/components/draft-order/DraftOrderContext";
import type { PricedRow } from "@/components/draft-order/pricedRow";

export type CartTotals = {
  subTotal: number; // list price × qty, before discount
  discount: number; // what the account saves (list price minus paid price)
  tax: number; // TAX_RATE on the amount after discount
  total: number; // subTotal - discount + tax
  internalCost: number; // our cost × qty; admins only
  internalCostIsHidden: boolean; // true for non-admins, so the row is hidden
};

/* Adds up the footer numbers for the cart. It is a plain function, not
   part of the component, so the math can be tested without rendering. A
   line with no price yet counts as zero until its price arrives. */
export function computeCartTotals(
  lines: DraftLine[],
  pricedBySku: Record<string, PricedRow>,
): CartTotals {
  let subTotal = 0;
  let discount = 0;
  let internalCost = 0;
  let internalCostIsHidden = false;

  for (const line of lines) {
    const pricedRow = pricedBySku[line.sku];
    const listPrice = pricedRow?.listPrice;
    const paidPrice = pricedRow?.price;
    const unitCost = pricedRow?.internalCost;

    // Some rows only have a price, so fall back to it for the list price.
    const unitListPrice = listPrice ?? paidPrice;
    if (typeof unitListPrice === "number") {
      subTotal += unitListPrice * line.quantity;
    }

    if (typeof listPrice === "number" && typeof paidPrice === "number") {
      discount += (listPrice - paidPrice) * line.quantity;
    }

    // "hidden" means this role can never see cost, so hide the whole row.
    if (unitCost === "hidden") internalCostIsHidden = true;
    if (typeof unitCost === "number") internalCost += unitCost * line.quantity;
  }

  const tax = (subTotal - discount) * TAX_RATE;
  const total = subTotal - discount + tax;

  return { subTotal, discount, tax, total, internalCost, internalCostIsHidden };
}
