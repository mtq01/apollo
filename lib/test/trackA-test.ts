import { addOrder, getOrderHistory } from "../order/order";
import { getERPStock } from "../erp/mockERP";
import { getQuoteForProduct } from "../erp/productQuote";
import type { UserContext, Product } from "@/types";

async function main() {
  // Confirm the same sku returns the same stock number every time
  const a = await getERPStock("SKU-1001");
  const b = await getERPStock("SKU-1001");
  console.log("Same SKU, two calls:", a.stock, b.stock, a.stock === b.stock ? "✅ matches" : "❌ different");

  // Confirm getOrderHistory filters correctly
  const mikesOrders = await getOrderHistory(3);
  console.log("Mike's orders:", mikesOrders);

  // Confirm addOrder appends without wiping existing data
  const before = (await getOrderHistory(3)).length;
  await addOrder({
    id: crypto.randomUUID(),
    accountId: 3,
    items: [{ sku: "SKU-1007", quantity: 1 }],
    timestamp: new Date().toISOString(),
  });
  const after = (await getOrderHistory(3)).length;
  console.log("Order count for Mike, before → after:", before, "→", after);

  // Confirm a stock-check failure returns normally instead of throwing, and still includes price + a stockError reason
  const testAccount: UserContext = { id: 3, name: "Mike", role: "buyer", accountType: "standard", assignedWarehouse: "WH-1" };
  const testProduct: Product = { sku: "SKU-1001", name: "Test Widget", basePrice: 10, leadTime: 3, warehouse: "WH-1" };

  const timeoutResult = await getQuoteForProduct({ account: testAccount, product: testProduct }, "timeout");
  console.log(
    "Timeout case — price present:", timeoutResult.price !== undefined,
    "| stock:", timeoutResult.stock,
    "| stockError.type:", timeoutResult.stockError?.type,
    timeoutResult.price !== undefined && timeoutResult.stockError?.type === "timeout" ? "✅ passed" : "❌ failed"
  );

  const notFoundResult = await getQuoteForProduct({ account: testAccount, product: testProduct }, "not found");
  console.log(
    "Not found case — price present:", notFoundResult.price !== undefined,
    "| stock:", notFoundResult.stock,
    "| stockError.type:", notFoundResult.stockError?.type,
    notFoundResult.price !== undefined && notFoundResult.stockError?.type === "not found" ? "✅ passed" : "❌ failed"
  );
}

main();