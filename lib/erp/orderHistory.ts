// //This function answers what did this account order last time.
// import orderHistory from "@/data/orderHistory.json";

// type OrderItem = {
//   sku: string;
//   quantity: number;
// };

// type Order = {
//   orderId: string;
//   accountId: number;
//   date: string;
//   items: OrderItem[];
// };

// export function getLastOrder(accountId: number): Order | undefined {
//   const accountOrders = (orderHistory as Order[]).filter(
//     (order) => order.accountId === accountId
//   );

//   if (accountOrders.length === 0) {
//     return undefined;
//   }

//   return accountOrders[accountOrders.length - 1];
// }