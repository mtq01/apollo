# Apollo

**Team:** _Mike, Mahtab, Alex_

Created to help buyers reorder and get accurate quotes without fighting a slow or inconsistent ERP. Under the hood, our friend Claude handles the parts that need judgment _(reading messy pasted orders, deciding when stock data is too stale to trust)_, everything else is straightforward app logic.

This project was inspired by a conversation with a CEO in Kelowna, who I'd asked what he looks for in junior developers. Rather than generic advice, he described a real, recurring front-end problem: 

- **Stale Data:** _A live stock check can show numbers that are hours old, so the buyer sees a number that's already wrong. Accuracy matters._
- **Account Specific Pricing/Stock:** _Pricing and stock aren't the same for everyone. They depend on the account, so the same product can show a different price or availability to different accounts._
- **Buyers don't browse, they reorder:** _Returning customers dont want to browse a catalog, they paste SKUs or rebuy from old invoices._

It was especially clear that failure states matter more than happy paths. One slow or broken API call and the whole product looks unreliable to the buyer. Apollo is my attempt to actually build that problem, not just describe it.



## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Claude API (Haiku 4.5 for most calls, Sonnet 5 for judgment-heavy reasoning... probably)
- JSON files (stand-in database, no real DB or auth for now)
- React Context (session state, for showing which account is _"logged in"_)
- ZOD (validates Claudes Structured JSON output)



## Getting started
```
npm install
npm run dev
```
Requires a `.env.local` with:
```
ANTHROPIC_API_KEY=dont_commit_the_api_key_lol
```


## Project structure
```
/app
  page.tsx            → root router (redirects based on account state)
  /login/page.tsx      → account switcher
  /dashboard
    page.tsx           → main quote/reorder view
    layout.tsx          → activity log sidebar
  /api
    /lookup/route.ts
    /stock/route.ts
    /price/route.ts
    /quote/route.ts
/components            → QuoteView, ActivityLog, SkuInput, etc.
/lib
  /agent                → tool definitions, agent loop
  /erp                   → messy ERP mock, stock/price logic
/data                   → catalog.json, accounts.json, order-history.json
```



## Progress log

### June 30, 2026 — Project setup
- Complete project scaffolding.
- Connected local repo to GitHub.
- Set up `.env.local` for the Anthropic API key, .gitignored it
- Ran a ping test `/api/ping` route returning `{ status: "it works, you did it! :)" }` to verify our tech stack and routing all work together before we start bulding.
- Started `DECISIONS.md` for tracking important technical choices as we go




### What's Next
- **Track A:** _Build the mock ERP + typed catalog/account/order data_
- **Track B:** _Build out `/login` and `/dashboard` pages, wire up API routes_
- **Track C:** _Get the first working Claude API call + first tool definition (`lookup_sku`)_