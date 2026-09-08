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

function DisplayActivity({ events }: { events: ActivityEvent[] }) {
  return (
    <>
      {[...events].reverse().map((event) => {
        const date = new Date(event.timestamp);
        return (
          // key by id so React can track each card when the list changes
          <Alert key={event.id} className="max-w-md">
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
    </>
  );
}

export default DisplayActivity;
