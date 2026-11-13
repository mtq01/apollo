/* Renders a list of activity events as alert cards. It owns no data. Whoever
   uses it passes the events in. Shown inside the activity sidebar. */

import { ActivityEvent } from "@/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  AlertAction,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

/* Screen readers:
   - The list is one role="log" region, which is polite: new entries are read out
     when the reader is free, without interrupting.
   - Each card drops the Alert component's default role="alert". That role is
     assertive, so every "Price Calculated" line used to cut in on whatever the
     buyer was doing. */
function DisplayActivity({ events }: { events: ActivityEvent[] }) {
  return (
    <div role="log" aria-live="polite" aria-label="Activity log" className="flex flex-col gap-4">
      {[...events].reverse().map((event) => {
        const date = new Date(event.timestamp);
        return (
          // key by id so React can track each card when the list changes
          <Alert key={event.id} role={undefined} className="max-w-md">
            <AlertTitle className="tracking-normal font-bold text-xs">
              {date.toLocaleDateString([], {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </AlertTitle>
            <AlertDescription className="tracking-normal">
              {event.message}
            </AlertDescription>
            <AlertAction>
              <Badge variant="outline">
                {" "}
                {date.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Badge>
            </AlertAction>
          </Alert>
        );
      })}
    </div>
  );
}

export default DisplayActivity;
