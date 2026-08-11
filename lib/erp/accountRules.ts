import type { UserContext, Product } from "../../types";

// 1. Calculate product price based on account type (contract accounts get 10% discount).
//Destructuring means taking values out of an object or array and putting them into variables
export function calculatePrice(
{            //start destructuring
  account,   //take account from the object
  product,   //take product from the object
}            //end destructuring
: {
  account: UserContext; //describing the input object's types
  product: Product;
}): number { //number here describes the type of value the function returns.
  if (account.accountType === "contract") {
    return product.basePrice * 0.9; // we want 10% off, so basePrice * 0.9 will return the remaning amount after discount
  } else {
    return product.basePrice;
  }
}

// 2. Decide whether an account can see a product's stock
export function seeStock({
  account,
  product,
}: {
  account: UserContext;
  product: Product;
}): boolean {
  switch (account.role) {
    case "admin":
      return true;

    case "manager":
      return true;

    case "buyer":
      return account.warehouse === product.warehouse;
  }
}

// 3. Decide whether an account can access a product's warehouse
export function accessWarehouse({
  account,
  product,
}: {
  account: UserContext;
  product: Product;
}): boolean {
  switch (account.role) {
  case "admin":
    return true;

  case "manager":
    return account.warehouse === product.warehouse;

  case "buyer":
    return account.warehouse === product.warehouse;
}}

// Combined function
export function getProductResult({
  account,
  product,
}: {
  account: UserContext;
  product: Product;
}) {
  const price = calculatePrice({
    account,
    product,
  });

  const stockVisible = seeStock({
    account,
    product,
  });

  const warehouseVisible = accessWarehouse({
    account,
    product,
  });

  return {
    sku: product.sku,
    name: product.name,
    price,
    leadTime: product.leadTime,
    warehouse: product.warehouse,
    stockVisible,
    warehouseVisible,
  };
}