//shape of data:
//Interface->Best for describing objects and u can use extend option 

// interface Person {
//   name: string;
// }

// interface Employee extends Person {
//   employeeId: number;
// }

// The extends means: "Take everything from Person, and add more."

// interface Employee {
//   name: string;
//   employeeId: number;
// }

//Type->Can be used for objects, primitive aliases, unions, tuples

//A primitive alias gives another name to an existing type.  type Price = number; const coffee: Price = 4.99;
//A union means a value can be one of several types or values.  type Role = "buyer" | "manager";
//A tuple is like an array, but: it has a fixed length and each position has a specific type.  type ProductInfo = [string, number];

// User roles
export type Role = "buyer" | "manager" | "admin";

// Account types
export type AccountType = "standard" | "contract";

// User context
export interface UserContext {
  id: number;
  name: string;
  role: Role;
  accountType: AccountType;
  warehouse: string;
}

// Product information
export interface Product {
  sku: string;
  name: string;
  basePrice: number;
  leadTime: number;
  stock: number,
  warehouse: string;
}

// Error types
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
    };

export type ERPStockResponse = {
  stock: number;
  lastUpdated: string;
};


export interface AccountProductParams {
  account: UserContext;
  product: Product;
}


export interface ActivityEvent {
  id: string;
  message: string;
  timestamp: string;
}