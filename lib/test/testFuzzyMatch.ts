import { findClosestMatches } from "../erp/fuzzyMatch";

// a handful of hand-picked test cases, not every possible typo -
// just enough to sanity-check the function actually behaves.
const testCases = [
  "wireless mice", // name typo - should match Wireless Mouse (PER-2284)
  "PER-2248", // sku digit-swap typo - should match Wireless Mouse (PER-2284), not another PER- product
  "labtop stand", // name typo - should match Laptop Stand (ACC-1856)
  "keybord", // name typo - should match Mechanical Keyboard (PER-5017)
  "banana", // nonsense input - should return nothing, cutoff should reject it
];

function runTests() {
  for (const query of testCases) {
    console.log(`--- query: "${query}" ---`);
    console.log(findClosestMatches(query));
    console.log(); // blank line between results, easier to read
  }
}

runTests();
