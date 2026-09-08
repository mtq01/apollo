"use client";

/* Shared state for the activity log. The reorder page and the cart write the
   events, the site header toggles the panel, and the activity sidebar shows
   them. Context keeps these three from prop-drilling through the layout. */

import { createContext } from "react";

import { ActivityCategory, ActivityEvent } from "@/types";

type ActivityContextValue = {
  events: ActivityEvent[];
  // add one line to log
  logEvent: (message: string, category?: ActivityCategory) => void;
  // wipe the log (example... after the order is placed)
  clearLog: () => void;
  // `open` is the docked panel on wide screens. `openMobile` is the slide-in sheet on narrow screens. `toggle` flips whichever one applies.
  open: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  toggle: () => void;
};

// Default value. The real one comes from ActivityProvider.
export const ActivityContext = createContext<ActivityContextValue>({
  events: [],
  logEvent: () => {},
  clearLog: () => {},
  open: true,
  openMobile: false,
  setOpenMobile: () => {},
  toggle: () => {},
});
