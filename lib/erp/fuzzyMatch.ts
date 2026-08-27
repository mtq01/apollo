import catalog from "@/data/catalog.json";
import { distance } from "fastest-levenshtein";
import type { Product } from "@/types";


/*
- getCutoff — decides how many character-edits are "too many" before a suggestion isn't worth showing, scaled to how long the query is (short SKU = tighter tolerance, longer name = a bit more slack), capped between 1 and 3.
- findClosestMatches — normalizes the buyer's query (lowercase, trimmed), then for every catalog product computes the edit-distance against both product.name and product.sku, keeping whichever is closer (Math.min). That's your "match against name or SKU" decision, both checked in one pass.
- .filter(...) — drops anything whose distance is worse than the cutoff, so a wildly-off guess (e.g. "banana") returns nothing instead of forcing a suggestion.
- .sort(...) — puts the closest match first.
- .slice(0, 3) — caps it at 3 suggestions, per the "2-3 closest matches" spec.
*/

/* How many characters different we're willing to accept before saying "too different, don't suggest this" - scaled to how long the query is.
- A short SKU typo gets a tighter cutoff than a longer product name typo.
- Never less than 1 (always allow at least a 1-character typo), never more than 3 (so we don't start suggesting wildly different products). */
function getCutoff(query: string): number {
  const relative = Math.ceil(query.length * 0.4); // 40% of the query's length
  return Math.min(3, Math.max(1, relative));
}

export function findClosestMatches(
  query: string,
): { product: Product; score: number }[] {
  const normalizedQuery = query.toLowerCase().trim();
  const cutoff = getCutoff(normalizedQuery);

  // for every product in the catalog, check the query against its name, its sku,
  // AND each individual word inside its name, and keep whichever is closest.
  //
  // why check individual words too: comparing "kabord" against the whole string
  // "mechanical keyboard" gives a huge distance, since "mechanical " isn't in the
  // query at all - even though "kabord" is a near-perfect typo of just "keyboard".
  // checking each word separately lets a one-word typo match the one word it's
  // actually close to, instead of being penalized for the rest of a multi-word name.
  const scored = (catalog as Product[]).map((product) => {
    const normalizedName = product.name.toLowerCase().trim();
    const nameWords = normalizedName.split(" ");

    const nameDistance = Math.min(
      distance(normalizedQuery, normalizedName),
      ...nameWords.map((word) => distance(normalizedQuery, word)),
    );

    const skuDistance = distance(
      normalizedQuery,
      product.sku.toLowerCase().trim(),
    );

    const score = Math.min(nameDistance, skuDistance);

    return { product, score };
  });

  return scored
    .filter((match) => match.score <= cutoff)   // drop anything too different
    .sort((a, b) => a.score - b.score)          // closest match first
    .slice(0, 3);                               // only the top 3
}
