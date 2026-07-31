/* PING TEST: checking if router works...
 - terminal: npm run dev
 - open the localhost link in browser and this at the end:  /api/ping
 - if you see the status msg, the router works.*/
export async function GET() {
  return Response.json({ status: "it works, you did it! :)" });
}