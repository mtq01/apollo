import { lookupProduct } from "./lib/erp/productLookup";

const keyboard = lookupProduct({
  sku: null,
  productName: "Mechanical Keyboard",
});

console.log(keyboard);