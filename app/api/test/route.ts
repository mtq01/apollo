// https://platform.claude.com/docs/en/build-with-claude/working-with-messages
// https://platform.claude.com/docs/en/get-started

import { Anthropic } from "@anthropic-ai/sdk";
import { record_items } from "@/lib/tools/recordItemsTool";

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
          content: "3 cases of 16oz clear cups, sku 88231",
        },
      ],
    });
    //in node js, by default console.log shows in the terminal, not the web browser
    console.log("TESTTTT");
    console.log(message);
    return Response.json({ message });
  } catch (error) {
    // https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript#handling-errors
    // claude api built in error suppoerter if we want to handle errors with more detail specifically to the api"
    if (error instanceof Anthropic.APIError) {
      console.log(error.status); // 400
      console.log(error.name); // BadRequestError
      return Response.json({ error: error.message }, { status: error.status });
    } else {
      throw error;
    }
  }
}
