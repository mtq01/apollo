import type { ForcedFailure } from "@/types";

/* The demo "force failure" controls are off unless this is set to "true".

   One variable for both sides: the page reads it to show or hide the dropdown,
   and the quote routes read it to decide whether to honour `forceFailure`.
   The NEXT_PUBLIC_ prefix is what lets the page see it. Next inlines it at
   build time, so changing it on a hosted deploy needs a rebuild. */
export function demoFailuresEnabled(
  value: string | undefined = process.env.NEXT_PUBLIC_ENABLE_DEMO_FAILURES,
): boolean {
  return value === "true";
}

/* What a quote route should pass on to the ERP. With the flag off, any
   forceFailure a caller sends is ignored, so nobody can break the live demo. */
export function allowedForceFailure(
  requested: ForcedFailure | undefined,
  enabled: boolean = demoFailuresEnabled(),
): ForcedFailure | undefined {
  return enabled ? requested : undefined;
}
