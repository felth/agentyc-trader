"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: "🏠" },
  { href: "/performance", label: "Performance", icon: "📈" },
  { href: "/trades", label: "Trades", icon: "💼" },
  { href: "/journal", label: "Journal", icon: "📝" },
  { href: "/profile", label: "Profile", icon: "⚙️" }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-5 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-center justify-between gap-1.5 bg-white/10 backdrop-blur-2xl rounded-full px-2 py-2 border border-white/20 max-w-md w-[95%] shadow-2xl">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href === "/home" && pathname === "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center gap-0.5 text-[10px] font-medium min-w-0"
            >
              <div
                className={
                  active
                    ? "flex items-center justify-center w-10 h-10 rounded-full bg-[#F56300] text-black shadow-[0_0_18px_rgba(245,99,0,0.7)] transition"
                    : "flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
                }
              >
                <span className="text-base leading-none">{item.icon}</span>
              </div>
              <span
                className={`truncate w-full text-center ${
                  active ? "text-[#F56300] font-semibold" : "text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

