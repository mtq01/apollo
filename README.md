# Apollo

Created to help buyers reorder and get accurate quotes without fighting a slow or inconsistent ERP. Under the hood, our friend Claude handles the parts that need judgment _(reading messy pasted orders, deciding when stock data is too stale to trust)_, everything else is straightforward app logic.

Most ERP systems have a few common problems: the stock numbers they show can be out of date, they give buyers generic error codes instead of an actual explanation, and they force returning buyers to browse a full catalog just to reorder something they've bought before. Apollo fixes the front end experience around those problems: accurate, account-specific quotes, easy reordering from a pasted list or an old invoice, and honest answers when something goes wrong instead of a confusing error code. Claude handles the parts that actually need judgment.

Everything else is plain, predictable code.

This project was inspired by a conversation with the owner and CEO of a B2B Ecommerce Development Agency in Kelowna, who I'd asked what he looks for when hiring a junior developer. Rather than generic advice, he described a real, recurring front-end problem:

- **Stale Data:** _A live stock check can show numbers that are hours old, so the buyer sees a number that's already wrong. Accuracy matters._
- **Account Specific Pricing/Stock:** _Pricing and stock aren't the same for everyone. They depend on the account, so the same product can show a different price or availability to different accounts._
- **Buyers don't browse, they reorder:** _Returning customers don't want to browse a catalog, they paste SKUs or rebuy from old invoices._

## What Apollo IS

 **A front-end reorder and invoice tool.** It's designed to sit in front of a company's real ERP, not replace it.

- **Built around a real ERP problem.** Stale data, pricing and stock that depend on the account, buyers who reorder from pasted SKUs or old invoices instead of browsing, and failures that make the whole product feel unreliable.

- **A UI that shows account-specific data.** Pricing and stock are shown per account, reordering works from history or a pasted list, and failures are handled honestly. Stale data gets flagged instead of hidden, and an unmatched SKU gets close-match suggestions instead of a generic error.

- **Built with one clean connection point to its data.** The app talks to its data through a single, consistent connection, sometimes called an "adapter." Right now that connection points at fake, made-up data. The rest of the app doesn't know or care that the data is fake, so that connection could later be pointed at a real ERP without changing how the rest of the app works.

## What Apollo is NOT

- **Not a standalone ERP.** It doesn't manage inventory, accounting, or company operations. It's a front end that would sit in front of one.

- **Not an eCommerce store.** There's no product browsing, cart, or checkout. Buyers paste or reorder, they don't shop.

- **Not a WordPress site or plugin.** It's a standalone Next.js app, not something installed into an existing commerce platform.

- **Not connected to any real company system.** Every account, product, and order in this project is fake, made-up data.

- **Not "AI-first."** Claude is only used for the parts that need judgment, like reading messy input, suggesting close matches, and explaining failures. Pricing, stock, and routing are handled by plain code.

## How the work is split

**Plain code handles anything with one correct answer:**

- Picking an account or role
- Looking up an exact SKU in the catalog
- Pricing and stock rules (these are fixed rules, not judgment calls)
- Rendering the activity log
- Calling the fake ERP and catching timeouts or errors

**Claude handles anything that needs judgment or deals with ambiguity:**

- Turning a messy pasted list or old invoice into clean SKU and quantity pairs
- Suggesting the closest match when a SKU doesn't match anything exactly (a typo, or a discontinued code)
- Deciding how to explain a failure to the buyer: confirm before ordering, here's older cached data, or pricing isn't available right now
- Summarizing an order in plain language before it's submitted

## How failures are handled

Instead of one generic error message, Apollo tries to give a specific, honest answer for each situation:

| Situation | What the buyer sees |
| --- | --- |
| Stock check times out, but a cached number exists | The cached number, with its timestamp, and a note to confirm before ordering |
| Stock check times out, and there's no cached number | A plain statement that stock can't be confirmed right now, with the option to submit and flag it for review |
| A SKU doesn't match anything in the catalog | The 2 to 3 closest matches, instead of a silent failure or a guess |

## The activity log

Every action in the app gets a short, timestamped, plain-language entry in an activity log

**For example:**

- Quoted SKU-2291 at $14.20, contract pricing
- Stock check timed out, showed a 4-hour-old count, flagged as stale
- Order confirmed, 3 items, 1 flagged for review

The log doubles as a record of what happened (like a receipt) and as a way to debug what the app is actually doing.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Claude API (Haiku 4.5 for most calls, Sonnet 5 for judgment-heavy reasoning... probably)
- JSON files (stand-in database, no real DB or auth for now)
- React Context (session state, for showing which account is _"logged in"_)
- Zod (validates Claude's structured JSON output)

## Getting started

```bash
npm install
npm run dev
```

You'll also need to create a `.env.local` file in the project root, with:

`ANTHROPIC_API_KEY=dont_commit_the_api_key_lol`

`.env.local` is gitignored, so it won't come down with a clone or pull, every dev makes their own.

Grab a key at [console.anthropic.com](https://console.anthropic.com/settings/keys).
