import { promises as fs } from "fs";
import path from "path";
import { Order } from "@/types";


/* [ Documentation ] 

    - fs/promises:      https://nodejs.org/api/fs.html#promises-api
    - path.join:        https://nodejs.org/api/path.html#pathjoinpaths

*/

// builds one reliable path to our JSON fiile (so it works no matter where the server process runs from)
const filePath = path.join(process.cwd(), "data", "order-history.json");

export async function addOrder(order: Order): Promise<Order> {

  // opens the file & reads it as plain text. (await = pause here until finished)
  const raw = await fs.readFile(filePath, "utf-8");

  // turns the text into a real array or 'Order' objects we can use.
  const orders: Order[] = JSON.parse(raw);

  // adds the new order onto the end of the array, in memory (not saved yet)
  orders.push(order);

  // [fs.writeFile]: saves the text back into the file, overwrites what was there.
  // [JSON.stringify()]: turns the array back into text. The 'null, 2' part make it print nicely formatted with 2 space indents, instead of all on one line.
  await fs.writeFile(filePath, JSON.stringify(orders, null, 2));

  // hands back the order that was just added, in case whatever calls this function want to confirm it or show it on screen.
  return order;
}


// get order history function
export async function getOrderHistory(accountId: number): Promise<Order[]> {
  const raw = await fs.readFile(filePath, "utf-8");
  const orders: Order[] = JSON.parse(raw);

  return orders.filter((order) => order.accountId === accountId);
}