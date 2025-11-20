// src/components/BottomNav.tsx

"use client";



import Link from "next/link";

import { usePathname } from "next/navigation";

import React from "react";



type Tab = {

  label: string;

  href: string;

  icon: string; // emoji for MVP; swap for SVG icons later

};



const TABS: Tab[] = [

  { label: "Home", href: "/", icon: "🏠" },

  { label: "Agent", href: "/agent", icon: "🤖" },

  { label: "Trades", href: "/trades", icon: "💼" },

  { label: "Performance", href: "/performance", icon: "📈" },

  { label: "Journal", href: "/journal", icon: "📓" },

  { label: "Library", href: "/library", icon: "📚" }

];



export function BottomNav() {

  const pathname = usePathname();



  return (

    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>

      <div className="mx-auto w-full max-w-md px-2 pb-1.5 overflow-x-hidden">

        <div className="flex items-center justify-evenly gap-0.5 rounded-full bg-[rgba(15,15,15,0.98)]/98 px-1 py-0.5 shadow-[0_12px_30px_rgba(0,0,0,0.9)] backdrop-blur-xl border border-white/10 w-full">

          {TABS.map((tab) => {

            const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

            return (

              <Link

                key={tab.href}

                href={tab.href}

                className="flex-1 min-w-0 flex items-center justify-center"

                aria-label={tab.label}

              >

                <div

                  className={[

                    "flex flex-col items-center justify-center rounded-full px-1 py-1 transition-all duration-150 w-full max-w-full overflow-hidden",

                    active

                      ? "bg-ultra-accent/90 text-white shadow-[0_0_12px_rgba(245,99,0,0.85)] scale-[1.03]"

                      : "text-gray-400 hover:scale-105 hover:text-ultra-accent"

                  ].join(" ")}

                >

                  <span className="text-[10px] leading-none mb-0.5">{tab.icon}</span>

                  <span className="font-medium text-[8px] leading-[1] tracking-tight truncate w-full text-center">{tab.label}</span>

                </div>

              </Link>

            );

          })}

        </div>

      </div>

    </nav>

  );

}
