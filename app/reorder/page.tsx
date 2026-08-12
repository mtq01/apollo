// reorder page
"use client";

import { useState } from "react";

type QuoteRow = {
  sku: string;
  name: string;
  qty: number;
  price: number;
  stock: string | number;
  leadTime: number;
  warehouse: string;
};
// I Created new fake results because the ones in the json didnt have stock

const fakeActivity = [
  {
    id: "1",
    title: "Order Placed",
    user: "Mike T",
    po: "123456789",
    time: "2:04pm",
    date: "08/03/26",
  },
  {
    id: "2",
    title: "Quoted SKU-441 at $14.26",
    user: "Mike T",
    po: "123456789",
    time: "2:04pm",
    date: "08/03/26",
  },
  {
    id: "3",
    title: "Stock check time out for SKU 44-10, showed cache count",
    user: "Mike T",
    po: "123456789",
    time: "2:04pm",
    date: "08/03/26",
  },
];

export default function Reorder() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<QuoteRow[]>([]);

  const getQuote = async () => {
    try {
      const response = await fetch("/api/quote", { method: "POST" });

      if (!response.ok) {
        console.error(`Request failed (${response.status})`);
        return;
      }

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Something went wrong:", error);
    }
  };

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
              className="border w-full border-gray-300 p-2 min-h-[150px] rounded-xl focus:outline-none focus:ring-2 focus:ring-grey-500"
              value={text}
              onChange={handleChange}
            />
          </label>
          <button
            type="submit"
            disabled={!text.trim()}
            className="self-start rounded-lg bg-black px-4 py-2 text-apollo-light hover:bg-zinc-800 "
          >
            Get quote
          </button>
        </form>

        {results.length > 0 && (
          <>
            <div
              role="status"
              className="flex w-full items-center gap-3 rounded-lg bg-orange-200 px-4 py-3 text-sm text-black mb-2"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className="size-5 shrink-0"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
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
                  {results.map((row) => (
                    <tr key={row.sku}>
                      <td>{row.sku}</td>
                      <td>{row.name ?? "—"}</td>
                      <td>{row.qty ?? "—"}</td>
                      <td>
                        {row.price != null ? `$${row.price.toFixed(2)}` : "—"}
                      </td>
                      <td>{row.stock ?? "—"}</td>
                      <td>
                        {row.leadTime != null
                          ? `${row.leadTime} ${row.leadTime === 1 ? "day" : "days"}`
                          : "—"}
                      </td>
                      <td>{row.warehouse ?? "—"}</td>
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
        <ol className="flex flex-col gap-12">
          {fakeActivity.map((activity) => (
            <li key={activity.id}>
              <p className="font-semibold text-lg">{activity.title}</p>
              <div className="flex flex-row gap-4 text-sm text-gray-800 justify-between">
                <div className="flex flex-col gap-1">
                  <p>{activity.user}</p>
                  <p>{activity.time}</p>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <p>{activity.po}</p>
                  <p>{activity.date}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
