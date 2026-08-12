"use client";

import { useState } from "react";
import { accountList } from "@/components/account/AccountSelector";

const Header = () => {
  const [accountId, setAccountId] = useState<number | null>(null);
  const account = accountList.find((a) => a.id === accountId);
  return (
    <header className="flex h-topbar flex-col items-center justify-center gap-4 bg-apollo-light px-4 sm:flex-row text-black sm:justify-end sm:px-16 border-b border-zinc-200">
      <div className="flex items-center gap-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17.925 20.056a6 6 0 0 0-11.851.001" />
          <circle cx="12" cy="11" r="4" />
          <circle cx="12" cy="12" r="10" />
        </svg>
        <select
          value={accountId ?? ""}
          onChange={(e) =>
            setAccountId(e.target.value === "" ? null : Number(e.target.value))
          }
        >
          <option value="">Select account</option>
          {accountList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <div>
          <p className="font-bold">{account?.name ?? "No account"}</p>
          <p className="text-sm">{account?.accountType ?? "—"}</p>
        </div>
      </div>
    </header>
  );
};
export default Header;
