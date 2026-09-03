// reorder page
"use client";

import { useContext, useEffect, useState } from "react";
import Loader from "@/components/Loader";
import ErrorMessage from "@/components/ErrorMessage";
import {
  ErrorType,
  ActivityEvent,
  ForcedFailure,
  Product,
  VisibleInvoice,
} from "@/types";
import { AccountContext } from "@/components/account/AccountContext";
import { ActivityContext } from "@/components/activity-log/ActivityContext";
import {
  DraftOrderContext,
  type DraftLine,
} from "@/components/draft-order/DraftOrderContext";
import { DraftOrder } from "@/components/draft-order/DraftOrder";
// shad components
import {
  TableCaption,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
} from "@/components/ui/table";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
// card import
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type QuoteRow = {
  // fields for a normal, successfully matched product
  name?: string;
  quantity: number | null;
  stock?: number | "hidden" | "error" | ErrorType;
  stockError?: ErrorType;
  sku?: string;
  price?: number;
  leadTime?: number;
  warehouse?: string;
  calculatedAt?: string;
  events?: ActivityEvent[];

  // fields for a row where we couldnt find a matching product:
  status?: "unmatched"; // set only when nothing matched, tells the page which version of the row to show
  rawText?: string; // what the buyer actually typed, since we dont have a real product name
  matchError?: ErrorType; // why it didnt match, plain english
  suggestions?: { product: Product; score: number }[]; // cloe-guess products, so the buyer can pick one instead of a dead end
};

type QuoteResults = {
  type: "quotes";
  quotes: QuoteRow[];
};

type InvoiceResults = {
  type: "invoice";
  invoice: VisibleInvoice;
};

type Results = QuoteResults | InvoiceResults;

// a chunk that is just a product code, optionally with a quantity:
// "PER-2284", "PER-2284 x2", "2 PER-2284". inv-/order-/po- are excluded so a
// PO lookup still goes through Claude.
const SKU_TOKEN =
  /^(?:(\d+)\s*[x×*]?\s+)?((?!inv-|order-|po-)[a-z]{2,4}-\d{3,6})(?:\s+[x×*]?\s*(\d+))?$/i;

/* Returns a {sku, quantity} list when the whole text is nothing but product
   codes, so we can skip Claude and hit /api/quote/items directly. Returns null
   for anything with real words in it (that still needs parsing). */
function parseSkuList(
  text: string,
): { sku: string; quantity: number }[] | null {
  const chunks = text
    .split(/[\n,;]+/)
    .map((c) => c.trim())
    .filter(Boolean);
  if (chunks.length === 0) return null;

  const items: { sku: string; quantity: number }[] = [];
  for (const chunk of chunks) {
    const m = chunk.match(SKU_TOKEN);
    if (!m) return null;
    const qty = m[1] ? parseInt(m[1], 10) : m[3] ? parseInt(m[3], 10) : 1;
    items.push({ sku: m[2].toUpperCase(), quantity: qty > 0 ? qty : 1 });
  }
  return items;
}

// convert date/time to simple format
function formatInvoiceDate(timestamp: string) {
  const date = new Date(timestamp);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
  });
  return `${dateStr} at ${timeStr}`;
}

