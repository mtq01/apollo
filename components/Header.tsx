"use client";

import { useState } from "react";
import { accountList } from "@/components/account/AccountSelector";
import { CircleUserRound } from "@/components/icons";

const Header = () => {
  const [accountId, setAccountId] = useState<number | null>(null);
  const account = accountList.find((a) => a.id === accountId);
  return (
    <header className="flex h-topbar flex-col items-center justify-center gap-4 bg-apollo-light px-4 sm:flex-row text-black sm:justify-end sm:px-16 border-b border-zinc-200">
      <div className="flex items-center gap-4">
        <CircleUserRound size={32} aria-hidden="true" className="shrink-0" />
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
