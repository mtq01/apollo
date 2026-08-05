// https://platform.claude.com/docs/en/build-with-claude/working-with-messages
// https://platform.claude.com/docs/en/get-started

import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic();
console.log("hello3");
export async function POST() {
  // Choosing a model: //https://platform.claude.com/docs/en/about-claude/models/overview
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: "congratulate the user, they just set up the claude api!",
        },
      ],
    });
    //in node js, by default console.log shows in the terminal, not the web browser
    console.log("TESTTTT");
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
