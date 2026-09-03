// reorder page
"use client";

import { useContext, useState } from "react";
import Loader from "@/components/Loader";
import EmptyState from "@/components/EmptyState";
import ErrorMessage from "@/components/ErrorMessage";
import {
  ErrorType,
  ActivityEvent,
  ForcedFailure,
  Product,
  VisibleInvoice,
} from "@/types";
import { AccountContext } from "@/components/account/AccountContext";
import DisplayActivity from "@/components/activity-log/ActivityLog";
import { buyerErrorMessage } from "@/lib/erp/errorMessages";
// shad components
import {
  TableCaption,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { AlertTriangleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type QuoteRow = {
  // fields for a normal, successfully matched product
  name: string;
  quantity: number | null;
  stock: number | "hidden" | "error" | ErrorType;
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

export default function Reorder() {
  // Create Loading State, Error State, Text State, and Results State

  //get the accountId from the context
  const { accountId } = useContext(AccountContext);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorType | null>(null);
  const [text, setText] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [forceFailure, setForceFailure] = useState<ForcedFailure | null>(null);

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap
  const quoteResults = results?.type === "quotes" ? results.quotes : [];

  const activity =
    results?.type === "invoice"
      ? results.invoice.events
      : (results?.quotes.flatMap((row) => row.events ?? []) ?? []);

  const failedRows = quoteResults.filter((row) => row.stock === "error");

  // Function to get quote from the server
  const getQuote = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        body: JSON.stringify({
          text,
          accountId,
          forceFailure: forceFailure ?? undefined,
        }),
      });

      if (!response.ok) {
        const fallback: ErrorType = {
          type: "request failed",
          message: "Couldn't get a quote. Please try again later.",
        };

        try {
          const errData = await response.json();

          setError(errData.error ? errData.error : fallback);
        } catch {
          setError(fallback);
        }

        return;
      }

      const data = await response.json();
      setResults(data);
    } catch (error) {
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
    <div className="flex flex-row items-center gap-8 text-center sm:items-start sm:text-left px-16 py-16">
      <div className="flex flex-col w-full min-w-0 items-start text-left">
        <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black mb-8">
          Reorder
        </h1>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 w-full mb-8 "
        >
          <label>
            <span className="sr-only">Paste your order</span>

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
            Get Quote
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
          <NativeSelectOption value="timeout">
            Force 'Timeout'
          </NativeSelectOption>
          <NativeSelectOption value="not found">
            Force 'Not Found'
          </NativeSelectOption>
        </NativeSelect>

        {isLoading ? (
          <div className="flex w-full flex-col items-center gap-4 py-16">
            <Loader />

            <p className="text-lg">Getting quote...</p>
          </div>
        ) : error ? (
          <ErrorMessage error={error} />
        ) : results === null ? (
          <div className=" w-xl text-center mx-auto  py-16">
            <EmptyState
              title="Paste your order to get a quote"
              message=" We'll work out what you meant and
              show you prices, stock and delivery times."
            />
          </div>
        ) : results.type === "quotes" && results.quotes.length === 0 ? (
          <EmptyState
            title="No matching products found."
            message="Try a different search or check your input."
          />
        ) : (
          <>
            {/* Alert Component */}
            {results.type === "invoice" ? (
              <div className="w-full">
                <h2 className="text-2xl font-semibold mb-4">
                  Invoice {results.invoice.id}
                </h2>

                <Table>
                  <TableCaption>Invoice Details</TableCaption>

                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {results.invoice.items.map((item) => (
                      <TableRow key={item.sku}>
                        <TableCell className="font-medium">
                          {item.sku}
                        </TableCell>

                        <TableCell>{item.quantity}</TableCell>

                        <TableCell>${item.price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-6 text-lg font-semibold">
                  Total: ${results.invoice.totalAmount.toFixed(2)}
                </div>

                <div className="mt-4">
                  <p>
                    Discount:{" "}
                    {results.invoice.discount === "hidden"
                      ? "Restricted"
                      : `$${results.invoice.discount.toFixed(2)}`}
                  </p>

                  <p>
                    Internal Cost:{" "}
                    {results.invoice.internalCost === "hidden"
                      ? "Restricted"
                      : `$${results.invoice.internalCost.toFixed(2)}`}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Alert Component */}
                {failedRows.length > 0 ? (
                  <Alert
                    variant="destructive"
                    className="max-w my-3 border-red-600 bg-red-50"
                  >
                    <AlertTriangleIcon />
                    <AlertDescription>
                      {failedRows[0].name}:{" "}
                      {failedRows[0].stockError
                        ? buyerErrorMessage(failedRows[0].stockError)
                        : "Something went wrong checking stock."}
                      {failedRows.length > 1 &&
                        ` (${failedRows.length} items affected)`}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="max-w bg-orange-200 text-black dark:border-amber-900 my-3 dark:bg-apollo-dark dark:text-apollo-light">
                    <AlertTriangleIcon />
                    <AlertDescription className="text-color-light">
                      Stock data may be a few hours old, please confirm before
                      ordering.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Table Component */}
                <Table>
                  <TableCaption>Quote Results</TableCaption>

                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Lead Time</TableHead>
                      <TableHead>Warehouse</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {results.quotes.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {row.sku ?? "—"}
                        </TableCell>

                        <TableCell>{row.name ?? row.rawText ?? "—"}</TableCell>

                        <TableCell>{row.quantity ?? "—"}</TableCell>

                        <TableCell>
                          {row.price != null ? `${row.price.toFixed(2)}` : "—"}
                        </TableCell>

                        <TableCell>
                          {row.status === "unmatched" ? (
                            <div className="text-red-900">
                              <p>{row.matchError?.message}</p>

                              {row.suggestions &&
                                row.suggestions.length > 0 && (
                                  <ul>
                                    {row.suggestions.map((match) => (
                                      <li key={match.product.sku}>
                                        {match.product.name}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                            </div>
                          ) : typeof row.stock === "number" ? (
                            <>
                              {row.stock}

                              {row.calculatedAt && (
                                <div className="text-xs text-gray-600">
                                  as of{" "}
                                  {new Date(
                                    row.calculatedAt,
                                  ).toLocaleTimeString([], {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </div>
                              )}
                            </>
                          ) : row.stock === "hidden" ? (
                            "—"
                          ) : row.stock === "error" ? (
                            <span className="text-red-900">
                              {row.stockError
                                ? buyerErrorMessage(row.stockError)
                                : "Stock check failed."}
                            </span>
                          ) : (
                            <span className="text-red-900">
                              {buyerErrorMessage(row.stock)}
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {row.leadTime != null
                            ? `${row.leadTime} ${
                                row.leadTime === 1 ? "day" : "days"
                              }`
                            : "—"}
                        </TableCell>

                        <TableCell>
                          {row.warehouse === "hidden"
                            ? "Restricted"
                            : (row.warehouse ?? "—")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </>
        )}
      </div>
      <aside className="w-md shrink-0 flex flex-col leading-10 tracking-tight text-black bg-white rounded-lg p-6">
        <h2 className="text-3xl font-semibold pb-8">Activities</h2>
        <DisplayActivity events={activity} />
      </aside>
    </div>
  );
}
