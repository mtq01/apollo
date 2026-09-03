"use client";

import { useCallback, useState } from "react";

import { ActivityEvent } from "@/types";
import { useIsBelowLg } from "@/hooks/use-mobile";
import { ActivityContext } from "./ActivityContext";

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [open, setOpen] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);
  const isBelowLg = useIsBelowLg();

  const toggle = useCallback(
    () =>
      isBelowLg ? setOpenMobile((o) => !o) : setOpen((o) => !o),
    [isBelowLg],
  );

  return (
    <ActivityContext.Provider
      value={{ events, setEvents, open, openMobile, setOpenMobile, toggle }}
    >
      {children}
    </ActivityContext.Provider>
  );
}
