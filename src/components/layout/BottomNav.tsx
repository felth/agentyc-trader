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
      <div className="pointer-events-auto flex items-center justify-between gap-2 bg-white/10 backdrop-blur-2xl rounded-full px-3 py-1.5 border border-white/10 max-w-md w-[95%]">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href === "/home" && pathname === "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center gap-0.5 text-[10px] font-medium"
            >
              <span
                className={
                  active
                    ? "flex flex-col items-center justify-center px-3 py-1.5 rounded-full bg-[#F56300] text-black shadow-[0_0_18px_rgba(245,99,0,0.7)] transition"
                    : "flex flex-col items-center justify-center px-2 py-1 text-slate-400 hover:text-white transition"
                }
              >
                <span className="text-sm leading-none">{item.icon}</span>
              </span>
              <span className={active ? "text-[#F56300]" : "text-slate-400"}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

