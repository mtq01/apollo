"use client";

/* Shared state for the activity log. The reorder page and the cart write the
   events, the site header toggles the panel, and the activity sidebar shows
   them. Context keeps these three from prop-drilling through the layout. */

import { createContext } from "react";

import { ActivityEvent } from "@/types";

type ActivityContextValue = {
  events: ActivityEvent[];
  setEvents: (events: ActivityEvent[]) => void;
  // `open` is the docked panel on wide screens. `openMobile` is the slide-in
  // sheet on narrow screens. `toggle` flips whichever one applies.
  open: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  toggle: () => void;
};

// Default value. The real one comes from ActivityProvider.
export const ActivityContext = createContext<ActivityContextValue>({
  events: [],
  setEvents: () => {},
  open: true,
  openMobile: false,
  setOpenMobile: () => {},
  toggle: () => {},
});
