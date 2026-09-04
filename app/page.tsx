/* The reorder page (the home route "/").

  One text box. The buyer pastes SKUs, a product list, or a PO number. A plain
  SKU list is priced straight from the catalog; anything with real words goes
  through Claude. Whatever comes back is folded into the cart (DraftOrder).
  Rows we can't add are listed at the bottom with "did you mean" suggestions. */
"use client";

import { useContext, useState } from "react";
import { toast } from "sonner";
import ErrorMessage from "@/components/ErrorMessage";
import { buyerErrorMessage } from "@/lib/erp/errorMessages";
import { ErrorType, ActivityEvent, ForcedFailure, Product } from "@/types";
import { AccountContext } from "@/components/account/AccountContext";
import { ActivityContext } from "@/components/activity-log/ActivityContext";
import {
  DraftOrderContext,
  type DraftLine,
} from "@/components/draft-order/DraftOrderContext";
import { DraftOrder } from "@/components/draft-order/DraftOrder";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/* One row from either quote endpoint. Everything is optional because a row is
   one of three things: a priced match, an ERP miss (an error, no price), or a
   catalog miss (rawText plus "did you mean" suggestions). */
type QuoteRow = {
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

  status?: "unmatched"; // set only on a catalog miss
  rawText?: string; // the buyer's own words, since we have no product name
  matchError?: ErrorType; // why it did not match, in plain English
  suggestions?: { product: Product; score: number }[]; // close guesses to pick from
};

/* Matches a chunk that is only a product code, with an optional quantity:
   "PER-2284", "PER-2284 x2", "2 PER-2284". inv-, order-, and po- are excluded
   so a PO lookup still goes through Claude. */
const SKU_TOKEN =
  /^(?:(\d+)\s*[x×*]?\s+)?((?!inv-|order-|po-)[a-z]{2,4}-\d{3,6})(?:\s+[x×*]?\s*(\d+))?$/i;

/* If the text is nothing but product codes, return them as a {sku, quantity}
   list so we can skip Claude. Returns null the moment a chunk has real words. */
