//test mockERP
import { getERPStock } from "./lib/erp/mockERP";

async function testERP() {
  for (let i = 1; i <= 6; i++) {
    try {
      const result = await getERPStock();
      console.log(`Call ${i}:`, result);
    } catch (error) {
      console.error(`Call ${i}:`, (error as Error).message);
    }
  }
}

testERP();

//test data type
import accounts from "./data/accounts.json";
import catalog from "./data/catalog.json";

import type { UserContext, Product } from "./types";

import {
  calculatePrice,
  seeStock,
  accessWarehouse,
  getProductResult,
} from "./lib/erp/accountRules";

const users = accounts as UserContext[];
const products: Product[] = catalog;


console.log(users);
console.log(products);

// Test calculate price
const mahtab = users.find((user) => user.name === "Mahtab")!; //find means go through an array and find the first item that matches my condition.
const keyboard = products.find((product) => product.sku === "SKU-1002")!;

console.log(
  "Mahtab's price:",
  calculatePrice({
    account: mahtab,
    product: keyboard,
  })
);


// Test stock visibility
const alex = users.find((user) => user.name === "Alex")!;
const mike = users.find((user) => user.name === "Mike")!;

console.log(
  "Alex can see stock:",
  seeStock({
    account: alex,
    product: keyboard,
  })
);

console.log(
  "Mike can see stock:",
  seeStock({
    account: mike,
    product: keyboard,
  })
);


// Test warehouse access
const vancouverProduct = products.find(
  (product) => product.sku === "SKU-1001"
)!;

console.log(
  "Mahtab can access Toronto product:",
  accessWarehouse({
    account: mahtab,
    product: keyboard,
  })
);

console.log(
  "Mahtab can access Vancouver product:",
  accessWarehouse({
    account: mahtab,
    product: vancouverProduct,
  })
);

console.log(
  getProductResult({
    account: mahtab,
    product: keyboard,
  })
);