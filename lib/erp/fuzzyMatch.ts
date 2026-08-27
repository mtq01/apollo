import catalog from "@/data/catalog.json";                            
import { distance } from "fastest-levenshtein";                         // tells us how many letters differ between two words
import type { Product } from "@/types";     


/* [ LEVENSHTEIN DISTANCE EQUATION ]

    It counts how many letters you'd need to change to turn one word into another. The more letters you'd need to change, the less alike the words are.
    - [Example]: turning "kabord" into "keyboard" takes 3 letter changes, so distance("kabord", "keyboard") returns 3.
*/

// decides how many letters can be different before we say "too different, don't suggest this"
function getCutoff(query: string): number {
  const relative = Math.ceil(query.length * 0.4);                       // allow about 40% of the word's length to be wrong
  return Math.min(3, Math.max(1, relative));                            // but never less than 1, never more than 3
}

export function findClosestMatches(
  query: string,                                                        // what the buyer typed
): { product: Product; score: number }[] {
  const normalizedQuery = query.toLowerCase().trim();                   // lowercase, no extra spaces - so casing isn't counted as a typo
  const cutoff = getCutoff(normalizedQuery);                            // how different is "too different" for this query

  // check this query against every product in the catalog
  const scored = (catalog as Product[]).map((product) => {
    const normalizedName = product.name.toLowerCase().trim();           // product name, lowercase and trimmed
    const nameWords = normalizedName.split(" ");                        // split the name into separate words

    // keep whichever comparison came out closest
    const nameDistance = Math.min(
      distance(normalizedQuery, normalizedName),                        // compare against the whole name
      ...nameWords.map((word) => distance(normalizedQuery, word)),      // AND compare against each word on its own
    ); 

    const skuDistance = distance(
      normalizedQuery,
      product.sku.toLowerCase().trim(),                                 // also compare against the product's sku
    );

    const score = Math.min(nameDistance, skuDistance);                  // use whichever is closer: the name or the sku

    return { product, score };                                          // pair this product with how close it is
  });

  return scored
    .filter((match) => match.score <= cutoff)                           // remove anything too different
    .sort((a, b) => a.score - b.score)                                  // put the closest match first
    .slice(0, 3);                                                       // only keep the top 3
}
