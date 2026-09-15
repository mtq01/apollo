import { Anthropic } from "@anthropic-ai/sdk";

export const get_order_history: Anthropic.Tool = {
  name: "get_order_history",

  description:
    "Call this only when the buyer explicitly asks to reorder from or view their past orders, using a phrase like 'reorder what I got last time', 'same as last month', 'show me my past orders', 'my order history', or 'the items from my last invoice'. Do not call this for a bare name, a greeting, or text that is not clearly about past orders. It takes no arguments and returns every past order for this account, each one with its id and timestamp. Every past order is itself an invoice. After calling this, look at the list and call get_invoice with the id of the single order the buyer means, the most recent one for 'last order' or 'last invoice', or whichever one matches a date or description the buyer gave. Do not call record_items with these results.",

  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};