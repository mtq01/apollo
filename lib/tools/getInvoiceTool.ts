import { Anthropic } from "@anthropic-ai/sdk";

export const get_invoice: Anthropic.Tool = {
  name: "get_invoice",

  description:
    "Call this when the buyer asks to view, look up, or retrieve an invoice, bill, or receipt, or when the buyer types an invoice ID on its own, like inv-1001, with no other words. Invoice IDs always begin with 'inv-' followed by four digits, for example inv-1001. Do not call this for a product code. Product SKUs use a three-letter category prefix and four digits, for example PER-2284 or ACC-3391, and identify catalog products rather than invoices, those belong to record_items, including when the buyer types one on its own with no quantity and no other words.",

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
