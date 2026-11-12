# Apollo

An AI ordering agent for B2B buyers, with a swappable, adapter-pattern backend, currently running against a mock ERP.

Buyers paste a messy list or an old PO number and get an account-specific quote they can turn into an order. Pricing, stock and visibility rules are plain code. Claude is used only where judgment is needed.

**Live demo:** [apollo-demo.gogogravity.com](https://apollo-demo.gogogravity.com)

> Every account, product, order and invoice is made up, and the ERP is a mock.

## Features

- **One box to reorder.** Paste SKUs (`PER-2284, ACC-3391`), SKUs with quantities (`PER-2284 x2`), plain words, or a PO number (`inv-1001`).
- **Skips the AI when it can.** A list of product codes is priced straight from the catalog. Only text with real words goes to Claude.
- **Account-specific quotes.** Price, discount, lead time, stock and warehouse visibility all depend on the account and its role.
- **Editable cart.** Change quantities, remove lines, and keep adding. The cart re-prices after every change and shows Sub Total, Discount, Tax and Total.
- **"Did you mean" suggestions.** An item that matches nothing shows the closest catalog products instead of disappearing.
- **Orders page.** Browse past orders and add selected lines back into the cart.
- **Honest failures.** Stock timeouts, unknown products and stale stock are each explained in plain language, and an order can't be placed until every line has confirmed stock.
- **Activity log.** A timestamped side panel records each price, stock check and failure.

### How failures are handled

| Situation | What the buyer sees |
| --- | --- |
| Stock check times out | A plain message that stock can't be confirmed yet. The cart rechecks on its next update. |
| Stock data is stale | The number with its timestamp, and a reminder to confirm before ordering |
| A product matches nothing | Up to three of the closest catalog matches |
| Any line has a failed stock check | "Place order" is disabled, and the server re-checks stock before saving |

## Demo accounts

There is no login. Pick an account from the header.

| Account | Role | Type | Sees |
| --- | --- | --- | --- |
| Alex | Admin (supplier staff) | Standard | Internal cost and every account's orders |
| Mahtab | Manager | Contract (10% off) | Own pricing, stock and orders |
| Mike | Buyer | Standard | Own pricing and orders. Stock only for products from their warehouse. |

The quick-action buttons on the Reorder page fill the text box with sample inputs.

## Tech stack

Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, shadcn/ui, Zod, the Claude API (Haiku 4.5 with tool use), Vitest and Playwright.

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com/settings/keys)). It's only needed for plain-word and PO lookups. SKU-only input works without it.

### Install and run

```bash
git clone https://github.com/mtq01/apollo.git
cd apollo
npm install
echo "ANTHROPIC_API_KEY=your_key_here" > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npx playwright test` | Run end-to-end tests (Playwright) |

## Project structure

```text
app/
  page.tsx            Reorder page
  orders/             Orders page
  api/quote/          Price pasted text (via Claude) or a list of SKUs
  api/orders/         List past orders, place a new order
components/           UI, plus the account, cart and activity-log providers
lib/
  erp/                Plain-code rules: pricing, stock, visibility, invoices, the mock ERP
  agent/              Claude calls: order parsing, suggestions
  tools/              Claude tool definitions
data/                 Mock data: accounts, catalog, invoices (JSON)
types.ts              Shared types
tests/                Playwright end-to-end tests
```

## How it works

```text
Pasted text ──► only SKUs? ──yes──► priceItems ──► cart
                    │                   ▲
                    no                  │
                    ▼                   │
                 Claude ── Zod check ───┘
            (SKU and quantity guesses,
             or an invoice id)
```

- **Plain code** handles anything with one right answer: account rules, SKU lookup, pricing, tax, stock rules, lead time, and calling the ERP with retries and timeouts.
- **Claude** handles ambiguity: turning a messy list into SKU and quantity guesses, and picking which invoice the buyer means. Its output is checked with Zod, it runs at `temperature: 0`, and it is limited to five tool-call rounds. Every SKU it returns is checked against the catalog.
- **One adapter.** All data goes through `lib/erp/` over JSON files. The rest of the app doesn't know the data is fake, so it could point at a real ERP later.

## Known limitations

- **No real login.** The account picker stands in for authentication.
- **No database.** Data is JSON files with no locking, so two orders saved at the same instant could collide.
- **No stock reservation.** Placing an order doesn't reduce stock.
- **Simple pricing.** A flat contract discount only, with no volume tiers or negotiated rates. Prices are plain JavaScript numbers, not integer cents.
- **In-memory cart.** The cart is lost on refresh.
- **Parsing quirks.** A trailing quantity (`"mouse 2"`) can be read as a model number, and Claude can silently correct a typo without the row showing it.
- **Limited test coverage.** There is one unit test (fuzzy matching), and the Playwright specs currently run against the live demo rather than a local server. Claude parsing is checked by hand.
- **No assisted ordering.** An admin can't place an order on behalf of a customer. It's saved under the admin's own account.

## Contributing

- Branch from `staging` and open pull requests into `staging`. `main` is the released version.
- Run `npm run lint` and `npm test` before opening a PR.
- Record judgment calls and open TODOs in [DECISIONS.md](DECISIONS.md).

## Credits

Built by [Alex Monro](https://github.com/alex-monro), [Mahtab Salimzadeh](https://github.com/mahtabsz-devdes) and [Mike](https://github.com/mtq01) as part of the BCIT program.

The story behind the project and the lessons from building it are in [docs/RETROSPECTIVE.md](docs/RETROSPECTIVE.md).
