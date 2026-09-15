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

export function calculatePrice({
  account,
  product,
}: AccountProductParams): number {
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
      // buyers only see stock info for products shipping from the exact warehouse their account is assigned to. (direct match, not nearest)
      return account.assignedWarehouse === product.warehouse;

    default:
      // unrecognized role, default to hiding the data, not showing it.
      return false;
  }
}

// Decide whether an account can see which warehouse a product ships from.
export function accessWarehouse({
  account,
  product,
}: AccountProductParams): boolean {
  switch (account.role) {
    case "admin":
      return true;

    case "manager":
      // managers can only see the warehouse name if it matches their assigned warehouse
      return account.assignedWarehouse === product.warehouse;

    case "buyer":
      // same rule as managers.
      return account.assignedWarehouse === product.warehouse;

    default:
      // unrecognized role, default to hiding the data, not showing it.
      return false;
  }
}

// Same shape as CONTRACT_DISCOUNT above: named constants instead of bare
// numbers in the maths below.
const CROSS_WAREHOUSE_DELAY = 2; // extra days when the product ships from a warehouse other than the account's own
const CONTRACT_PRIORITY_DAYS = 1; // contract accounts get priority handling, shaving a day off

// Lead time depends on the account too, same as price. Reuses the same
// warehouse match that seeStock/accessWarehouse use to decide visibility.
export function calculateLeadTime({
  account,
  product,
}: AccountProductParams): number {
  let leadTime = product.leadTime;

  // Doesn't ship from the account's own warehouse, so it has to transfer
  // first. Not a distance/routing calculation, same flat equality check used
  // everywhere else in this file.
  if (account.assignedWarehouse !== product.warehouse) {
    leadTime += CROSS_WAREHOUSE_DELAY;
  }

  // Contract accounts get priority fulfillment. Floored at 1, a "0 day" or
  // negative lead time isn't a real answer.
  if (account.accountType === "contract") {
    leadTime = Math.max(1, leadTime - CONTRACT_PRIORITY_DAYS);
  }

  return leadTime;
}
