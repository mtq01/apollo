import Link from "next/link";
import Spinner from "../../components/Spinner";
import ErrorMessage from "../../components/ErrorMessage";
import EmptyState from "../../components/EmptyState";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <Link className="underline hover:no-underline" href="/">
            Home
          </Link>
          <Link className="underline hover:no-underline" href="/dashboard">
            Dashboard
          </Link>

          <Link className="underline hover:no-underline" href="/reorder">
            Reorder
          </Link>

          <Link className="underline hover:no-underline" href="/login">
            Login
          </Link>
          <Link className="underline hover:no-underline" href="/claudetest">
            Claude Test
          </Link>

          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-red-500">
            Dashboard Page
          </h1>

          <h2 className="text-xl font-semibold">Component Testing: </h2>
          <Spinner />
          <EmptyState message="test message" />
          <ErrorMessage error="test error" />
        </div>
      </main>
    </div>
  );
}
