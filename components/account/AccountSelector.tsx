/* [accountList] - the demo accounts.
 
 The list of accounts a user can act as.

 This app has no login or database, so the accounts are just a static file:
  - data/accounts.json (name, role, warehouse, id for each one).

 This reads that file once and exports it as `accountList`. Everywhere
 that needs the accounts. The switcher in nav-user.tsx and site-header.tsx,
 imports `accountList` from here, so the JSON is only loaded and type-labelled
 in one place.

 Note: the accounts.json contents aren't validated. If the file is malformed,
 you won't find out until it breaks at runtime.

*/

import { UserContext } from "@/types";
import rawAccounts from "../../data/accounts.json";
/* rawAccounts is a local variable name we give the data once imported 
so we can use it later (its delcared right here in the import line) */


/* Stores the JSON data from 'rawAccounts' and tells TypeScript to trust 
that it matches the UserContext[] shape (rawAccounts as UserContext) */
export const accountList: UserContext[] = rawAccounts as UserContext[];
