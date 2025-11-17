// src/components/NavLinks.tsx

"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";



const TABS = [

  { href: "/", label: "Home" },

  { href: "/performance", label: "Performance" },

  { href: "/trades", label: "Trades" },

  { href: "/journal", label: "Journal" },

  { href: "/agent", label: "Agent" }

];



export function NavLinks() {

  const pathname = usePathname();



  return (

    <nav

      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-ultra-border bg-ultra-card/80 backdrop-blur-md px-3 py-2 shadow-lg w-[95%] max-w-md"

      aria-label="Main navigation"

    >

      <ul className="flex items-center justify-between gap-1">

        {TABS.map((tab) => {

          const active = pathname === tab.href;

          return (

            <li key={tab.href} className="flex-1">

              <Link

                href={tab.href}

                className={[

                  "flex flex-col items-center justify-center text-[10px] leading-tight px-2 py-1 transition-transform duration-150",

                  active ? "scale-105" : "opacity-80 hover:opacity-100"

                ].join(" ")}

              >

                <span

                  className={[

                    "inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-medium",

                    active

                      ? "bg-ultra-accent text-black"

                      : "bg-transparent text-gray-300"

                  ].join(" ")}

                >

                  {tab.label}

                </span>

              </Link>

            </li>

          );

        })}

      </ul>

    </nav>

  );

}
