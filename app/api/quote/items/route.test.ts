// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

// Keep the real ERPError class; only replace the stock call.
vi.mock("@/lib/erp/mockERP", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/erp/mockERP")>()),
  getERPStock: vi.fn(async () => ({ stock: 50, lastUpdated: new Date().toISOString() })),
}));

import { POST } from "@/app/api/quote/items/route";
import { getERPStock } from "@/lib/erp/mockERP";

async function quoteItems(items: { sku: string; quantity: number }[]) {
  const response = await POST(
    new Request("http://localhost/api/quote/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: 1, items }),
    }),
  );
  return { status: response.status, body: await response.json() };
}

describe("POST /api/quote/items: size limits (#6)", () => {
  it("rejects a quantity over 10,000", async () => {
    const { status, body } = await quoteItems([{ sku: "PER-2284", quantity: 10_001 }]);

    expect(status).toBe(400);
    expect(body.error).toEqual({ type: "invalid input", message: "Quantity can be at most 10,000." });
  });

  it("accepts a quantity of exactly 10,000", async () => {
    const { status } = await quoteItems([{ sku: "PER-2284", quantity: 10_000 }]);

    expect(status).toBe(200);
  });

  it("rejects more than 100 items", async () => {
    const items = Array.from({ length: 101 }, () => ({ sku: "PER-2284", quantity: 1 }));
    const { status, body } = await quoteItems(items);

    expect(status).toBe(400);
    expect(body.error).toEqual({ type: "invalid input", message: "Add at most 100 items at a time." });
  });

  it("accepts exactly 100 items", async () => {
    const items = Array.from({ length: 100 }, () => ({ sku: "PER-2284", quantity: 1 }));
    const { status } = await quoteItems(items);

    expect(status).toBe(200);
  });
});

describe("POST /api/quote/items: demo forceFailure flag (#9)", () => {
  async function quoteWithForcedTimeout() {
    vi.mocked(getERPStock).mockClear();
    const response = await POST(
      new Request("http://localhost/api/quote/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: 1,
          items: [{ sku: "PER-2284", quantity: 1 }],
          forceFailure: "timeout",
        }),
      }),
    );
    return response.status;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ignores forceFailure when the flag is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO_FAILURES", "");

    expect(await quoteWithForcedTimeout()).toBe(200);
    expect(getERPStock).toHaveBeenCalledWith("PER-2284", undefined);
  });

  it("passes forceFailure to the ERP when the flag is 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO_FAILURES", "true");

    expect(await quoteWithForcedTimeout()).toBe(200);
    expect(getERPStock).toHaveBeenCalledWith("PER-2284", "timeout");
  });
});
