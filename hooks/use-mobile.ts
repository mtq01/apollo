import { useSyncExternalStore } from "react";

// Screen widths where the layout changes.
const MOBILE_BREAKPOINT = 768;
const LARGE_BREAKPOINT = 1024;

/* Build a subscribe function for one max-width media query. It runs the given
   callback whenever the window crosses that width. */
function subscribeToMaxWidth(maxWidth: number) {
  return (onWidthChange: () => void) => {
    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth - 1}px)`);
    mediaQuery.addEventListener("change", onWidthChange);
    return () => mediaQuery.removeEventListener("change", onWidthChange);
  };
}

const subscribeMobile = subscribeToMaxWidth(MOBILE_BREAKPOINT);
const subscribeBelowLarge = subscribeToMaxWidth(LARGE_BREAKPOINT);

/* True on phone-sized screens (below 768px). The sidebar uses this to switch
   to a slide-out drawer. useSyncExternalStore returns false during server
   render, then the real value once running in the browser. */
export function useIsMobile() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  );
}

/* True below the large breakpoint (below 1024px). The activity sidebar docks
   on large screens and turns into a slide-in sheet below that, so it needs
   its own breakpoint apart from useIsMobile. */
export function useIsBelowLg() {
  return useSyncExternalStore(
    subscribeBelowLarge,
    () => window.innerWidth < LARGE_BREAKPOINT,
    () => false,
  );
}
