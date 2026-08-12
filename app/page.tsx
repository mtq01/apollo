// This page checks account, redirects to login page or dashboard page.

export default function Home() {
  return (
    <div className="flex flex-col gap-6 p-16">
      <h2 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black">
        Home Page
      </h2>
      <h1 className="max-w-xs text-xl font-semibold leading-10 tracking-tight text-black">
        This page will eventually check account state and redirect to{" "}
        <strong>/login</strong> or <strong>/dashboard</strong>
      </h1>
      <p>
        It will{" "}
        <strong>
          <em>not</em>
        </strong>{" "}
        display anything, and will only run the check to route the user where
        they need to be.
      </p>
    </div>
  );
}
