"use client";

/* Holds the activity log state: the events, and whether the panel is open.
   Wrap the app in this so the header, the sidebar, and the pages share it. */

import { useCallback, useState } from "react";

import { ActivityEvent, ActivityCategory } from "@/types";
import { useIsBelowLg } from "@/hooks/use-mobile";
import { ActivityContext } from "./ActivityContext";

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [open, setOpen] = useState(true); // docked panel, wide screens
  const [openMobile, setOpenMobile] = useState(false); // slide-in sheet, narrow screens
  const isBelowLg = useIsBelowLg();

  // Flip whichever panel the current screen size uses.
  const toggle = useCallback(
    () =>
      isBelowLg
        ? setOpenMobile((isOpen) => !isOpen)
        : setOpen((isOpen) => !isOpen),
    [isBelowLg],
  );

  // Add one line to the log. The provider fills in the id and timestamp.
  const logEvent = useCallback(
    (message: string, category?: ActivityCategory) =>
      setEvents((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          message,
          timestamp: new Date().toISOString(),
          category,
        },
      ]),
    [],
  );

  // Empty the log.
  const clearLog = useCallback(() => setEvents([]), []);

  return (
    <ActivityContext.Provider
      value={{
        events,
        logEvent,
        clearLog,
        open,
        openMobile,
        setOpenMobile,
        toggle,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}
