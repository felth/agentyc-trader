"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import { getRiskSeverity } from "@/lib/riskUtils";

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

  // Risk severity using utility function
  const severity = getRiskSeverity(openRiskR);
  const severityColor =
    severity === "OK"
      ? "#00FF7F"
      : severity === "ELEVATED"
      ? "#FFBF00"
      : "#FF4D4D";
  const severityText =
    severity === "OK"
      ? "RISK: OK"
      : severity === "ELEVATED"
      ? "RISK: ELEVATED"
      : "RISK: DANGEROUS";

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
            <div className="text-[15px] font-semibold" style={{ color: severityColor }}>
              {severityText} — {openRiskR.toFixed(2)}R
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

