"use client";
/* runs in the browser, not the server (required for useState and useChange */

import { UserContext } from "@/types";
// rawAccounts is a local variable name we give the data once imported so we can use it later (its delcared right here in the import line)
import rawAccounts from "../../data/accounts.json";
import { useState } from "react";

/*
[Documentation]
    useState hook:              https://react.dev/learn/state-a-components-memory
    Handling events (onChange): https://react.dev/learn/responding-to-events
    Type assertions (as):       https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions
    Optional chaining (?.):     https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining


accountList]
    - rawAccounts is the raw JSON data from the import above. TypeScript can't
      verify its shape since JSON files have no types.
    - "as UserContext[]" is a type assertion. It doesn't check anything, it just
      tells TypeScript to trust the shape. Bad data won't be caught until runtime.
    - accountList is the typed, exported version. Other files (like the login page)
      can import it directly instead of casting the raw JSON themselves.

[SelectAccount Function]
    - Renders a dropdown of accounts and tracks which one is selected.
    - Takes "accounts" as a prop. Doesn't own any data, the caller decides what to show.

[selectedAccount state]
    - Stores the id of the currently picked account.
    - Starts as null, since nothing is selected yet.
    - setSelectedAccount updates it.

[onChange]
    - Runs when the user picks a different option.
    - event.target.value is always a string, so Number(...) converts it to match
      our state's type (ids are numbers).

[accounts.map]
    - Turns each account into an <option>.
    - value={user.id} is what onChange reads, separate from the displayed text.
    - key={user.id} is required for React to track each option.
*/

// Stores the JSON data from 'rawAccounts' and tells TypeScript to trust that it matches the UserContext[] shape (rawAccounts as UserContext)
export const accountList: UserContext[] = rawAccounts as UserContext[];


// on the dashboard page, we pass 'accountList' in as the 'accounts' prop, which gives this component the data to work with
function SelectAccount({ accounts }: { accounts: UserContext[] }) {

  // currently selected accound ID. Can be a number or null, starts as null.
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);

  return (
    <>
      <label htmlFor="account-select">Choose Your Account:</label>
      <select
        className="bg-amber-50 text-black"
        name="account"
        id="account-select"
        // updates state with the selected ID (converted to a number)
        onChange={(event) => setSelectedAccount(Number(event.target.value))}
      >
        {/* default option, what you see before choosing */}
        <option value="">Select</option>

        {/* renders one <option> per account. a KEY is required for list rendering */}
        {accounts.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} - {user.role} ({user.warehouse})
          </option>
        ))}
      </select>

      {/* temporary test line, delete once confirming it works */}
      <p>
        Selected Account Test: ({selectedAccount}){" "}
        {accounts.find((a) => a.id === selectedAccount)?.name}
      </p>
    </>
  );
}

export default SelectAccount;
