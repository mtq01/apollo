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


// ActivityEvent[] = an array where every item must match the ActivityEvent shape. (Our logData has 3 activities to log, so 3 objects to store.)
// its required bcuz events.map() only works on arrays, not single objects.
function DisplayActivity({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="flex flex-col gap-12">
      {/* JSX elements directly inside a map() call ALWAYS need keys!!! */}
      {events.map((activity) => (
        <li key={activity.id}>
          <p className="font-semibold text-lg">{activity.message}</p>
          <p className="text-sm text-gray-800">
            {new Date(activity.timestamp).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </li>
      ))}
    </ol>
  );
}

export default DisplayActivity;
