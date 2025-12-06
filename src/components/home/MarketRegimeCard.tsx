"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import SourceStatusBadge, { type Status } from "@/components/ui/SourceStatusBadge";

type MarketRegimeCardProps = {
  trendRegime: "UP" | "DOWN" | "RANGE";
  volatilityState: string; // e.g., "ATR 45th percentile"
  session: "Asia" | "London" | "NY" | "Closed";
  summary: string; // Human language summary
  fmpStatus: Status;
  derivedStatus: Status;
};

export default function MarketRegimeCard({
  trendRegime,
  volatilityState,
  session,
  summary,
  fmpStatus,
  derivedStatus,
}: MarketRegimeCardProps) {
  const router = useRouter();

  const regimeColor =
    trendRegime === "UP"
      ? "text-[#00FF7F]"
      : trendRegime === "DOWN"
      ? "text-[#FF4D4D]"
      : "text-[#FFBF00]";

  return (
    <Link
      href="/market"
      className="relative block rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-7 cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:border-white/25 active:scale-[0.99]"
    >
      <div className="absolute top-4 right-4 flex flex-col gap-1 items-end">
        <span className="text-[12px] uppercase font-semibold tracking-wide" style={{ color: fmpStatus === "LIVE" ? "#00FF7F" : fmpStatus === "DEGRADED" ? "#FFBF00" : "#FF4D4D" }}>
          FMP • {fmpStatus}
        </span>
        <span className="text-[12px] uppercase font-semibold tracking-wide" style={{ color: derivedStatus === "OK" ? "#7FE1FF" : derivedStatus === "DEGRADED" ? "#FFBF00" : "#FF4D4D" }}>
          DERIVED • {derivedStatus}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Metrics */}
        <div className="space-y-4">
          <div>
            <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-1">
              Trend Regime
            </p>
            <p className={`text-xl font-semibold ${regimeColor}`}>
              {trendRegime}
            </p>
          </div>

          <div>
            <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-1">
              Volatility State
            </p>
            <p className="text-[14px] font-medium text-white">
              {volatilityState}
            </p>
          </div>

          <div>
            <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-1">
              Session
            </p>
            <p className="text-[14px] font-medium text-white">{session}</p>
          </div>
        </div>

        {/* Right Summary */}
        <div>
          <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-2">
            Context
          </p>
          <p className="text-[14px] leading-relaxed text-white/80">
            {summary}
          </p>
        </div>
      </div>
    </Link>
  );
}

