"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks() {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Home" },
    { href: "/journal", label: "Journal" },
    { href: "/capture", label: "Capture" },
    { href: "/trades", label: "Trades" },
    { href: "/agent", label: "Today" }
  ];

  return (
    <nav className="flex gap-4 text-sm">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "text-ultra-accent underline"
                : "text-gray-400 hover:text-white"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

