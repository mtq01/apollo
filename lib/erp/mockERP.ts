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

//In a real ERP system, we'd likely do something like: const response = await fetch("/api/erp");

export async function getERPStock(): Promise<ERPStockResponse> {
  // Random delay (300–1500ms)
  const delay = Math.floor(Math.random() * 1200) + 300;

  await new Promise((resolve) => setTimeout(resolve, delay));

  // 15% timeout failure
  if (Math.random() < 0.15) {
    throw new Error("ERP request timed out");
  }

  return {
    stock: Math.floor(Math.random() * 500),
    lastUpdated: new Date().toISOString(),
  };
}