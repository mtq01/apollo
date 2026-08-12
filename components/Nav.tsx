import Link from "next/link";

function CircleStarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M11.051 7.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.867l-1.156-1.152a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="m18 14 4 4-4 4" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
      <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
      <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
    </svg>
  );
}

const links = [
  { href: "/dashboard", label: "Dashboard", Icon: CircleStarIcon },
  { href: "/reorder", label: "Reorder", Icon: ShuffleIcon },
  { href: "/login", label: "Login", Icon: null },
  { href: "/claudetest", label: "Claude Test", Icon: null },
];

function Nav() {
  return (
    <nav className="flex flex-col shrink-0 w-64 px-4 bg-apollo-dark text-apollo-light">
      <Link
        href="/"
        className="flex h-topbar items-center px-4 text-3xl font-bold"
      >
        Apollo
      </Link>
      <ul className="flex flex-col gap-2 py-4">
        {links.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              className="flex items-center gap-3 bg-[#333131] py-3 px-6 text-sm hover:bg-apollo-light hover:text-black font-roboto"
              href={href}
            >
              {Icon && <Icon />}
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Nav;
