"use client";

import { useContext } from "react";
import { accountList } from "@/components/account/AccountSelector";
import { CircleUserRound } from "@/components/icons";
import { AccountContext } from "./account/AccountContext";
// shad native-select
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
//https://react.dev/learn/passing-data-deeply-with-context#step-2-use-the-context

const Header = () => {
  const { accountId, setAccountId } = useContext(AccountContext);
  const account = accountList.find((a) => a.id === accountId);
  return (
    <header className="flex h-topbar flex-col items-center justify-center gap-4 bg-apollo-light px-4 sm:flex-row text-black sm:justify-end sm:px-16 border-b border-zinc-200">
      <div className="flex items-center gap-4">

        {/* Avatar */}
        <Avatar>
          {account && (
            <AvatarImage src={account.avatarUrl} alt={account.name} />
          )}

          <AvatarFallback>
            {account ? account.name[0] : <CircleUserRound aria-hidden="true" />}
          </AvatarFallback>
        </Avatar>

        {/* Select User Component */}
        <NativeSelect
          value={accountId ?? ""}
          onChange={(e) =>
            setAccountId(e.target.value === "" ? null : Number(e.target.value))
          }
        >
          <NativeSelectOption value="">Select Account</NativeSelectOption>
          {accountList.map((a) => (
            <NativeSelectOption key={a.id} value={a.id}>
              {a.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <div>
          <p className="font-bold">{account?.name ?? "No account"}</p>
          <p className="text-sm">{account?.accountType ?? "—"}</p>
        </div>
      </div>
    </header>
  );
};
export default Header;
