import { describe, expect, it } from "vitest";
import { ERPError } from "@/lib/erp/mockERP";
import { mapStockErrorToReason } from "@/lib/erp/productQuote";

describe("mapStockErrorToReason (#8)", () => {
  it("uses the ERP error's code", () => {
    expect(mapStockErrorToReason(new ERPError("timeout", "ERP request timed out"))).toEqual({
      type: "timeout",
      message: "ERP request timed out",
    });
    expect(mapStockErrorToReason(new ERPError("not found", "Product not found in ERP system."))).toEqual({
      type: "not found",
      message: "Product not found in ERP system.",
    });
  });

  it("doesn't depend on the wording: a reworded timeout is still a timeout", () => {
    expect(mapStockErrorToReason(new ERPError("timeout", "Upstream did not answer")).type).toBe("timeout");
  });

  it("doesn't guess from wording either: a plain error that says 'timed out' is not a timeout", () => {
    expect(mapStockErrorToReason(new Error("socket timed out")).type).toBe("request failed");
  });

  it("treats anything unexpected as 'request failed', not the buyer's fault", () => {
    expect(mapStockErrorToReason("something odd")).toEqual({
      type: "request failed",
      message: "Unknown stock check error",
    });
  });
});
