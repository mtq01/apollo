//https://react.dev/learn/passing-data-deeply-with-context#step-3-provide-the-context

"use client";

import { useState } from "react";
import { AccountContext } from "./AccountContext";

export function AccountProvider({ children }: { children: React.ReactNode }) {
  // the currently selected account id. null means nobody has picked one yet.
  const [accountId, setAccountId] = useState<number | null>(null);

  return (
    <AccountContext.Provider value={{ accountId, setAccountId }}>
      {children}
    </AccountContext.Provider>
  );
}

/* 
Where children comes from: whatever you put between the tags when you use it.

<AccountProvider>
  <Nav />        ← this
  <Header />     ← and this
</AccountProvider>

*/

// React.ReactNode is a type that represents any valid React child.
