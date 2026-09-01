"use client"

import { useContext } from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { AccountContext } from "@/components/account/AccountContext"
import { accountList } from "@/components/account/AccountSelector"

export function SiteHeader() {
  const { accountId, setAccountId } = useContext(AccountContext)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">Apollo</h1>

        <div className="ml-auto">
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
        </div>
      </div>
    </header>
  )
}
