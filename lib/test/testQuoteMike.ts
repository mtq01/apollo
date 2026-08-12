import { getQuoteForProduct } from "../erp/productQuote";
import type { UserContext, Product } from "../../types";
import accountsData from "../../data/accounts.json"; // raw sample accounts
import productsData from "../../data/catalog.json"; // raw sample products

// tell TypeScript these JSON files match our real types.
const accounts = accountsData as UserContext[];
const products = productsData as Product[];

// runs getQuoteForProduct for every 'account x product combo', and logs the result.
async function runTests() {
  // manual forced failure call
  console.log("--- Manually forced failure test ---");
  try {
    await getQuoteForProduct(
      { account: accounts[0], product: products[0] },
      "timeout",
    );
  } catch (error) {
    console.log("Forced Error Successful!", (error as Error).message);
  }

  for (const account of accounts) {
    // loop through each account
    for (const product of products) {
      // loop through each product, for this account
      try {
        console.log(
          `--- ${account.name} (${account.role} - ${account.accountType}) x ${product.sku} ---`,
        ); // label this test case
        console.log(await getQuoteForProduct({ account, product })); // run the quote and print the result
      } catch (error) {
        // getERPStock can randomly time out, catch it here so one failure
        // doesn't stop the rest of the loop from running.
        console.log(
          `--- ${account.name} (${account.role}) x ${product.sku}: FAILED ---`,
        );
        console.log((error as Error).message); // print just the error message
      }
    }
  }
}

runTests(); // actually kick off the test run
