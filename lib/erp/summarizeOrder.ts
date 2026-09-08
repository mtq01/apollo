import catalog from "@/data/catalog.json";
import type { Product, UserContext } from "@/types";
import { calculatePrice } from "@/lib/erp/accountRules";

// The tax rate applied to every order and invoice. Kept here so the cart, the
// orders page, and a placed invoice all use the same number.
export const TAX_RATE = 0.07;

const productBySku = new Map((catalog as Product[]).map((p) => [p.sku, p]));

// Round a money value to two decimal places.
function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export type OrderLine = { sku: string; quantity: number };

export type OrderSummary = {
  lines: {
    sku: string;
    quantity: number;
    productName: string;
    listPrice: number;          // per unit, before discount
    price: number;              // per unit, what this account pays
    internalCost: number;       // per unit, our cost
  }[];
  subtotal: number;             // sum of listPrice * quantity
  discount: number;             // sum of (listPrice - price) * quantity
  tax: number;                  // (subtotal - discount) * TAX_RATE
  totalAmount: number;          // subtotal - discount + tax
  internalCost: number;         // sum of internalCost * quantity
};

/* Prices a list of {sku, quantity} for one account and returns the full money
   breakdown. Single source of truth for order and invoice totals. Every sku
   must exist in the catalog; the caller checks that first. */
export function summarizeOrder(
  account: UserContext,
  items: OrderLine[],
): OrderSummary {
  const lines = items.map((item) => {
    const product = productBySku.get(item.sku);
    if (!product) {
      throw new Error(`summarizeOrder: unknown sku ${item.sku}`);
    }
    return {
      sku: item.sku,
      quantity: item.quantity,
      productName: product.name,
      listPrice: product.basePrice,
      price: money(calculatePrice({ account, product })),
      internalCost: product.internalCost ?? 0,
    };
  });

  const subtotal = money(
    lines.reduce((sum, line) => sum + line.listPrice * line.quantity, 0),
  );
  const discount = money(
    lines.reduce(
      (sum, line) => sum + (line.listPrice - line.price) * line.quantity,
      0,
    ),
  );
  const tax = money((subtotal - discount) * TAX_RATE);
  const totalAmount = money(subtotal - discount + tax);
  const internalCost = money(
    lines.reduce((sum, line) => sum + line.internalCost * line.quantity, 0),
  );

  return { lines, subtotal, discount, tax, totalAmount, internalCost };
}
