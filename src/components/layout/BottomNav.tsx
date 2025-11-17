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

  { label: "Agent", href: "/agent", icon: "🤖" }, // NEW – second position

  { label: "Performance", href: "/performance", icon: "📈" },

  { label: "Trades", href: "/trades", icon: "💼" },

  { label: "Journal", href: "/journal", icon: "📓" },

  { label: "Profile", href: "/profile", icon: "⚙️" }

];



export function BottomNav() {

  const pathname = usePathname();



  return (

    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-4">

      <div className="mx-auto w-full max-w-md px-4">

        <div className="flex items-center justify-between rounded-full bg-[rgba(15,15,15,0.96)]/95 px-3 py-1 shadow-[0_18px_45px_rgba(0,0,0,0.8)] backdrop-blur-xl border border-white/8">

          {TABS.map((tab) => {

            const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

            return (

              <Link

                key={tab.href}

                href={tab.href}

                className="flex-1"

                aria-label={tab.label}

              >

                <div className="flex flex-col items-center justify-center py-2 text-[11px] leading-tight">

                  <div

                    className={[

                      "flex items-center justify-center rounded-full px-3 py-1 transition-all duration-150",

                      active

                        ? "bg-ultra-accent/90 text-white shadow-[0_0_15px_rgba(245,99,0,0.9)] scale-[1.05]"

                        : "text-gray-300 hover:scale-105 hover:text-ultra-accent"

                    ].join(" ")}

                  >

                    <span className="mr-1 text-base">{tab.icon}</span>

                    <span className="font-medium">{tab.label}</span>

                  </div>

                </div>

              </Link>

            );

          })}

        </div>

      </div>

    </nav>

  );

}
