"use client";

const apiTest = () => {
  const testClaude = async () => {
    try {
      const response = await fetch("/api/test", {
        method: "POST",
      });

      /*
       * WHAT IS FETCH DOING?
       * fetch is built into javascript. you give it a url and it runs the code in our backend.
       * it then returns an object. that object is called a Response. the important part: it
       * always has the same fields (ok, status, headers, url, body...) and fetch fills them in,
       * you don't make them. that's why you can always count on res.ok, res.status, etc. being
       * there. (the variable can be named whatever you want, res / response / banana, that part
       * doesn't matter.)
       *
       * we await it because connecting to a server is never instant. await = pause here until
       * the object is ready, then keep going.
       *
       * once it comes back, res looks something like this:
       * Response {
       *   ok: true,             // true if status is 200-299 (a success code)
       *   status: 200,          // the status code (see the list below)
       *   statusText: "OK",
       *   headers: Headers,     // info about the reply
       *   url: "http://localhost:3000/api/test",
       *   body: ReadableStream  // Remember this, will get explained later.
       * }
       *
       * STATUS CODES a real response can come back with. these ONLY show up because the server
       * actually answered (fetch succeeded). they are NOT the same as a total network fail, if
       * the internet dies or the server can't be reached, fetch never gets a response at all, it
       * throws instead, there's no status, and that's caught way down in the catch. separate thing.
       *
       * (some of these are ours to choose, our backend sends specific ones on purpose, e.g.
       * we return 502 later when claude ignores the tool.)
       *
       *   200 OK                    - worked
       *   201 Created               - worked, and something new got made
       *   400 Bad Request           - we sent something malformed
       *   401 Unauthorized          - not logged in
       *   403 Forbidden             - logged in, but not allowed
       *   404 Not Found             - wrong url / the thing doesn't exist
       *   429 Too Many Requests     - rate limited
       *   500 Internal Server Error - our backend code crashed
       *   502 Bad Gateway           - bad reply from an upstream service
       *   503 Service Unavailable   - server down or too busy
       *   (2xx = worked, 4xx = our request's fault, 5xx = the server's fault)
       *
       * METHOD: everything defaults to GET. technically here we're just getting data back,
       * but this endpoint is gonna send AND receive data later, so we make it a POST.
       * the method also has to match the backend handler (export async function POST).
       */

      /*
       * now that we knows respone always returns all fields. so we have to watch out for the case the fetch has caught an error*/

      // READ THIS LAST
      if (!response.ok) {
        try {
          // if claude failed, we have specific error handling for it. in some cases, we have a custom error message, that still get returned as a json.
          // in our errors, we set a status code, which is what response.ok checks.
          // so if the status code is 300 or heigher, we want to check if the body has a specific error message.
          const errData = await response.json();
          console.error(
            errData?.error ?? `Request failed (${response.status})`,
          );
        } catch {
          // if the body does not have a did not send back a specific error message, just use the generic one from response.status
          console.error(`Request failed (${response.status})`);
        }
        return;
      }

      /*
       * WHY response.json(), AND WHY WE AWAIT IT
       *
       * fetch (the response) just ran the code and did the checks, is the status ok, did the
       * server actually answer. but it can't hand us what we actually want, and it can't tell
       * us if the body (the information we specifically sent back) is any good. fetch never checks whether the data we returned is correct.
       * that's on us, it's why we do our own error handling on the Claude call.
       *
       * the thing we actually want is the BODY, that's the real data our backend sends back
       * (Claude's answer). so once the response passed all the checks, we go grab the body.
       *
       * here's the catch: fetch does NOT wait for the body to finish loading. it returns every
       * other field on the response fully ready (ok, status, headers, url), but for the body it
       * only STARTS the download, it doesn't wait around for it. so it hands back:
       *   body: ReadableStream
       * which is just the body still loading in, which is why we have to await it.we have to wait
       * for it to finish loading before we can actually use it.
       *
       * once it is ready, response.json() reads the body and parses it as JSON, which is what we want.
       */
      const data = await response.json();

      console.log(
        //JSON.stringify(value, replacer, space)
        // null means no replacer, 2 means indent with 2 spaces
        // if we had a relaccer, we could choose what we want to show, but we want everything, so null is fine
        JSON.stringify(data.output.products, null, 2),
      );
      console.log(JSON.stringify(data.output.summary, null, 2));
    } catch (error) {
      console.error("Something went wrong:", error);
    }
  };
  return (
    <div className="flex flex-col items-start gap-6 p-16">
      <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black">
        Claude Test
      </h1>
      <button
        onClick={testClaude}
        className="rounded-lg bg-blue-500 px-4 py-2 hover:bg-blue-800"
      >
        TEST ME CHECK CONSOLE FOR RESULTS
      </button>
    </div>
  );
};

export default apiTest;
