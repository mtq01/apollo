import { useContext, useEffect, useRef } from "react";
import { AccountContext } from "@/components/account/AccountContext";

// runs reset when the account changes. skips the first pick, since there is nothing to clear yet.
export function useResetOnAccountSwitch(reset: () => void) {
  const { accountId } = useContext(AccountContext);
  const previousAccountId = useRef(accountId);

  useEffect(() => {
    if (
      previousAccountId.current !== null &&
      previousAccountId.current !== accountId
    ) {
      reset();
    }
    previousAccountId.current = accountId;
  }, [accountId, reset]);
}
