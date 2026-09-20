import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount anything a test rendered, so tests don't affect each other.
afterEach(() => cleanup());
/* afterEach matters because this config doesn't turn on Vitest's global functions, 
 and RTL only cleans up on its own when those globals exist. */