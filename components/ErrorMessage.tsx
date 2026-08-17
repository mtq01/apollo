// import ErrorType object (ErrorType is a Discriminated Union)
import { ErrorType } from "../types";
import { CircleAlert } from "@/components/icons";

/* 
[Documentation]
  TS Objects:             https://www.typescriptlang.org/docs/handbook/2/objects.html
  Components/Props:       https://nextjs.org/learn/react-foundations/displaying-data-with-props
  Switch Statement:       https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/switch
  Discriminated Unions:   https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions


[DisplayError Function]
  - Shows a msg to the user based on what kind of error was given.
  - It receives one prop, "error", which must match the ErrorType shape (not found, timeout, 
    restricted, invalid input). Each with its own msg
  - This component only displays errors, it does not create or catch them.


[Switch Statement]
  - error.type is the discriminant. Its the field that tells us which of the 
    4 ErrorType shapes we're holding.
  - Every variant shares the "type" field but with a different fixed value,
    which is what makes it safe to check with a switch.
  - The switch checks 'error.type' against each case, one at a time, and runs
    the matching case (first match wins, similar to if/else)
  - Each case returns its own JSX immediately.
*/

// destructures 'error' out of the props object & tells TypeScript that the props object 'error' field must be typed as ErrorType
function DisplayError({ error }: { error: ErrorType }) {
  // checks error.type against each case, and once it finds a match, and sets the message to that specific error message.
  let message: string;
  switch (error.type) {
    case "not found":
      message = error.message;
      // break just means stop, exit the switch if theres a match
      break;

    case "timeout":
      message = error.message;
      break;

    case "restricted":
      message = error.message;
      break;

    case "invalid input":
      message = error.message;
      break;

    case "request failed":
      message = error.message;
      break;

    // if no cases match, return a default error. its a safety net that shouldnt normally trigger.
    default:
      message = "An unexpected error occurred.";
  }

  return (
    <div
      role="alert"
      className="flex w-full items-center gap-3 rounded-lg bg-red-200 px-4 py-3 text-sm text-red-900"
    >
      <CircleAlert aria-hidden="true" className="size-5" />
      <p>{message}</p>
    </div>
  );
}

export default DisplayError;
