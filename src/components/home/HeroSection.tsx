"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type HeroSectionProps = {
  dateStr: string;
  dayStr: string;
  time: string;
};

export default function HeroSection({ dateStr, dayStr, time }: HeroSectionProps) {
  const pathname = usePathname();

  return (
    <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-10 lg:pb-12">
      <div className="relative min-h-[60vh] md:min-h-[70vh] rounded-[2rem] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-home.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="relative h-full flex flex-col px-6 py-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white/90 tracking-tight">AGENTYC</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                <span className="text-sm">🔍</span>
              </button>
              <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center relative hover:bg-white/10 transition-colors">
                <span className="text-sm">🔔</span>
              </button>
              <Link
                href="/profile"
                className={`w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center hover:bg-white/10 transition-colors ${
                  pathname === "/profile"
                    ? "bg-[#F56300]/20 border-[#F56300]/50"
                    : "bg-white/5 border-white/10"
                }`}
                aria-label="Settings"
              >
                <span className="text-sm">⚙️</span>
              </Link>
            </div>
          </div>

          {/* Large Date Display - Like health app */}
          <div className="mt-auto">
            <p className="text-6xl font-bold text-white/90 tracking-tight mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {dateStr}
            </p>
            <p className="text-sm text-white/70 font-medium">{dayStr}</p>
            <p className="text-xs text-white/60 mt-1">{time}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

