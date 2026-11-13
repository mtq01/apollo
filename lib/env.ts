import { z } from "zod";

/* The server's environment variables, checked with Zod in one place.
   Server-only: never import this from a "use client" file.

   ANTHROPIC_API_KEY is optional on purpose. Without it the app still works for
   SKU-only input; only plain-word and PO lookups (which call Claude) are off. */
const serverEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().trim().min(1).optional().catch(undefined),
});

// True when the server has an Anthropic key, so /api/quote can call Claude.
export function hasAnthropicKey(env: Record<string, string | undefined> = process.env): boolean {
  return serverEnvSchema.parse(env).ANTHROPIC_API_KEY !== undefined;
}

// What to print at startup when the key is missing.
export const MISSING_ANTHROPIC_KEY_WARNING =
  "[apollo] ANTHROPIC_API_KEY is not set. Plain-word and PO lookups (/api/quote) are turned off; " +
  "SKU-only input still works. Add the key to .env.local and restart the server.";
