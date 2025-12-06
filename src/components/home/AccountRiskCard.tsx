"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

type AccountRiskCardProps = {
  netLiquidity: number;
  buyingPower: number;
  dailyPnl: number;
  openRiskR: number; // Risk in R multiples
  positionsCount: number;
  status: "LIVE" | "DEGRADED" | "ERROR";
};

export default function AccountRiskCard({
  netLiquidity,
  buyingPower,
  dailyPnl,
  openRiskR,
  positionsCount,
  status,
}: AccountRiskCardProps) {
  const router = useRouter();

  // Risk levels
  const riskLevel =
    openRiskR < 0.5 ? "OK" : openRiskR < 1.0 ? "ELEVATED" : "DANGEROUS";
  const riskColor =
    openRiskR < 0.5
      ? "text-[#00FF7F]"
      : openRiskR < 1.0
      ? "text-[#FFBF00]"
      : "text-[#FF4D4D]";

  return (
    <Link
      href="/performance"
      className="relative block rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-7 cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:border-white/25 active:scale-[0.99]"
    >
      <SourceStatusBadge provider="IBKR" status={status} />
      
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div>
            <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-1">
              Net Liquidity
            </p>
            <p className="text-2xl font-semibold text-white">
              ${netLiquidity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-1">
              Buying Power
            </p>
            <p className="text-xl font-semibold text-white">
              ${buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-1">
              Daily P&L
            </p>
            <p
              className={`text-xl font-semibold ${
                dailyPnl >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
              }`}
            >
              {dailyPnl >= 0 ? "+" : ""}
              ${dailyPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-1">
              Open Risk
            </p>
            <div className="flex items-center gap-3">
              <p className={`text-xl font-semibold ${riskColor}`}>
                {openRiskR.toFixed(2)}R
              </p>
              <span className={`text-[11px] font-semibold ${riskColor}`}>
                RISK: {riskLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col justify-between">
          <div>
            <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-1">
              Positions
            </p>
            <p className="text-2xl font-semibold text-white">{positionsCount}</p>
          </div>

          <div className="flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors mt-auto">
            <span>View Performance</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

