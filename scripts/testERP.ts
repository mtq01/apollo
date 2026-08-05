import { getERPStock } from "../lib/erp/mockERP";

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