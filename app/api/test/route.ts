// https://platform.claude.com/docs/en/build-with-claude/working-with-messages
// https://platform.claude.com/docs/en/get-started

import { parseOrder } from "@/lib/agent/parseOrder";
import { lookupProduct } from "@/lib/erp/productLookup";
import { getQuoteForProduct } from "@/lib/erp/productQuote";
import type { UserContext } from "@/types";

export async function POST(request: Request) {
  try {
    // The customer account. This is temporary. Eventually this would come from the logged-in user's session.
    const mahtab: UserContext = {
      id: 2,
      name: "Mahtab",
      role: "manager",
      accountType: "contract",
      assignedWarehouse: "Toronto",
    };

    // The customer's message. This is hard-coded for testing right now.
    const {text} = await request.json();

    // parseOrder handles Claude + tool selection + parsing.
    //
    // It can:
    // - call record_items for a regular request
    // - call get_order_history for a reorder
    // - then call record_items after getting the history
    const parsedItems = await parseOrder(text, mahtab);

    // If Claude didn't find any products,
    // there is nothing to look up or quote.
    if (parsedItems.products.length === 0) {
      return Response.json({
        parsed: parsedItems,
        results: [],
        message: "No products were requested.",
      });
    }

    // Store the final result for each requested product.
    const results = [];

    for (const item of parsedItems.products) {
      // Find the real product in catalog.json.
      const product = lookupProduct({
        sku: item.sku,
        productName: item.productGuess.name,
      });

      // Product wasn't found.
      if (!product) {
        results.push({
          requestedItem: item.rawText,
          quantity: item.quantity,
          error: "Product not found",
        });

        continue;
      }

      // Run pricing / stock / warehouse logic.
      try {
        const quote = await getQuoteForProduct({
          account: mahtab,
          product,
        });

        results.push({
          requestedItem: item.rawText,
          quantity: item.quantity,
          ...quote,
        });
      } catch (error) {
        console.log("Quote failed:", error);

        results.push({
          requestedItem: item.rawText,
          quantity: item.quantity,
          error: "Unable to get quote",
        });
      }
    }

    // Return the parsed request and the quote results.
    return Response.json({
      parsed: parsedItems,
      results,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.log(error);

      return Response.json(
        { error: error.message },
        { status: 500 },
      );
    }

    throw error;
  }
}
