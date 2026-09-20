// describe, it, and expect are the three tools Vitest gives us for writing tests.
import { describe, expect, it } from "vitest";

// The function we are testing. 
import { findClosestMatches } from "@/lib/erp/fuzzyMatch";

// describe groups related tests under one name, so the results are easy to read.
describe("findClosestMatches", () => {
  // Each "it" is one test. The words say what should happen.
  it("suggests the keyboard for the typo 'kabord'", () => {
    // Run the real function with a misspelled word.
    const matches = findClosestMatches("kabord");

    /* expect(...) says "look at this value." toBe(...) says "it must equal this."
       matches[0] is the first, closest match. If it is not the keyboard, the
       test fails. */
    expect(matches[0].product.name).toBe("Mechanical Keyboard");
  });

  it("ignores upper and lower case", () => {
    // Capital letters should not make a word look like a typo.
    const matches = findClosestMatches("KABORD");
    expect(matches[0].product.name).toBe("Mechanical Keyboard");
  });

  it("suggests nothing for text that is nothing like a product", () => {
    // Nonsense should get no suggestions, not a bad guess. toEqual([]) means
    // "the result is an empty list."
    expect(findClosestMatches("zzzzzzzz")).toEqual([]);
  });
});
