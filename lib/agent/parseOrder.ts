import { Anthropic } from "@anthropic-ai/sdk";
import {
  record_items,
  recordItemsSchema,
} from "@/lib/tools/recordItemsTool";
import type { UserContext } from "@/types";

const anthropic = new Anthropic();

export async function parseOrder(
  text: string,
  account: UserContext,
) {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,

    tools: [record_items],

    tool_choice: {
      type: "tool",
      name: "record_items",
    },

    messages: [
      {
        role: "user",
        content: text,
      },
    ],
  });

  // Find Claude's record_items tool response
  const recordedItems = message.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === "record_items",
  );

  if (!recordedItems) {
    throw new Error("Claude did not call the record_items tool");
  }

  // Validate Claude's output with Zod
  const result = recordItemsSchema.safeParse(recordedItems.input);

  if (!result.success) {
    console.error(result.error);
    throw new Error("Claude returned the wrong shape");
  }

  // Return the validated structured data
  return result.data;
}