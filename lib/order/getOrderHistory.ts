import { promises as fs } from "fs";
import path from "path";
import { Order } from "@/types";

export async function getOrderHistory(accountId: number): Promise<Order[]> {
    const raw = await fs.readFile(filePath, "utf-8");
    const orders: Order[] = JSON.parse(raw);

    return orders.filter((order) => order.accountId === accountId);
}