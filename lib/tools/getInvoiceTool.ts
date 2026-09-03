import { Anthropic } from "@anthropic-ai/sdk";

export const get_invoice: Anthropic.Tool = {
  name: "get_invoice",

  description:
    "Call this when the buyer asks to view, look up, or retrieve an invoice. Use the invoice ID provided by the buyer when available.",

  input_schema: {
    type: "object",
    properties: {
      invoiceId: {
        type: "string",
        description: "The invoice ID the buyer wants to look up.",
      },
    },
    required: ["invoiceId"],
  },
};