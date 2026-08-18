/* [Shape of Data]:
- Interface -> Best for describing objects and u can use extend option 

 interface Person {
   name: string;
 }

 interface Employee extends Person {
   employeeId: number;
 }

 - The extends means: "Take everything from Person, and add more."

 interface Employee {
   name: string;
   employeeId: number;
 }

Type -> Can be used for objects, primitive aliases, unions, tuples

- A primitive alias gives another name to an existing type.  type Price = number; const coffee: Price = 4.99;
- A union means a value can be one of several types or values.  type Role = "buyer" | "manager";
- A tuple is like an array, but: it has a fixed length and each position has a specific type.  type ProductInfo = [string, number];
----------------------------------------------------------------------------------------------------------------------------------- */

/* The 3 possible roles an account can have. Controls what stock/warehouse
info an account is allowed to see (see seeStock, accessWarehouse). */
export type Role = "buyer" | "manager" | "admin";

// Whether an account gets the contract discount on pricing (see calculatePrice).
export type AccountType = "standard" | "contract";

// One user/account in the system. Who's using the app right now (via theaccount picker, since there's no real login).
export interface UserContext {
  id: number;
  name: string;
  role: Role;
  accountType: AccountType;
  assignedWarehouse: string; // which warehouse this account is assigned too, for shipping/inventory checks.
}

// One product from the catalog. This is static, unchanging data. Real-time info like stock comes from getERPStock instead, not from here.
export interface Product {
  sku: string;
  name: string;
  basePrice: number; // price before any account-based discount
  leadTime: number; // days until this product ships
  warehouse: string; // which warehouse this product ships from
}

/* Describes an error that already happened, with a human-readable message.
Used for general app-wide errors (not the same as ForcedFailure below, which is for 
deliberately triggering a specific failure before it happens).

This is a 'discrimiated union'.
*/
export type ErrorType =
  | {
      type: "not found";
      message: string;
    }
  | {
      type: "timeout";
      message: string;
    }
  | {
      type: "restricted";
      message: string;
    }
  | {
      type: "invalid input";
      message: string;
    }
  | {
      type: "request failed";
      message: string;
    };

/* Shared input shape for any function that needs both an account and a product 
together (calculatePrice, seeStock, accessWarehouse, getQuoteForProduct). */
export interface AccountProductParams {
  account: UserContext;
  product: Product;
}

/* used for logging a short, readable msg history of what action was taken.
[example]: the 'getQuoteForProduct' function in 'productQuote.ts' will log the product quote & time it took place. */
export interface ActivityEvent {
  id: string;
  message: string;
  timestamp: string;
}

/* The specific failures getERPStock can be forced to throw on demand, for testing and demoing. 
Bypasses the normal random delay/chance. */
export type ForcedFailure = "timeout" | "not found";

export interface Order {
  id: string;
  accountId: number;
  items: { sku: string; quantity: number }[];
  timestamp: string;
}
