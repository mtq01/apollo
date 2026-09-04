import { Anthropic } from "@anthropic-ai/sdk";

export const get_order_history: Anthropic.Tool = {
  name: "get_order_history",

  description:
    "Call this only when the buyer explicitly asks to reorder from or view their past orders, using a phrase like 'reorder what I got last time', 'same as last month', 'show me my past orders', or 'my order history'. Do not call this for a bare name, a greeting, or text that is not clearly about past orders. It takes no arguments and returns every past order for this account. Past orders are not invoices. After calling this, call record_items with the products the buyer wants from the history.",

  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};