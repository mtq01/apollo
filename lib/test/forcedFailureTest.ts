import { getERPStock } from "../erp/mockERP";

// Manually tests getERPStock's forced-failure, plus confirms normal random behavior still works when nothing is forced.
async function runForceFailureTests() {
  console.log("--- Forcing timeout ---");
  try {
    await getERPStock("timeout"); // should throw immediately, no random delay
  } catch (error) {
    console.log("Caught:", (error as Error).message);
  }

  console.log("--- Forcing not found ---");
  try {
    await getERPStock("not found"); // should throw immediately, different message than timeout
  } catch (error) {
    console.log("Caught:", (error as Error).message);
  }

  console.log("--- No forced failure (normal random behavior) ---");
  for (let i = 0; i < 5; i++) {
    try {
      const result = await getERPStock(); // no argument. random delay, 15% random chance of timeout
      console.log("Success:", result);
    } catch (error) {
      console.log("Random timeout happened:", (error as Error).message); // proves the original Day 1 behavior still works
    }
  }
}

runForceFailureTests();