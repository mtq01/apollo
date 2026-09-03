"use client";

import { useContext } from "react";

import DisplayActivity from "@/components/activity-log/ActivityLog";
import { ActivityContext } from "@/components/activity-log/ActivityContext";
import { useIsBelowLg } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function ActivitySidebar({
  className,
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { events, open, openMobile, setOpenMobile } = useContext(ActivityContext);
  const isBelowLg = useIsBelowLg();

  // below lg: slide-in sheet from the right, same as the left nav does on mobile
  if (isBelowLg) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="right"
          className="w-80 max-w-[85vw] gap-0 bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader>
            <SheetTitle>Activities</SheetTitle>
            <SheetDescription className="sr-only">
              Recent activity for this order
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            <DisplayActivity events={events} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // lg+: docked panel
  if (!open) return null;

  return (
    <Sidebar
      collapsible="none"
      className={cn(
        "sticky top-0 hidden h-svh w-96 border-l lg:flex",
        className,
      )}
      {...props}
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Activities</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-4">
            <DisplayActivity events={events} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