export default function Reorder() {
  // Create Loading State, Error State, Text State, and Results State

  //get the accountId from the context
  const { accountId } = useContext(AccountContext);
  const { setEvents } = useContext(ActivityContext);
  const { addLines } = useContext(DraftOrderContext);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorType | null>(null);
  const [text, setText] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  // rows we couldn't add straight to the draft (catalog miss or ERP miss)
  const [unmatched, setUnmatched] = useState<QuoteRow[]>([]);
  const [forceFailure, setForceFailure] = useState<ForcedFailure | null>(null);

  // an invoice lookup shows its own activity; the draft handles its own.
  useEffect(() => {
    if (results?.type === "invoice") setEvents(results.invoice.events);
  }, [results, setEvents]);

  // invoice tax calculation
  const subtotal =
    results?.type === "invoice"
      ? results.invoice.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        )
      : 0;

  const discountAmount =
    results?.type === "invoice"
      ? results.invoice.discount === "hidden"
        ? 0
        : results.invoice.discount
      : 0;

  const tax = (subtotal - discountAmount) * 0.07;
  const total = subtotal - discountAmount + tax;

  // Look up whatever was pasted and fold the result into the draft order.
  const getQuote = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // a plain SKU list skips Claude and goes straight to the catalog
      const skuItems = parseSkuList(text);
      const endpoint = skuItems ? "/api/quote/items" : "/api/quote";
      const body = skuItems
        ? {
            accountId,
            items: skuItems,
            forceFailure: forceFailure ?? undefined,
          }
        : { text, accountId, forceFailure: forceFailure ?? undefined };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          data?.error ?? {
            type: "request failed",
            message: "Couldn't get a quote. Please try again later.",
          },
        );
        return;
      }

      if (data?.type === "invoice") {
        setResults(data);
        return;
      }

      // priced matches go into the draft; the rest are shown below so the
      // buyer can pick a suggestion.
      const rows: QuoteRow[] = data?.quotes ?? [];
      const matched = rows.filter(
        (row) =>
          row.status !== "unmatched" &&
          row.sku &&
          row.name &&
          typeof row.price === "number",
      );
      const leftover = rows.filter((row) => !matched.includes(row));

      if (matched.length > 0) {
        const source: DraftLine["source"] = skuItems ? "manual-sku" : "paste";
        addLines(
          matched.map(
            (row): DraftLine => ({
              sku: row.sku as string,
              productName: row.name as string,
              quantity: row.quantity ?? 1,
              source,
            }),
          ),
        );
      }

      setUnmatched(leftover);
      setResults(null);
      setText("");
    } catch {
      setError({
        type: "request failed",
        message: "Couldn't reach the server. Check your connection.",
      });
    } finally {
      setLoading(false);
    }
  };
  /* Say you type "SKU".
    You press S:
  
    function runs, e.target.value is "S"
    You press K:

    function runs, e.target.value is "SK"
    setText("SK")
     You press U:

     function runs, e.target.value is "SKU"
    setText("SKU") */

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    getQuote();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      if (!text.trim() || isLoading) return;

      getQuote();
    }
  };

  return (
    <div className="flex flex-col w-full min-w-0 items-start text-left px-16 py-16">
      <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black mb-8">
        Reorder
      </h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full mb-8 "
      >
        <label>
          <span className="sr-only">
            Paste a previous PO#, SKU numbers, or a list of products that you're
            looking for.
          </span>

          <Textarea
            placeholder="paste SKU's, an invoice or a list of products here"
            className="border w-full border-gray-300 p-2 min-h-37.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-grey-500"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </label>

        <Button
          type="submit"
          disabled={!text.trim() || isLoading}
          className="self-start font-bold rounded-lg bg-black px-4 py-2 text-apollo-light hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Lookup Products
        </Button>
      </form>

      {/* Select Component - Force Failure Options */}
      <NativeSelect
        value={forceFailure ?? ""}
        onChange={(e) =>
          setForceFailure((e.target.value || null) as ForcedFailure | null)
        }
      >
        <NativeSelectOption value="">Select Force Failure</NativeSelectOption>
        <NativeSelectOption value="timeout">Force 'Timeout'</NativeSelectOption>
        <NativeSelectOption value="not found">
          Force 'Not Found'
        </NativeSelectOption>
      </NativeSelect>

      <DraftOrder />

      {isLoading && (
        <div className="flex w-full flex-col items-center gap-4 py-16">
          <Loader />

          <p className="text-lg">Getting quote...</p>
        </div>
      )}

      {error && <ErrorMessage error={error} />}

      {unmatched.length > 0 && (
        <div className="mb-8 w-full max-w-2xl">
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Couldn&apos;t add these
          </h3>
          <ul className="flex flex-col gap-3">
            {unmatched.map((row, i) => (
              <li key={i} className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm font-medium">
                  {row.rawText ?? row.name ?? "Unknown item"}
                </p>
                <p className="text-sm text-gray-600">
                  {row.matchError?.message ??
                    row.stockError?.message ??
                    "No match in the catalog."}
                </p>
                {row.suggestions && row.suggestions.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {row.suggestions.map((s) => (
                      <li key={s.product.sku}>
                        <button
                          onClick={() => {
                            addLines([
                              {
                                sku: s.product.sku,
                                productName: s.product.name,
                                quantity: row.quantity ?? 1,
                                source: "suggestion",
                              },
                            ]);
                            setUnmatched((u) => u.filter((x) => x !== row));
                          }}
                          className="text-left text-sm underline hover:no-underline"
                        >
                          Add {s.product.name} ({s.product.sku})
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {results?.type === "invoice" && (
        <div className="w-full">
          {/* Invoice Card ++++++++++++++++++++ */}
          <Card className="relative mx-auto w-full max-w-sm">
            <CardHeader>
              <CardAction>
                <Badge variant="secondary">Paid</Badge>
              </CardAction>
              <CardTitle>Purchase Order: {results.invoice.id}</CardTitle>
              <CardDescription> Submitted: {formatInvoiceDate(results.invoice.timestamp)}</CardDescription>
            </CardHeader>

            <Table>
              <TableCaption>
               Order History
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-25">SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.invoice.items.map((item) => (
                  <TableRow key={item.sku}>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">{item.price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Sub Total</TableCell>
                  <TableCell className="text-right">
                    ${subtotal.toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3}>Discount</TableCell>
                  <TableCell className="text-right">
                    {results.invoice.discount === "hidden"
                      ? "Restricted"
                      : `$${results.invoice.discount.toFixed(2)}`}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3}>Tax</TableCell>
                  <TableCell className="text-right">
                    ${tax.toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">
                    ${total.toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3}>Line Price</TableCell>
                  <TableCell className="text-right">
                    {results.invoice.internalCost === "hidden"
                      ? "Restricted"
                      : `$${results.invoice.internalCost.toFixed(2)}`}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
