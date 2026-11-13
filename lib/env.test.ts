import { describe, expect, it } from "vitest";
import { hasAnthropicKey } from "@/lib/env";

describe("hasAnthropicKey (#12)", () => {
  it("is true when a key is set", () => {
    expect(hasAnthropicKey({ ANTHROPIC_API_KEY: "sk-ant-test" })).toBe(true);
  });

  it("is false when the key is missing, empty or only spaces", () => {
    expect(hasAnthropicKey({})).toBe(false);
    expect(hasAnthropicKey({ ANTHROPIC_API_KEY: "" })).toBe(false);
    expect(hasAnthropicKey({ ANTHROPIC_API_KEY: "   " })).toBe(false);
  });
});
