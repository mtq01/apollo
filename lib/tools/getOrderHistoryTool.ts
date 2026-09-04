import { Anthropic } from "@anthropic-ai/sdk";

export const get_order_history: Anthropic.Tool = {
  name: "get_order_history",

  description:
    "Call this when the buyer refers to their own past orders in any way - to view them ('show me my past orders', 'what did I order last time', 'my order history') or to reorder from them ('reorder what I got last time', 'same as last month'). Returns every past order for this account. It takes no arguments and needs no order ID. Past orders are not invoices: an order is what the buyer requested, an invoice is a bill identified by an ID like inv-1001. Use get_invoice only when the buyer names an invoice ID or asks for a bill or receipt. After calling this, call record_items with the products the buyer wants from that history.",

  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};