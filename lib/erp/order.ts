import { promises as fs } from "fs";
import path from "path";
import catalog from "@/data/catalog.json";
import type { Invoice, Product, UserContext } from "@/types";
import { calculatePrice } from "./accountRules";
import { revalidateTag } from "next/cache";


/* [ Documentation ] 

    - fs/promises:      https://nodejs.org/api/fs.html#promises-api
    - path.join:        https://nodejs.org/api/path.html#pathjoinpaths

*/

// builds one reliable path to our JSON fiile (so it works no matter where the server process runs from)
const filePath = path.join(process.cwd(), "data", "invoices.json");

const money = (value: number) => Math.round(value * 100) / 100;

export function buildInvoice({
  account,
  items,
}: {
  account: UserContext;
  items: { sku: string; quantity: number }[];
}): Invoice {
  const lines = items.map((item) => {
    const product = (catalog as Product[]).find((p) => p.sku === item.sku);

    if (!product) {
      throw new Error(`Not in the catalog: ${item.sku}`);
    }

    return {
      sku: product.sku,
      quantity: item.quantity,
      productName: product.name,
      price: money(calculatePrice({ account, product })),
      listPrice: product.basePrice,
      internalCost: product.internalCost ?? 0,
    };
  });

  return {
    id: `inv-${Math.floor(1000 + Math.random() * 9000)}`,
    accountId: account.id,
    items: lines,
    totalAmount: money(
      lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    ),
    discount: money(
      lines.reduce(
        (sum, line) => sum + (line.listPrice - line.price) * line.quantity,
        0,
      ),
    ),
    internalCost: money(
      lines.reduce((sum, line) => sum + line.internalCost * line.quantity, 0),
    ),
    restrictedFields: ["discount", "internalCost"],
    timestamp: new Date().toISOString(),
  };
}

export async function addOrder(invoice: Invoice): Promise<Invoice> {

  // opens the file & reads it as plain text. (await = pause here until finished)
  const raw = await fs.readFile(filePath, "utf-8");

  // turns the text into a real array of 'Invoice' objects we can use.
  const invoices: Invoice[] = JSON.parse(raw);

  // adds the new invoice onto the end of the array, in memory (not saved yet)
  invoices.push(invoice);

  // [fs.writeFile]: saves the text back into the file, overwrites what was there.
  // [JSON.stringify()]: turns the array back into text. The 'null, 2' part make it print nicely formatted with 2 space indents, instead of all on one line.
  await fs.writeFile(filePath, JSON.stringify(invoices, null, 2));

  /* [On-Demand Revalidation]:
  A new order was just saved, so any stock numbers already cached under the "stock" tag are 
  now out of date. This clears them out, so the next stock check looks up a fresh number instead 
  of reusing the old one. */
  revalidateTag("stock", "max");

  // hands back the invoice that was just added, in case whatever calls this function want to confirm it or show it on screen.
  return invoice;
}


/* Returns just one account's past orders. Reads the same file addOrder
 writes to, then filters it down to entries matching this accountId. */
export async function getOrderHistory(accountId: number): Promise<Invoice[]> {
  const raw = await fs.readFile(filePath, "utf-8");
  const invoices: Invoice[] = JSON.parse(raw);

  return invoices.filter((invoice) => invoice.accountId === accountId);
}
