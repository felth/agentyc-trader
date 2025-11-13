"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/journal", label: "Journal" },
  // Future:
  // { href: "/trades", label: "Trades" },
  // { href: "/agent", label: "Agent" },
  // { href: "/capture", label: "Capture" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between">
      <div className="text-sm tracking-wide text-ultra-accent font-semibold">
        AGENTYC TRADER
      </div>
      <div className="flex gap-2 text-xs">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          const base =
            "px-3 py-1 rounded-full border transition-colors duration-150";

          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                base +
                " " +
                (active
                  ? "bg-ultra-accent text-black border-ultra-accent"
                  : "border-ultra-border text-gray-300 hover:border-ultra-accentHover hover:text-white")
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

