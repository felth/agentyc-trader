"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import SourceStatusBadge, { type Status } from "@/components/ui/SourceStatusBadge";
import type { ReactNode } from "react";

type MarketRegimeCardProps = {
  trendRegime: "UP" | "DOWN" | "RANGE";
  volatilityState: string; // e.g., "ATR 45th percentile"
  session: "Asia" | "London" | "NY" | "Closed";
  summary: string; // Human language summary
  fmpStatus: Status;
  derivedStatus: Status;
  agentHint?: ReactNode;
};

export default function MarketRegimeCard({
  trendRegime,
  volatilityState,
  session,
  summary,
  fmpStatus,
  derivedStatus,
  agentHint,
}: MarketRegimeCardProps) {
  const router = useRouter();

  const regimeColor =
    trendRegime === "UP"
      ? "text-[#00FF7F]"
      : trendRegime === "DOWN"
      ? "text-[#FF4D4D]"
      : "text-[#FFBF00]";

  // Truncate summary to max 90 chars
  const truncatedSummary = summary.length > 90 ? summary.substring(0, 87) + "..." : summary;

  return (
    <Link
      href="/market"
      className="relative block rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/5 p-5 cursor-pointer transition-all duration-150 hover:bg-white/[0.05] hover:border-white/10 active:scale-[0.99]"
    >
      {agentHint && <div className="absolute top-2 left-4 z-10">{agentHint}</div>}
      
      <div className="flex items-center justify-between gap-4 pr-20">
        {/* Left: Metrics */}
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium mb-1">
              Trend
            </p>
            <p className={`text-[16px] font-semibold ${regimeColor}`}>
              {trendRegime}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium mb-1">
              Volatility
            </p>
            <p className="text-[14px] font-medium text-white truncate">
              {volatilityState}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium mb-1">
              Session
            </p>
            <p className="text-[14px] font-medium text-white">{session}</p>
          </div>
        </div>

        {/* Right: Summary (single line) */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] text-white/80 leading-tight truncate">
            {truncatedSummary}
          </p>
        </div>
      </div>
    </Link>
  );
}

