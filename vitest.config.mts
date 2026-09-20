import { defineConfig } from "vitest/config";

export default defineConfig({
  // Makes the "@/..." imports work in tests, same as in the app.
  resolve: { tsconfigPaths: true },
  test: {
    // Fake browser, needed for hook and component tests.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});