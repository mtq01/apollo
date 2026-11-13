// @vitest-environment node
// Route handlers use the server's Request and Response, so these tests run in Node, not the fake browser.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Invoice } from "@/types";

/* Replace the fake ERP so each test decides the stock count (or a failure) itself,
   instead of the random delay and 15% timeout. */
vi.mock("@/lib/erp/mockERP", () => ({ getERPStock: vi.fn() }));

/* Replace only the file reads and writes on invoices.json. visibleInvoice stays real,
   because hiding fields by role is part of what these tests check. */
vi.mock("@/lib/erp/invoice", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/erp/invoice")>()),
  getAllInvoices: vi.fn(async () => []),
  saveInvoice: vi.fn(async (invoice: Invoice) => invoice),
}));

import { POST } from "@/app/api/orders/route";
import { getERPStock } from "@/lib/erp/mockERP";
import { saveInvoice } from "@/lib/erp/invoice";

// Demo accounts (data/accounts.json)
const ALEX = 1; // admin, sees everything
const MIKE = 3; // buyer in Calgary: can't see stock for Wireless Mouse, which ships from Vancouver

// Wireless Mouse: $29.99, internal cost $17.99, ships from Vancouver
const MOUSE = "PER-2284";

// Make the ERP report this much stock for every product.
function stockIs(stock: number) {
  vi.mocked(getERPStock).mockResolvedValue({ stock, lastUpdated: new Date().toISOString() });
}

// Send a POST /api/orders the same way the cart does.
async function placeOrder(accountId: number, items: { sku: string; quantity: number }[]) {
  const response = await POST(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, items }),
    }),
  );
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/orders: what the response shows (#1)", () => {
  it("never sends internal cost or discount to a buyer", async () => {
    stockIs(50);
    const { status, body } = await placeOrder(MIKE, [{ sku: MOUSE, quantity: 2 }]);

    expect(status).toBe(200);
    expect(body.order.internalCost).toBe("hidden");
    expect(body.order.discount).toBe("hidden");
    expect(body.order.items[0].internalCost).toBe("hidden");
    // the real cost ($17.99 each, $35.98 total) appears nowhere in the response
    expect(JSON.stringify(body)).not.toMatch(/17\.99|35\.98/);
    // but the saved invoice still keeps the real numbers
    expect(vi.mocked(saveInvoice).mock.calls[0][0].internalCost).toBe(35.98);
  });

  it("still sends internal cost to an admin", async () => {
    stockIs(50);
    const { status, body } = await placeOrder(ALEX, [{ sku: MOUSE, quantity: 2 }]);

    expect(status).toBe(200);
    expect(body.order.internalCost).toBe(35.98);
    expect(body.order.id).toMatch(/^inv-\d+$/);
  });
});

describe("POST /api/orders: enough stock for the quantity (#2)", () => {
  it("rejects an order for more than is in stock, and saves nothing", async () => {
    stockIs(12);
    const { status, body } = await placeOrder(ALEX, [{ sku: MOUSE, quantity: 20 }]);

    expect(status).toBe(400);
    expect(body.error).toEqual({
      type: "invalid input",
      message: "Not enough stock for: Wireless Mouse (12 available, 20 requested)",
    });
    expect(saveInvoice).not.toHaveBeenCalled();
  });

  it("accepts an order for exactly what is in stock", async () => {
    stockIs(12);
    const { status } = await placeOrder(ALEX, [{ sku: MOUSE, quantity: 12 }]);

    expect(status).toBe(200);
    expect(saveInvoice).toHaveBeenCalledTimes(1);
  });

  it("adds up the same sku across lines before comparing", async () => {
    stockIs(12);
    const { status, body } = await placeOrder(ALEX, [
      { sku: MOUSE, quantity: 7 },
      { sku: MOUSE, quantity: 7 },
    ]);

    expect(status).toBe(400);
    expect(body.error.message).toBe(
      "Not enough stock for: Wireless Mouse (12 available, 14 requested)",
    );
  });

  it("does not reveal the stock count to a role that can't see it", async () => {
    stockIs(12);
    const { status, body } = await placeOrder(MIKE, [{ sku: MOUSE, quantity: 20 }]);

    expect(status).toBe(400);
    expect(body.error.message).toBe("Not enough stock for: Wireless Mouse");
  });
});

describe("POST /api/orders: stock is confirmed for every role (#3)", () => {
  it("checks stock with the ERP even when the buyer can't see it", async () => {
    stockIs(50);
    const { status } = await placeOrder(MIKE, [{ sku: MOUSE, quantity: 2 }]);

    expect(status).toBe(200);
    expect(getERPStock).toHaveBeenCalledWith(MOUSE, undefined);
  });

  it("rejects a buyer's order when that check fails, after one retry", async () => {
    vi.mocked(getERPStock).mockRejectedValue(new Error("ERP request timed out"));
    const { status, body } = await placeOrder(MIKE, [{ sku: MOUSE, quantity: 2 }]);

    expect(status).toBe(400);
    expect(body.error).toEqual({
      type: "timeout",
      message: "Stock could not be confirmed for: Wireless Mouse",
    });
    expect(getERPStock).toHaveBeenCalledTimes(2); // 1 try & 1 retry
    expect(saveInvoice).not.toHaveBeenCalled();
  });
});
