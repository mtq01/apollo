import { Anthropic } from "@anthropic-ai/sdk";

export const get_order_history: Anthropic.Tool = {
  name: "get_order_history",

  description:
    "Call this when the buyer's message implies they want to reorder something from the past, such as 'reorder what I got last time'. Use this tool before record_items so you can see the buyer's previous orders.",

  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};