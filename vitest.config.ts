import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Makes the "@/..." imports work in tests, same as in the app.
  plugins: [tsconfigPaths()],
  test: {
    // Fake browser, needed for hook and component tests.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});