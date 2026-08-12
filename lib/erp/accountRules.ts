import type { UserContext, Product } from "../../types";


/* [calculatePriceParams]: defines the TYPE (shape for our data). 

  - It says "anything of this type must be an object with an 'account' property of type 'UserContext',
  and a 'product' property of type 'Product' "
  - This is for TypeScript to check that whoever calls the function passes the right shape of data.
  - It also gives you autocomplete/error checking in the editor.

  [function calculatePrice]:

    - The function takes 1 argument (an object).
    - It uses destructuring directly in the parameter list and pulls 'account' and 'product' out in their own local variables immediately.
    - ': AccountProductParams' tells TypeScript that the incoming object must match the shape defined above.
    - ': number' says the function will return a number.

  [CONTRACT_DISCOUNT]:
    
    - Our discount multiplier. Instead of burying '0.9' later in our calculation we clearly define it with a descriptive name up front.

*/
interface AccountProductParams {
  account: UserContext;
  product: Product;
}

export function calculatePrice({ account, product }: AccountProductParams): number {
  const CONTRACT_DISCOUNT = 0.9; // contract accounts get 10% off

  if (account.accountType === "contract") {
    return product.basePrice * CONTRACT_DISCOUNT;
  }

  return product.basePrice;
}


// Decide whether an account can see a product's stock numbers at all.
export function seeStock({ account, product }: AccountProductParams): boolean {
  switch (account.role) {
    case "admin":
      return true;

    case "manager":
      return true;

    case "buyer":
      return account.warehouse === product.warehouse;

    default:
      // Unknown role. fail closed, not open.
      return false;
  }
}


// Decide whether an account can see which warehouse a product ships from.
export function accessWarehouse({ account, product }: AccountProductParams): boolean {
  switch (account.role) {
    case "admin":
      return true;

    case "manager":
      return account.warehouse === product.warehouse;

    case "buyer":
      return account.warehouse === product.warehouse;

    default:
      // Unknown role. fail closed, not open.
      return false;
  }
}



