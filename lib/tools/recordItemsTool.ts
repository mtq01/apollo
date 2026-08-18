import { Anthropic } from "@anthropic-ai/sdk/index.js";
import { z } from "zod";

export const record_items: Anthropic.Tool = {
  // https://json-schema.org/learn/getting-started-step-by-step
  //export const list = {   TypeScript's name. Claude never sees it.
  //name: "extract_items", How Claude Identifies the tool. TypeScript doesn't care
  // we could techinacally just make this a normal json, but you wodunt be able to add comments
  name: "record_items",

  //Strict is what makes it impossible to skip one, I Found out the hard way
  strict: true,
  description: `Records the line items a buyer asked for in a pasted reorder message. Call this once per paste, after reading the whole text - every item the buyer mentioned goes in a single call, not one call per item.
Infer as much as the buyer's words support. If they wrote "a pair of blue jeans", that is a jeans product with color blue - fill in productGuess.name and every attribute the text implies, even loosely. Partial or vague descriptions still belong in productGuess; that is what it is for, and confidence is where you record how sure you are.
The one thing not to invent is sku. Fill it only when the buyer typed digits or a product code. If they did not, set it to null - an invented code silently matches a real but wrong product, while a null tells the lookup to search by description instead. Same for attributes the buyer never mentioned: null, not a plausible-sounding guess.
If a code the buyer typed looks malformed - wrong length, unexpected format, prefixed oddly - record it exactly as typed, say so in note, and lower confidence. Do not correct it. You cannot see the catalog, so you have no way to know what the right code would be; a later step handles near-matches.
If the buyer asks for something you do not recognize, put their own words in productGuess.name. Do not substitute a similar product you do know.
Write the note field before choosing confidence, so the confidence reflects what the note says was missing or assumed. Quantity and unit are separate: "3 cases" is quantity 3 with unit "case", not 3 individual units.
This tool does not look up prices, stock, or catalog data. It records what the buyer appears to have asked for; a later step resolves that against the real catalog.
If the customer explicitly says they do not need anything,
such as "I need nothing", "I don't need anything", or
"I need no products", return an empty products array.
Do not treat words like "nothing" or "anything" as product names
when they are being used to say that the customer wants no products.
If the customer says "a" or "an" before a product, treat the quantity as 1.`,
  /*
   * input_schema is just the shape we want the json to come back as.
   * the description tells claude how to use that shape
   *
   * the schema gets enforced. the description doesn't, claude just reads it.
   * fields can have their own description as well. put the rule right on
   * the field when it only applies to that one, easier to find later.
   */

  /*
   * what claude sends back:
   *
   * one object with two things in it.
   *
   *   products   an array of objects. one entry per thing the buyer asked for.
   *              each entry has rawText, sku, quantity, unit,
   *              productGuess, note, confidence.
   *
   *   summary    an object that contains two keys. totalItems, needsReview.
   *
   * every field is always there. if the buyer didn't say something it
   * comes back as null, not missing. so you can check for null and never
   * have to check whether the key exists.
   *
   * sku is only filled if they typed a code. otherwise it's null and you
   * search by productGuess instead.
   */
  input_schema: {
    type: "object",
    properties: {

      intent: {
        type: "string",
        enum: ["product_request", "reorder"],
        description:
          "The customer's request type. Use 'reorder' when the customer asks to reorder a previous or last order. Otherwise use 'product_request'.",
           },
      products: {
        type: "array",
        description:
          "One entry per product the buyer asked for, in the order they wrote them. A paste with three products produces three entries.",
        items: {
          type: "object",
          properties: {
            rawText: {
              type: "string",
              description:
                "The exact words from the buyer's message that produced this item, copied verbatim. Do not correct spelling, expand abbreviations, or tidy it up. Include only the span for this item, not the whole message. Greetings, signatures, and delivery instructions are not items and do not belong here.",
            },
            sku: {
              type: ["string", "null"],
              description:
                "The product's stock keeping unit, if the user provided one. If they did not, set this to null.",
            },
            quantity: {
              type: ["number", "null"],
              description:
                "The quantity of the item, if the user provided one. If they did not, set this to null.",
            },
            unit: {
              type: ["string", "null"],
              description:
                "The unit of the item, if the user provided one. If they did not, set this to null.",
            },
            productGuess: {
              type: "object",
              description:
                "The product the buyer appears to have asked for, based on their words. Always present. Fields inside are null when the buyer did not say.",
              properties: {
                name: {
                  type: ["string", "null"],
                  description:
                    "The name of the product, if the user provided one. If they did not, set this to null.",
                },
                attributes: {
                  type: "object",
                  description:
                    "The attributes of the product. Always present. Each field is null when the buyer did not state it.",
                  properties: {
                    brand: {
                      type: ["string", "null"],
                      description:
                        "The brand of the product, if the user provided one. If they did not, set this to null.",
                    },
                    model: {
                      type: ["string", "null"],
                      description:
                        "The model of the product, if the user provided one. If they did not, set this to null.",
                    },
                    color: {
                      type: ["string", "null"],
                      description:
                        "The color of the product, if the user provided one. If they did not, set this to null.",
                    },
                    size: {
                      type: ["string", "null"],
                      description:
                        "The size of the product, if the user provided one. If they did not, set this to null.",
                    },
                  },
                  required: ["brand", "model", "color", "size"],
                  additionalProperties: false,
                },
              },
              required: ["name", "attributes"],
              additionalProperties: false,
            },
            note: {
              type: "string",
              description:
                "One sentence naming what was missing or assumed for this item. Write this before choosing confidence.",
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description:
                "How sure you are about this line as a whole. high when the buyer gave a code or every attribute needed to identify the product, medium when there is no code but distinguishing attributes were given, low when only a generic description or a single attribute was given.",
            },
          },
          required: [
            "rawText",
            "sku",
            "quantity",
            "unit",
            "productGuess",
            "note",
            "confidence",
          ],
          additionalProperties: false,
        },
      },
      summary: {
        type: "object",
        description: "Counts across the whole paste.",
        properties: {
          totalItems: {
            type: "number",
            description: "How many entries are in the products array.",
          },
          needsReview: {
            type: "number",
            description:
              "How many of those entries have confidence medium or low.",
          },
        },
        required: ["totalItems", "needsReview"],
        additionalProperties: false,
        //required: these must be here
        //additionalProperties: false  and nothing else may be
      },
    },
    required: ["products", "summary"],
    additionalProperties: false,
  },
};

// : https://zod.dev/basics now lets validate this json schema with zod.

/*
 * same shape as input_schema above, rewritten in zod.
 *
 * input_schema is what we SEND claude. this is what we CHECK when it answers.
 * no descriptions down here those are instructions for claude as they create the fields
 * up there where claude reads them.
 *
 * two things from up there are missing on purpose:
 *   required               zod fields are required unless you add .optional()
 *   additionalProperties   z.object() already strips keys it doesn't know
 */
export const recordItemsSchema = z.object({
  intent: z.enum(["product_request", "reorder"]),
  products: z.array(
    z.object({
      rawText: z.string(),
      sku: z.string().nullable(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
      productGuess: z.object({
        name: z.string().nullable(),
        attributes: z.object({
          brand: z.string().nullable(),
          model: z.string().nullable(),
          color: z.string().nullable(),
          size: z.string().nullable(),
        }),
      }),
      note: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
  summary: z.object({
    totalItems: z.number(),
    needsReview: z.number(),
  }),
});
