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


const users = accounts as UserContext[];
const products: Product[] = catalog;


console.log(users);
console.log(products);