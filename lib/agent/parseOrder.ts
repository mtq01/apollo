import { Anthropic } from "@anthropic-ai/sdk";
import { record_items, recordItemsSchema } from "@/lib/tools/recordItemsTool";
import { get_order_history } from "@/lib/tools/getOrderHistoryTool";
import { get_invoice } from "@/lib/tools/getInvoiceTool";
import { z } from "zod";

//A schema is a set of rules describing what data should look like.
const invoiceSchema = z.object({
  invoiceId: z.string(),
});

import { getAccountInvoices } from "@/lib/erp/invoice";
import type { UserContext } from "@/types";

type ParsedOrder =
   {
      type: "invoice";
      invoiceId: string;
    }
  | {
      type: "products";
      products: z.infer<typeof recordItemsSchema>["products"];
      summary: z.infer<typeof recordItemsSchema>["summary"];
    };

const anthropic = new Anthropic();

export async function parseOrder(text: string, account: UserContext): Promise<ParsedOrder> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: text,
    },
  ];
  //This prevents Claude from getting stuck in an endless tool-calling loop. This is basically saying: Claude can interact with my tools at most 5 times during this parsing process.
  const MAX_ROUNDS = 5;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    //we are telling Clayde: "Here is the customer's message and these are the tools you have. What do you want to do?"
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      /* temperature controls how random Claude's answers are. 0 means "always pick the most likely answer" instead of varying between calls,
        we need this here because without it, the same typed text (like "kabord") could get parsed differently each time. sometimes Claude
        would silently "correct" it to "keyboard" in productGuess.name, other times it wouldn't. that made lookupProduct's exact-match check
        inconsistent. same input, different result, just by chance. */
      temperature: 0,


      tools: [record_items, get_order_history, get_invoice],

      tool_choice: {
        type: "any",
      },

      messages,
    });

    // Check if Claude called get_order_history
    const historyToolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === "tool_use" && block.name === "get_order_history",
    );

    if (historyToolUse) {
      // Claude asked for the buyer's previous orders.
      // We already know the account, so our code uses account.id.
      const history = await getAccountInvoices(account.id);

      // Give Claude both:
      // 1. Its own tool request
      // 2. The result from our real invoice lookup
      messages.push({
        role: "assistant",
        content: message.content,
      });

      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: historyToolUse.id,
            content: JSON.stringify(history),
          },
        ],
      });

      // Claude has not finished yet.
      // It needs to see the history and decide what products
      // should be reordered.
      continue;
    }

    // Check if Claude called get_invoice
    const invoiceToolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === "tool_use" && block.name === "get_invoice",
    );

    if (invoiceToolUse) {
      const result = invoiceSchema.safeParse(invoiceToolUse.input);

      if (!result.success) {
        console.error(result.error);
        throw new Error("Claude returned the wrong invoice shape");
      }

      return {
        type: "invoice",
        invoiceId: result.data.invoiceId,
      };
    }


    // Check if Claude called record_items
    const recordedItems = message.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === "tool_use" && block.name === "record_items",
    );

    if (recordedItems) {
      // Validate Claude's output with Zod
      const result = recordItemsSchema.safeParse(recordedItems.input);

      if (!result.success) {
        console.error(result.error);
        throw new Error("Claude returned the wrong shape");
      }

      // Claude has finished parsing the order.
      // ... means take everything inside result.data and copy it into this new object.
      return {
        type: "products",
        ...result.data,
      };
    }

    // Claude didn't call either tool.
    throw new Error("Claude did not call a recognized tool");
  }

  // Claude kept asking for tools for too many rounds.
  throw new Error("Claude exceeded the maximum number of parsing rounds");
}
