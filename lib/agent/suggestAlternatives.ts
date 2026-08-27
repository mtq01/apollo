import { findClosestMatches } from "@/lib/erp/fuzzyMatch";
import type { Product } from "@/types";

/* Turns a raw fuzzy-match result into something buyer-facing.
findClosestMatches only returns data (products + scores) - this is where
that data becomes a plain-English message, same tone as buyerErrorMessage
in errorMessages.ts. No "score" or internal wording ever reaches this
message, only product names the buyer would recognize. */
export function suggestAlternatives(rawText: string): {
  suggestions: { product: Product; score: number }[];
  message: string;
} {
  const suggestions = findClosestMatches(rawText);

  if (suggestions.length === 0) {
    return {
      suggestions,
      message: `We couldn't find "${rawText}" in the catalog.`,
    };
  }

  const names = suggestions.map((match) => match.product.name).join(", ");

  return {
    suggestions,
    message: `We couldn't find "${rawText}" exactly. Did you mean: ${names}?`,
  };
}
