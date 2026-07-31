// This page checks account, redirects to login page or dashboard page.


export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            This page is our <strong><em>router</em></strong>. It checks the account state & sends you to either the login page or dashboard page.
          </h1>

          <p>This page will <strong><em>not</em></strong> display anything, it will only run the check & route the user where they need to be.</p>

        </div>

      </main>
    </div>
  );
}
