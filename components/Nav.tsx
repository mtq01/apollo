import Link from "next/link";
import { CircleStar, Shuffle } from "@/components/icons";

const links = [
  { href: "/dashboard", label: "Dashboard", Icon: CircleStar },
  { href: "/reorder", label: "Reorder", Icon: Shuffle },
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
              {Icon && <Icon aria-hidden="true" className="shrink-0" />}
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Nav;
