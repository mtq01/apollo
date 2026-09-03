"use client";

import { useContext } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { AccountContext } from "@/components/account/AccountContext";
import { accountList } from "@/components/account/AccountSelector";
import { ActivityContext } from "@/components/activity-log/ActivityContext";

import { ChevronDownIcon, PanelRightIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

export function SiteHeader() {
  const { accountId, setAccountId } = useContext(AccountContext);
  const { toggle: toggleActivity } = useContext(ActivityContext);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">Apollo</h1>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleActivity}
            aria-label="Toggle activity log"
          >
            <PanelRightIcon />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline">
                  {accountList.find((a) => a.id === accountId)?.name ??
                    "Select Account"}{" "}
                  <ChevronDownIcon />
                </Button>
              }
            />
            <DropdownMenuContent className="w-48" align="end">
              <DropdownMenuGroup>
                {accountList.map((person) => (
                  <DropdownMenuItem
                    key={person.id}
                    onClick={() => setAccountId(person.id)}
                  >
                    <Item size="xs" className="w-full p-2">
                      <ItemMedia>
                        <Avatar className="size-6.5">
                          <AvatarImage src={person.avatarUrl} />
                          <AvatarFallback>
                            {person.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </ItemMedia>
                      <ItemContent className="gap-0">
                        <ItemTitle>{person.name}</ItemTitle>
                        <ItemDescription className="leading-none">
                          {person.role}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