function parseSkuList(
  text: string,
): { sku: string; quantity: number }[] | null {
  const chunks = text
    .split(/[\n,;]+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (chunks.length === 0) return null;

  const items: { sku: string; quantity: number }[] = [];
  for (const chunk of chunks) {
    const match = chunk.match(SKU_TOKEN);
    if (!match) return null;
    // group 1 is a quantity before the code, group 3 is one after it
    const quantity = match[1]
      ? parseInt(match[1], 10)
      : match[3]
        ? parseInt(match[3], 10)
        : 1;
    items.push({
      sku: match[2].toUpperCase(),
      quantity: quantity > 0 ? quantity : 1,
    });
  }
  return items;
}

// Turns a count into "1 item" or "3 items" for the toast message.
function itemCountLabel(count: number) {
  if (count === 1) return "1 item";
  return `${count} items`;
}

export default function Reorder() {
  const { accountId } = useContext(AccountContext);
  const { addLines } = useContext(DraftOrderContext);
  const { logEvent } = useContext(ActivityContext);

  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorType | null>(null);
  const [text, setText] = useState("");
  // rows we could not add to the cart (a catalog miss or an ERP miss)
  const [unmatched, setUnmatched] = useState<QuoteRow[]>([]);
  const [forceFailure, setForceFailure] = useState<ForcedFailure | null>(null);

  // Look up whatever is in the text box and fold the result into the cart.
  const getQuote = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // A plain SKU list skips Claude and hits the catalog directly.
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
        const failure: ErrorType = data?.error ?? {
          type: "request failed",
          message: "Couldn't get a quote. Please try again later.",
        };
        setError(failure);
        logEvent(failure.message, "error");
        return;
      }

      // A PO / invoice lookup: put its line items straight into the cart, just
      // like reordering a past order. No card.
      if (data?.type === "invoice") {
        const invoiceId: string = data.invoice?.id ?? "that PO";
        const invoiceItems = data.invoice?.items ?? [];
        if (invoiceItems.length > 0) {
          addLines(
            invoiceItems.map(
              (item: {
                sku: string;
                productName: string;
                quantity: number;
              }): DraftLine => ({
                sku: item.sku,
                productName: item.productName,
                quantity: item.quantity,
                source: "past-order",
                sourceRef: invoiceId,
              }),
            ),
          );
          toast.success(
            `Added ${itemCountLabel(invoiceItems.length)} from ${invoiceId}`,
          );
        }
        setUnmatched([]);
        setText("");
        return;
      }

      // A normal quote. Priced matches go into the cart; anything else is
      // listed below so the buyer can pick a suggestion.
      const rows: QuoteRow[] = data?.quotes ?? [];
      const matched = rows.filter(
        (row) =>
          row.status !== "unmatched" &&
          row.sku &&
          row.name &&
          typeof row.price === "number",
      );
      const leftover = rows.filter((row) => !matched.includes(row));

      // Nothing to add and nothing to fix. The text was not an order.
      if (matched.length === 0 && leftover.length === 0) {
        const message =
          "That doesn't look like an order. Paste SKUs, a product list, or a PO number.";
        setError({ type: "invalid input", message });
        logEvent(message, "error");
        setUnmatched([]);
        setText("");
        return;
      }

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

      if (leftover.length > 0) {
        const word = leftover.length === 1 ? "item" : "items";
        logEvent(
          `${leftover.length} ${word} could not be added to the cart`,
          "error",
        );
      }

      setUnmatched(leftover);
      setText("");
    } catch {
      setError({
        type: "request failed",
        message: "Couldn't reach the server. Check your connection.",
      });
      logEvent("Could not reach the server", "error");
    } finally {
      setLoading(false);
    }
  };

  // Keep the text box value in state as the buyer types.
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
  };

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    getQuote();
  };

  // Enter submits; Shift+Enter adds a newline.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
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
            Paste a previous PO number, SKU numbers, or a list of products you
            are looking for.
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
          Add Products
        </Button>
      </form>

      {/* Demo dropdown: force the next ERP call to time out or 404. */}
      <NativeSelect
        value={forceFailure ?? ""}
        onChange={(event) =>
          setForceFailure((event.target.value || null) as ForcedFailure | null)
        }
      >
        <NativeSelectOption value="">Select Force Failure</NativeSelectOption>
        <NativeSelectOption value="timeout">
          {"Force 'Timeout'"}
        </NativeSelectOption>
        <NativeSelectOption value="not found">
          {"Force 'Not Found'"}
        </NativeSelectOption>
      </NativeSelect>

      {error && <ErrorMessage error={error} />}

      {/* Rows that could not go into the cart. Each shows why, plus any
          "did you mean" products the buyer can add instead. */}
      {unmatched.length > 0 && (
        <div className="mb-8 w-full max-w-2xl">
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Couldn't add these
          </h3>
          <ul className="flex flex-col gap-3">
            {unmatched.map((row, index) => (
              <li key={index} className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm font-medium">
                  {row.rawText ?? row.name ?? "Unknown item"}
                </p>
                <p className="text-sm text-gray-600">
                  {row.matchError
                    ? row.matchError.message
                    : row.stockError
                      ? buyerErrorMessage(row.stockError)
                      : "No match in the catalog."}
                </p>
                {row.suggestions && row.suggestions.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {row.suggestions.map((suggestion) => (
                      <li key={suggestion.product.sku}>
                        <button
                          onClick={() => {
                            addLines([
                              {
                                sku: suggestion.product.sku,
                                productName: suggestion.product.name,
                                quantity: row.quantity ?? 1,
                                source: "suggestion",
                              },
                            ]);
                            // this row is handled now, so drop it from the list
                            setUnmatched((current) =>
                              current.filter((other) => other !== row),
                            );
                          }}
                          className="text-left text-sm underline hover:no-underline"
                        >
                          Add {suggestion.product.name} (
                          {suggestion.product.sku})
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

      {/* DraftOrder Table Output: */}
      <DraftOrder forceFailure={forceFailure} isLoading={isLoading}/>
    </div>
  );
}
