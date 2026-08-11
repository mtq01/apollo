// https://platform.claude.com/docs/en/build-with-claude/working-with-messages
// https://platform.claude.com/docs/en/get-started

import { Anthropic } from "@anthropic-ai/sdk";
import { record_items, recordItemsSchema } from "@/lib/tools/recordItemsTool";

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
          content: "hi 1 milliion skus",
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
    return Response.json({ output: result.data });
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
