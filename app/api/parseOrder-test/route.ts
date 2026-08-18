import { parseOrder } from "@/lib/agent/parseOrder";
import type { UserContext } from "@/types";

export async function POST() {
  try {
    const account: UserContext = {
      id: 2,
      name: "Mahtab",
      role: "manager",
      accountType: "contract",
      assignedWarehouse: "Toronto",
    };

    const result = await parseOrder(
      "I need 2 mechanical keyboards and a wireless mouse",
      account
    );

    return Response.json(result);
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Parsing failed" },
      { status: 500 }
    );
  }
}
// to test this file, you should go to claudetest/page.tsx and change const response = await fetch("/api/test", {method: "POST",}); to
// "/api/parseOrder-test" and change console.log(JSON.stringify(data.results, null, 2)); to console.log(JSON.stringify(data, null, 2));
