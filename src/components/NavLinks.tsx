"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/journal", label: "Journal" }
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="inline-flex items-center gap-2 rounded-full bg-ultra-card px-1 py-1 border border-ultra-border">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              "text-xs px-3 py-1 rounded-full transition-colors " +
              (active
                ? "bg-ultra-accent text-black font-semibold shadow-sm"
                : "text-gray-300 hover:text-white hover:bg-ultra-cardAlt")
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

