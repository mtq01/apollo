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
  avatarUrl: string;          // the avatar associated with each account.
}

// One product from the catalog. This is static, unchanging data. Real-time info like stock comes from getERPStock instead, not from here.
export interface Product {
  sku: string;
  name: string;
  basePrice: number; // price before any account-based discount
  internalCost?: number; // what it costs us; only admins are shown this
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
export type ActivityCategory = "price" | "stock" | "error" | "access" | "order";

export interface ActivityEvent {
  id: string;
  message: string;
  timestamp: string;
  category?: ActivityCategory;
}

/* The specific failures getERPStock can be forced to throw on demand, for testing and demoing. 
Bypasses the normal random delay/chance. */
export type ForcedFailure = "timeout" | "not found";

// shape of the final result this function returns
export interface QuoteResult {
  sku: string; // product identifier
  price: number; // final price after any discount
  stock: number | "hidden" | "error"; // real stock count, or "hidden" if not allowed to see it. error = stock check failed, see 'stockError'
  stockLastUpdated: string | "hidden" | "error"; // when stock was checked, or "hidden"
  stockError?: ErrorType; // present only when: stock === "error"
  leadTime: number; // days until product ships
  warehouse: string | "hidden"; // ship-from warehouse, or "hidden"
  events: ActivityEvent[]; // log of what happened while building this quote
  calculatedAt: string; // when it was calculated
}

/* Two possible outcomes for one line item:

"matched"   - found the exact product. quote has the full price/stock info.

"unmatched" - didn't find an exact product. can ask "did you mean one of these?" instead of just saying "not found."
            - suggestions can also be empty, sometimes nothing is close enough to guess.
            - suggestions only shows up on "unmatched." if we found the product, there's nothing to guess. */
export type LineItemResult =
  | { status: "matched"; quote: QuoteResult }
  | {
      status: "unmatched";
      rawText: string;
      matchError: ErrorType;
      suggestions?: { product: Product; score: number }[];
    };

export type InvoiceField = "discount" | "internalCost";

export interface Invoice {
  id: string;
  accountId: number;
  items: {
    sku: string;
    quantity: number;
    productName: string;
    price: number;
    listPrice: number;
    internalCost: number;
  }[];
  totalAmount: number;
  discount: number;
  internalCost: number;
  restrictedFields: InvoiceField[];
  timestamp: string;
}

export interface InvoiceRequest {
  invoiceId: string;
  accountId: number;
}
// The shape of the result the user will be able to see, which hides certain fields depending on the account's role.
export interface VisibleInvoice {
  id: string;
  accountId: number;
  items: {
    sku: string;
    quantity: number;
    productName: string;
    price: number;
    listPrice: number;
    internalCost: number | "hidden";
  }[];
  totalAmount: number;
  discount: number | "hidden";
  internalCost: number | "hidden";
  timestamp: string;
  events: ActivityEvent[];
}

export interface InvoiceResponse {
  invoice: VisibleInvoice | null;
  error?: ErrorType;
}
