"use client";
import Link from "next/link";

const apiTest = () => {
  const testClaude = async () => {
    try {
      // Ask our Next.js backend, running in Node.js, to run its code.
      const response = await fetch("/api/test", {
        method: "POST",
      });
      // Read the answer that Node.js sent back to us
      const data = await response.json();
      // If the response is not ok, log the error and return
      if (!response.ok) {
        console.error("Error from backend:", data.error);
        return;
      }
      //repsonse.ok is true if the status code is in the 200-299 range
      //the products
      console.log(
        //JSON.stringify(value, replacer, space)
        // null means no replacer, 2 means indent with 2 spaces
        // if we had a relaccer, we could choose what we want to show, but we want everything, so null is fine
        JSON.stringify(data.message.content[0].input.products, null, 2),
      );
      console.log(
        JSON.stringify(data.message.content[0].input.summary, null, 2),
      );
    } catch (error) {
      console.error("Something went wrong:", error);
    }
  };
  return (
    <>
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
          <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
            <Link className="underline hover:no-underline" href="/">
              Home
            </Link>
            <Link className="underline hover:no-underline" href="/dashboard">
              Dashboard
            </Link>

            <Link className="underline hover:no-underline" href="/reorder">
              Reorder
            </Link>

            <Link className="underline hover:no-underline" href="/login">
              Login
            </Link>
            <Link className="underline hover:no-underline" href="/claudetest">
              Claude Test
            </Link>
            <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
              Claude Test
            </h1>
            <button
              onClick={testClaude}
              className="rounded-lg bg-blue-500 px-4 py-2 hover:bg-blue-800"
            >
              TEST ME CHECK CONSOLE FOR RESULTS
            </button>
          </div>
        </main>
      </div>
    </>
  );
};

export default apiTest;
