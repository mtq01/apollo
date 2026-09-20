import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount anything a test rendered, so tests don't affect each other.
afterEach(() => cleanup());
/* afterEach test, remove what was rendered so tests dont affect eachother.
The react testing library cant do this itself here, bcuz Vitests global functions are off here*/
