import { describe, expect, it } from "vitest";
import { allowedForceFailure, demoFailuresEnabled } from "@/lib/demoFailures";

describe("demoFailuresEnabled (#9)", () => {
  it("is true only for the exact string 'true'", () => {
    expect(demoFailuresEnabled("true")).toBe(true);
  });

  it("is false when unset or set to anything else", () => {
    expect(demoFailuresEnabled(undefined)).toBe(false);
    expect(demoFailuresEnabled("")).toBe(false);
    expect(demoFailuresEnabled("false")).toBe(false);
    expect(demoFailuresEnabled("1")).toBe(false);
    expect(demoFailuresEnabled("TRUE")).toBe(false);
  });
});

describe("allowedForceFailure (#9)", () => {
  it("passes the requested failure through when the flag is on", () => {
    expect(allowedForceFailure("timeout", true)).toBe("timeout");
  });

  it("drops the requested failure when the flag is off", () => {
    expect(allowedForceFailure("timeout", false)).toBeUndefined();
    expect(allowedForceFailure("not found", false)).toBeUndefined();
  });
});
