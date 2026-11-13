// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "@/types";

// Fixed stock instead of the fake ERP's random delay and 15% timeout.
vi.mock("@/lib/erp/mockERP", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/erp/mockERP")>()), // keeps the real ERPError class
  getERPStock: vi.fn(async () => ({ stock: 50, lastUpdated: new Date().toISOString() })),
}));

/* The real getQuoteForProduct, unless a test flips `quoteBlowsUp` to make it throw.
   That's the only way to reach priceItems' "genuinely unexpected error" path. */
const quoteBlowsUp = vi.hoisted(() => ({ value: false }));
vi.mock("@/lib/erp/productQuote", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/erp/productQuote")>();
  return {
    ...real,
    getQuoteForProduct: vi.fn((...args: Parameters<typeof real.getQuoteForProduct>) =>
      quoteBlowsUp.value ? Promise.reject(new Error("boom")) : real.getQuoteForProduct(...args),
    ),
  };
});

import { priceItems } from "@/lib/erp/priceItems";
import { getERPStock } from "@/lib/erp/mockERP";

const alex: UserContext = {
  id: 1,
  name: "Alex",
  role: "admin",
  accountType: "standard",
  assignedWarehouse: "Vancouver",
  avatarUrl: "",
};

// One item the way /api/quote passes it after Claude parses the text.
function item(quantity: number | null) {
  return { sku: "PER-2284", productName: "Wireless Mouse", quantity, rawText: "wireless mouse" };
}

beforeEach(() => {
  vi.clearAllMocks();
  quoteBlowsUp.value = false;
});

describe("priceItems: an unexpected pricing error (#10)", () => {
  it("returns a failed row the cart can match to its line", async () => {
    quoteBlowsUp.value = true;
    const [row] = await priceItems(alex, [item(2)]);

    expect(row).toEqual({
      sku: "PER-2284", // the cart matches results to lines by sku; without it the row was dropped
      name: "Wireless Mouse",
      quantity: 2,
      stock: "error",
      stockError: { type: "request failed", message: "Something went wrong pricing this item." },
    });
  });
});

describe("priceItems: every call checks stock (#4)", () => {
  it("asks the ERP again on a second quote for the same product", async () => {
    await priceItems(alex, [item(1)]);
    await priceItems(alex, [item(1)]);

    expect(getERPStock).toHaveBeenCalledTimes(2);
  });
});

describe("priceItems: quantities Claude got wrong (#5)", () => {
  it.each([0, -1, 2.5, 10_001])("sends quantity %s to 'Couldn't add these', not the cart", async (quantity) => {
    const [row] = await priceItems(alex, [item(quantity)]);

    expect(row).toMatchObject({
      status: "unmatched",
      rawText: "wireless mouse",
      matchError: {
        type: "invalid input",
        message: `Couldn't use the quantity ${quantity}. Enter a whole number from 1 to 10,000.`,
      },
      quantity: null,
    });
    // nothing was priced or stock-checked for a line we can't use
    expect(getERPStock).not.toHaveBeenCalled();
  });

  it("prices a valid quantity as normal", async () => {
    const [row] = await priceItems(alex, [item(3)]);

    expect(row).toMatchObject({ sku: "PER-2284", name: "Wireless Mouse", price: 29.99, quantity: 3 });
  });

  it("prices a missing quantity as normal (the page treats it as 1)", async () => {
    const [row] = await priceItems(alex, [item(null)]);

    expect(row).toMatchObject({ sku: "PER-2284", price: 29.99, quantity: null });
  });

  it("only rejects the bad line, not the rest of the paste", async () => {
    const rows = await priceItems(alex, [item(2.5), { ...item(2), sku: "ACC-3391", productName: "USB-C Hub" }]);

    expect(rows[0]).toMatchObject({ status: "unmatched" });
    expect(rows[1]).toMatchObject({ sku: "ACC-3391", quantity: 2 });
  });
});
