import catalog from "../../data/catalog.json";

export type ERPStockResponse = {
  stock: number;
  lastUpdated: string;
};

/**
 * Simulates an ERP inventory lookup.
 * - Random delay between 300ms and 1500ms
 * - 15% chance of throwing a timeout error
 * - Otherwise returns stock + timestamp
 */

export async function getERPStock(
  sku: string //A SKU is a unique product identifier. So it's a good way for the ERP system to know exactly which product's stock we want
): Promise<ERPStockResponse> {
  // Random delay (300–1500ms)
  const delay = Math.floor(Math.random() * 1200) + 300;

  await new Promise((resolve) => setTimeout(resolve, delay));

  // 15% timeout failure
  if (Math.random() < 0.15) {
    throw new Error("ERP request timed out");
  }

  // Find the product in the catalog
  const product = catalog.find(
    (product) => product.sku === sku
  );

  // Product wasn't found
  if (!product) {
    throw new Error(`Product ${sku} not found`);
  }

  return {
    stock: product.stock,
    lastUpdated: new Date().toISOString(),
  };
}