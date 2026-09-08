// this file takes the parsed item and find the actual product in the catalog.
import catalog from "../../data/catalog.json";
import type { Product } from "../../types";

export function lookupProduct({
  sku,
  productName,
}: {
  sku: string | null;
  productName: string | null;
}): Product | undefined { // This line describes what the function returns
  // If the customer gave us a SKU, use the SKU first
  if (sku) {
    return catalog.find((product) => product.sku === sku);
  }

  // If there is no SKU, try to find the product by name
  if (productName) {
  const searchName = productName.toLowerCase().trim().replace(/s$/, "");

  return catalog.find((product) => {
    const catalogName = product.name.toLowerCase().replace(/s$/, "");

    return (
      catalogName.includes(searchName) ||
      searchName.includes(catalogName)
    );
  });
}

return undefined;
}