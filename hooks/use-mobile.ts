import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

const LG_BREAKPOINT = 1024

function subscribeBelowLg(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

// the activity sidebar docks on lg+ and switches to a slide-in sheet below that,
// so it needs its own breakpoint separate from useIsMobile.
export function useIsBelowLg() {
  return React.useSyncExternalStore(
    subscribeBelowLg,
    () => window.innerWidth < LG_BREAKPOINT,
    () => false,
  )
}
