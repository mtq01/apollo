import { describe, expect, it } from "vitest";
import { clampQuantity, isValidQuantity, MAX_QUANTITY } from "@/lib/orderLimits";

describe("isValidQuantity", () => {
  it("accepts whole numbers from 1 to the max", () => {
    expect(isValidQuantity(1)).toBe(true);
    expect(isValidQuantity(MAX_QUANTITY)).toBe(true);
  });

  it("rejects zero, negatives, decimals and anything over the max", () => {
    for (const quantity of [0, -1, 2.5, MAX_QUANTITY + 1, NaN, Infinity]) {
      expect(isValidQuantity(quantity), String(quantity)).toBe(false);
    }
  });
});

describe("clampQuantity", () => {
  it("keeps a valid quantity as it is", () => {
    expect(clampQuantity(7)).toBe(7);
  });

  it("raises anything below 1 to 1, and rounds decimals down", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(-5)).toBe(1);
    expect(clampQuantity(2.9)).toBe(2);
  });

  it("caps anything over the max", () => {
    expect(clampQuantity(99_999)).toBe(MAX_QUANTITY);
  });

  it("turns a non-number (an empty input) into 1", () => {
    expect(clampQuantity(NaN)).toBe(1);
  });
});
