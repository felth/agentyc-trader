"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-end px-4 pt-4 pb-2 pointer-events-none">
      <div className="pointer-events-auto">
        <Link
          href="/profile"
          className={[
            "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-150",
            pathname === "/profile"
              ? "bg-ultra-accent text-black shadow-[0_0_15px_rgba(245,99,0,0.9)]"
              : "bg-ultra-card border border-ultra-border text-gray-300 hover:text-white hover:bg-ultra-cardAlt hover:border-ultra-accent/50"
          ].join(" ")}
          aria-label="Settings"
        >
          <span className="text-lg">⚙️</span>
        </Link>
      </div>
    </nav>
  );
}

