// https://platform.claude.com/docs/en/build-with-claude/working-with-messages
// https://platform.claude.com/docs/en/get-started

import { Anthropic } from "@anthropic-ai/sdk";
import { record_items, recordItemsSchema } from "@/lib/tools/recordItemsTool";
import { lookupProduct } from "@/lib/erp/productLookup";
import { getQuoteForProduct } from "@/lib/erp/productQuote";

const anthropic = new Anthropic();
console.log("hello3");
export async function POST() {
  // Choosing a model: //https://platform.claude.com/docs/en/about-claude/models/overview
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      // https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
      // tools is the menu. tool_choice is the one you want claude to use. We only have one tool, so we tell claude to use it. If we had more than one, we could let claude choose which to use.
      tools: [record_items],
      tool_choice: { type: "tool", name: "record_items" },
      messages: [
        {
          role: "user",
          content: "I need a keyboard and 2 mouses", // We need to connect this part to the UI. right now is hard coded for testing.
        },
      ],
    });

    /*
     * claude's response has a lot we don't need. the part our tool created is
     * tagged tool_use with the tool's name on it. type has to be checked before
     * name, you can't ask which tool until you've proved it is one
     *
     * bascially, what we are doing here is saying lets check the part of the output
     * that claude used our tool for.
     *
     * Anthropic.ToolUseBlock only tells typescript what it's allowed to read.
     * it doesn't check anything at runtime, that's zod's job below.
     *
     */
    const recordedItems = message.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === "tool_use" && block.name === "record_items",
    );
    if (!recordedItems) {
      return Response.json(
        { error: "claude did not call the tool" },
        { status: 502 },
      );
    }
    // this is where zod comes in. safeparse checks if the object returned by claude matches the schema we defined
    // we need to use zod here because claude is outside of our control and could return anything.
    // since this is at runtime, not during developement, typescript can't actually confirm that the object matches
    // the shape we expect, so we have to check it using zod. if it doesn't match, we return an error to the user
    const result = recordItemsSchema.safeParse(recordedItems.input);
    if (!result.success) {
      console.log(result.error);
      return Response.json(
        { error: "claude returned the wrong shape" },
        { status: 502 },
      );
    }

    //explain everything in plain English

    // 1. Get Claude's validated JSON.
    //
    // 2. Pretend the customer is Mahtab.
    //
    // 3. Create an empty results array.
    //
    // 4. Take each item Claude found.
    //
    // 5. Look for that item in catalog.json.
    //
    // 6. If it doesn't exist:
    //        save "Product not found"
    //        move to the next item.
    //
    // 7. If it exists:
    //        send account + product
    //        to getQuoteForProduct().
    //
    // 8. Add the quote to results.
    //
    // 9. After ALL items are processed,
    //        return parsed data + results.

    // result.data is now the parsed customer request
    const parsedItems = result.data;

    // If Claude didn't find any products (There is nothing to look up, so the for loop doesn't even need to run.)
    if (parsedItems.products.length === 0) {
      return Response.json({
        parsed: parsedItems,
        results: [],
        message: "No products were requested.",
      });
    }

    // This acoount is temporary. Eventually, the account would probably come from our login/session rather than being written directly in the route.
    const mahtab = {
      id: 2,
      name: "Mahtab",
      role: "manager" as const, //as const tells TypeScript: This is specifically the value "manager", not just some string.
      accountType: "contract" as const,
      assignedWarehouse: "Toronto",
    };

    // We're going to put the final result for each requested product inside this array. for example: results = [keyboard result, mouse result]
    const results = [];

    for (const item of parsedItems.products) {
      // Find the real product in our catalog
      const product = lookupProduct({
        sku: item.sku,
        productName: item.productGuess.name,
      });

      // Product wasn't found
      if (!product) {
        results.push({
          requestedItem: item.rawText,
          quantity: item.quantity,
          error: "Product not found",
        });

        continue; // continue means stop processing this particular item and move to the next item in the loop.
      }

      // Run pricing / stock / warehouse logic
      try {
        const quote = await getQuoteForProduct({
          account: mahtab,
          product,
        });

        results.push({
          requestedItem: item.rawText,
          quantity: item.quantity,
          ...quote, // ...quote copies the properties from quote into the new object.
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
    // return everything
    return Response.json({
      parsed: parsedItems,
      results,
    });
    // return Response.json({ output: result.data });
  } catch (error) {
    // https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript#handling-errors
    // claude api built in error suppoerter if we want to handle errors with more detail specifically to the api"
    if (error instanceof Anthropic.APIError) {
      console.log(error.status); // 400
      console.log(error.name); // BadRequestError
      // error: error.message IS THE ERROR MESSAGE WE SEND BACK IN THE BODY OF THE RESPONSE.
      // error.status IS THE HTTP STATUS CODE WE SEND BACK IN THE RESPONSE. IT IS NOT THE ERROR MESSAGE.
      // Response.json(body, options)
      // body always goes first. options second
      return Response.json({ error: error.message }, { status: error.status });
    } else {
      throw error;
    }
  }
}
