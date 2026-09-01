// import ErrorType object (ErrorType is a Discriminated Union)
import { ErrorType } from "../types";
import { CircleAlert } from "@/components/icons";
import { buyerErrorMessage } from "@/lib/erp/errorMessages";

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

*/

// destructures 'error' out of the props object & tells TypeScript that the props object 'error' field must be typed as ErrorType
function DisplayError({ error }: { error: ErrorType }) {
  
const message = buyerErrorMessage(error);

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
