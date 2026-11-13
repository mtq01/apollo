/* Next.js runs register() once when the server starts.
   https://nextjs.org/docs/app/guides/instrumentation

   We use it to check the environment up front, so a missing key shows up in the
   server log at startup, not as a vague error on the first plain-word paste. */
import { hasAnthropicKey, MISSING_ANTHROPIC_KEY_WARNING } from "@/lib/env";

export function register() {
  if (!hasAnthropicKey()) {
    console.warn(MISSING_ANTHROPIC_KEY_WARNING);
  }
}
