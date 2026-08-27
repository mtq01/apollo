// reorder page
"use client";

import { useContext, useState } from "react";
import Loader from "@/components/Loader";
import { CircleAlert, TriangleAlert } from "@/components/icons";
import EmptyState from "@/components/EmptyState";
import ErrorMessage from "@/components/ErrorMessage";
import { ErrorType, ActivityEvent, ForcedFailure, Product } from "@/types";
import { AccountContext } from "@/components/account/AccountContext";
import DisplayActivity from "@/components/activity-log/ActivityLog";

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

export default function Reorder() {
  // Create Loading State, Error State, Text State, and Results State

  //get the accountId from the context
  const { accountId } = useContext(AccountContext);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorType | null>(null);
  const [text, setText] = useState("");
  const [results, setResults] = useState<QuoteRow[] | null>(null);
  const [forceFailure, setForceFailure] = useState<ForcedFailure | null>(null);

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap
  const activity = results?.flatMap((row) => row.events ?? []) ?? [];

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
            <textarea
              placeholder="paste SKU's, an invoice or a list of products here"
              className="border w-full border-gray-300 p-2 min-h-37.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-grey-500"
              value={text}
              onChange={handleChange}
            />
          </label>
          <button
            type="submit"
            disabled={!text.trim() || isLoading}
            className="self-start rounded-lg bg-black px-4 py-2 text-apollo-light hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Get quote
          </button>
        </form>
        <select
          value={forceFailure ?? ""}
          onChange={(e) =>
            setForceFailure((e.target.value || null) as ForcedFailure | null)
          }
        >
          <option value="">No forced failure</option>
          <option value="timeout">Force timeout</option>
          <option value="not found">Force not found</option>
        </select>
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
        ) : results.length === 0 ? (
          <EmptyState
            title="No matching products found."
            message="Try a different search or check your input."
          />
        ) : (
          <>
            <div
              role="status"
              className="flex w-full items-center gap-3 rounded-lg bg-orange-200 px-4 py-3 text-sm text-black mb-2"
            >
              <TriangleAlert aria-hidden="true" className="size-5" />
              <p>
                Stock data may be a few hours old for SKU-4410. Confirm before
                ordering.
              </p>
            </div>
            <div className="w-full overflow-auto rounded-xl border border-zinc-200">
              <table className="w-full table-fixed text-left text-sm [&_th]:px-6 [&_th]:py-5 [&_td]:px-6 [&_td]:py-5 bg-white text-black">
                <caption className="sr-only">Quote results</caption>
                <thead>
                  <tr className="bg-apollo-dark text-apollo-light">
                    <th className="w-36">SKU</th>
                    <th>Name</th>
                    <th className="w-20">Qty</th>
                    <th className="w-28">Price</th>

                    <th className="w-44">Stock</th>
                    <th className="w-32">Lead time</th>
                    <th className="w-40">Warehouse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {results.map((row, index) => (
                    <tr key={index}>
                      <td>{row.sku ?? "—"}</td>
                      {/* Name column: show the real product name if we found one, otherwise
                      fall back to exactly what the buyer typed, otherwise a dash. */}
                      <td>{row.name ?? row.rawText ?? "—"}</td>
                      <td>{row.quantity ?? "—"}</td>
                      <td>
                        {row.price != null ? `${row.price.toFixed(2)}` : "—"}
                      </td>
                      <td>
                        {/* Stock column can be a few different things, checked in order:
                            - no match at all? show why, plus close-guess suggestions to pick from
                            - a real stock number? show it
                            - "hidden"? not allowed to see it
                            - "error"? the stock check itself failed
                            - anything else left over is a generic error */}
                        {row.status === "unmatched" ? (
                          <div className="text-red-900">
                            <p>{row.matchError?.message}</p>
                            {row.suggestions && row.suggestions.length > 0 && (
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
                                {new Date(row.calculatedAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  },
                                )}
                              </div>
                            )}
                          </>
                        ) : row.stock === "hidden" ? (
                          "—"
                        ) : row.stock === "error" ? (
                          <span className="text-red-900">
                            {row.stockError?.message ?? "Stock check failed."}
                          </span>
                        ) : (
                          <span className="text-red-900">
                            {row.stock.message}
                          </span>
                        )}
                      </td>
                      <td>
                        {row.leadTime != null
                          ? `${row.leadTime} ${row.leadTime === 1 ? "day" : "days"}`
                          : "—"}
                      </td>
                      <td>
                        {row.warehouse === "hidden"
                          ? "Restricted"
                          : (row.warehouse ?? "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
