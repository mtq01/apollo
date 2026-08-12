import Spinner from "../../components/Spinner";
import ErrorMessage from "../../components/ErrorMessage";
import EmptyState from "../../components/EmptyState";
import { ErrorType } from "../../types";
import DisplayActivity from "@/components/activity-log/ActivityLog";

// this is throwaway data, stored in its own file to keep it clean.
import { logData } from "@/components/activity-log/testData";
import SelectAccount from "@/components/account/AccountSelector";
import { accountList } from "@/components/account/AccountSelector";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 p-16">
        <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight">
          Dashboard Page
        </h1>


      {/* Component Testing */}
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-green-500">
            Component Testing:{" "}
          </h2>
          <Spinner />
          <EmptyState message="test message" />
        </div>


        {/* ErrorTypes Testing */}
        <div className="flex flex-col gap-2">
          {/* ErrorMessage expect the full ErrorType object, not just text, so it looks like this: */}
          <h2 className="text-lg font-semibold text-green-500">
            ErrorTypes Testing:
          </h2>
          <ErrorMessage
            error={{ type: "timeout", message: "timeout test: error" }}
          />
          <ErrorMessage
            error={{ type: "not found", message: "nout found: test error" }}
          />
          <ErrorMessage
            error={{ type: "restricted", message: "restricted: test error" }}
          />
          <ErrorMessage
            error={{
              type: "invalid input",
              message: "invalid input: test error",
            }}
          />
          {/* 
            Passing an invalid 'type' to on purpose test the switch's default fallback case.
               - TypeScript normally blocks this since "unexpected" isn't a real ErrorType value.
               - Going through 'as unknown as ErrorType' forces it through for this one test case only.
               - Only used for testing the fallback on purpose, not in real app code
          */}
          <ErrorMessage
            error={
              { type: "unexpected", message: "Test" } as unknown as ErrorType
            }
          />
        </div>

          {/* Activity Log Output Testing */}
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-green-500">
            Activity Log Testing:
          </h2>

          <DisplayActivity events={logData} />
        </div>


            {/* Account Selection Testing */}
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-green-500">
            Account Selection Testing:
          </h2>
          <SelectAccount accounts={accountList} />
        </div>
    </div>
  );
}
