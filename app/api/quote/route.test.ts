// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

// No real Claude call: each test decides what the parser returns.
vi.mock("@/lib/agent/parseOrder", () => ({ parseOrder: vi.fn() }));
// Keep the real ERPError class; only replace the stock call.
vi.mock("@/lib/erp/mockERP", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/erp/mockERP")>()),
  getERPStock: vi.fn(async () => ({ stock: 50, lastUpdated: new Date().toISOString() })),
}));

import { POST } from "@/app/api/quote/route";
import { parseOrder } from "@/lib/agent/parseOrder";

async function quote(text: string) {
  const response = await POST(
    new Request("http://localhost/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, accountId: 1 }),
    }),
  );
  return { status: response.status, body: await response.json() };
}

// What Claude's record_items tool returns for one product.
function parsedProduct(quantity: number | null) {
  return {
    rawText: "2.5 wireless mice",
    sku: null,
    quantity,
    unit: null,
    productGuess: { name: "wireless mouse", attributes: { brand: null, model: null, color: null, size: null } },
    note: "",
    confidence: "high" as const,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  // a fake key, so the route thinks Claude is available (parseOrder itself is mocked)
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.mocked(parseOrder).mockResolvedValue({
    type: "products",
    products: [parsedProduct(1)],
    summary: { totalItems: 1, needsReview: 0 },
  });
});

describe("POST /api/quote: text length limit (#6)", () => {
  it("rejects text over 5,000 characters before it reaches Claude", async () => {
    const { status, body } = await quote("a".repeat(5001));

    expect(status).toBe(400);
    expect(body.error).toEqual({
      type: "invalid input",
      message: "That's too long. Paste up to 5,000 characters at a time.",
    });
    expect(parseOrder).not.toHaveBeenCalled();
  });

  it("accepts text of exactly 5,000 characters", async () => {
    const { status } = await quote("a".repeat(5000));

    expect(status).toBe(200);
    expect(parseOrder).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/quote: no Anthropic key (#12)", () => {
  it("refuses with a message pointing at product codes, without calling Claude", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { status, body } = await quote("2 wireless mice");

    expect(status).toBe(503);
    expect(body.error).toEqual({
      type: "request failed",
      message:
        "Looking up products by name isn't available right now. Paste product codes instead, like PER-2284 x2.",
    });
    expect(parseOrder).not.toHaveBeenCalled();
  });
});

describe("POST /api/quote: when parsing fails (#12)", () => {
  it("logs the real error, then gives the buyer a plain message", async () => {
    const realError = new Error("Claude returned the wrong shape");
    vi.mocked(parseOrder).mockRejectedValue(realError);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, body } = await quote("2 wireless mice");

    expect(status).toBe(400);
    expect(body.error).toEqual({ type: "request failed", message: "Couldn't read that order." });
    expect(consoleError).toHaveBeenCalledWith("[api/quote] parseOrder failed:", realError);
    consoleError.mockRestore();
  });
});

describe("POST /api/quote: a bad quantity from Claude (#5)", () => {
  it("returns that line as an unmatched row instead of failing the request", async () => {
    vi.mocked(parseOrder).mockResolvedValue({
      type: "products",
      products: [parsedProduct(2.5)],
      summary: { totalItems: 1, needsReview: 0 },
    });

    const { status, body } = await quote("2.5 wireless mice");

    expect(status).toBe(200);
    expect(body.quotes[0]).toMatchObject({
      status: "unmatched",
      matchError: { type: "invalid input" },
    });
  });
});
