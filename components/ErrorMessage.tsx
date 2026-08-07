// import ErrorType object (ErrorType is a Discriminated Union)
import { ErrorType } from "../types";

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
  // checks error.type against each case, and once it finds a match, returns that cases message as JSX.
  switch (error.type) {
    case "not found":
      return <h1>{error.message}</h1>;

    case "timeout":
      return <h1>{error.message}</h1>;

    case "restricted":
      return <h1>{error.message}</h1>;

    case "invalid input":
      return <h1>{error.message}</h1>;

    // if no cases match, return a default error. its a safety net that shouldnt normally trigger.
    default:
      return <h1>An unexpected error occured.</h1>;
  }
}

export default DisplayError;
