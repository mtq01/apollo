"use client";

import { createContext } from "react";

import { ActivityEvent } from "@/types";

// shared state for the activity log. the reorder page produces the events,
// the site header toggles visibility, and the activity sidebar renders them.
// context lets all three talk without prop-drilling through the layout.
//
// `open` drives the docked panel on lg+ screens; `openMobile` drives the
// slide-in sheet below lg. `toggle` flips whichever one applies.
type ActivityContextValue = {
  events: ActivityEvent[];
  setEvents: (events: ActivityEvent[]) => void;
  open: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  toggle: () => void;
};

export const ActivityContext = createContext<ActivityContextValue>({
  events: [],
  setEvents: () => {},
  open: true,
  openMobile: false,
  setOpenMobile: () => {},
  toggle: () => {},
});
