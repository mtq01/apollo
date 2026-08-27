import { findClosestMatches } from "@/lib/erp/fuzzyMatch"; 
import type { ErrorType, Product } from "@/types";        

// turns findClosestMatches's raw data into exactly what LineItemResult's "unmatched" case needs, no extra wrapping required by the caller
export function suggestAlternatives(rawText: string): {
  suggestions: { product: Product; score: number }[];           // the close-guess products
  matchError: ErrorType;                                        // ready-to-use error, message included
} {
  const suggestions = findClosestMatches(rawText);              // look for close matches

  if (suggestions.length === 0) {
    // nothing was close enough. no "did you mean" here, since there's nothing to suggest
    return {
      suggestions,
      matchError: {
        type: "not found",
        message: `We couldn't find "${rawText}" in the catalog.`,
      },
    };
  }

  // at least one close match was found. the actual product names are shown separately as a list (see page.tsx), not repeated in this message
  return {
    suggestions,
    matchError: {
      type: "not found",
      message: `We couldn't find "${rawText}" exactly. Did you mean one of these?`,
    },
  };
}
