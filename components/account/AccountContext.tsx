//https://react.dev/learn/passing-data-deeply-with-context#step-1-create-the-context

// First, we create the context. we export it from a file so that our components can use it:
"use client";
import { createContext } from "react";

// we use context so we dont have to pass a million props down every level.
// anything inside the provider can call useContext and grab what it
// needs, no matter how deep it sits. we can also use context to share state between components that are not parent/child, like Header and Reorder.

type AccountContextValue = {
  accountId: number | null;
  setAccountId: (id: number | null) => void;
};

// we create the context with a default value. this is what will be used if a component calls useContext but is not inside a provider.
// we will always wrap our components in a provider, so this default value should never be used.
export const AccountContext = createContext<AccountContextValue>({
  accountId: null,
  setAccountId: () => {},
});
