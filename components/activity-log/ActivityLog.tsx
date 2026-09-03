/*
[Documentation]
    React Array map():      https://www.w3schools.com/react/react_es6_array_map.asp or https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
    React Key prop:         https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key


[Interface]
    - Holds the types expected in the activity log for id, message, and timestamp.
    - "ID" is our unique key. its required for React when rendering a list.
    - This interface defines a single ActivityEvent with an ID, message, and timestamp.

[Function]
    - DisplayActivity displays a list of activity events in our log.
    - It receives one prop, "events" which is an array of ActivityEvent and doesn't own any data itself. 
    - Whoever uses this component passes in the real (or fake/test) events.

[events.map]
    - map() runs once per event in the array, turning each one into an <li>.
    - key={activity.id} is required so React can track each list item individually without it, 
      React can't reliably tell items apart when the list changes. 
*/

import { ActivityEvent } from "@/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  AlertAction,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// ActivityEvent[] = an array where every item must match the ActivityEvent shape. (Our logData has 3 activities to log, so 3 objects to store.)
// its required bcuz events.map() only works on arrays, not single objects.
function DisplayActivity({ events }: { events: ActivityEvent[] }) {
  return (
    <>
      {events.map((activity) => {
        const date = new Date(activity.timestamp);
        return (
          <Alert key={activity.id} className="max-w-md">
            <AlertTitle className="tracking-normal font-bold text-xs">
              {date.toLocaleDateString([], {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </AlertTitle>
            <AlertDescription className="tracking-normal">
              {activity.message}
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
