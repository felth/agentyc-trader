"use client";

import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

type PnLBreakdownCardProps = {
  totalRealizedPnl: number;
  unrealizedPnl: number;
  bestDay?: number;
  worstDay?: number;
  hasEquityHistory: boolean;
  status: "LIVE" | "DEGRADED" | "ERROR";
};

export default function PnLBreakdownCard({
  totalRealizedPnl,
  unrealizedPnl,
  bestDay,
  worstDay,
  hasEquityHistory,
  status,
}: PnLBreakdownCardProps) {
  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="BROKER" status={status} />
      
      <h2 className="text-[18px] font-bold text-white mb-6">PnL Breakdown</h2>

      <div className="space-y-6">
        <div>
          <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-2">
            Total Realised PnL
          </p>
          <p className={`text-3xl font-bold ${
            totalRealizedPnl >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
          }`}>
            {totalRealizedPnl >= 0 ? "+" : ""}
            ${totalRealizedPnl.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-white/40 mt-1">Period: This month (requires trade history)</p>
        </div>

        <div>
          <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-2">
            Unrealised PnL
          </p>
          <p className={`text-3xl font-bold ${
            unrealizedPnl >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
          }`}>
            {unrealizedPnl >= 0 ? "+" : ""}
            ${unrealizedPnl.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-white/40 mt-1">Unrealised PnL is based on your current positions only.</p>
        </div>

        {hasEquityHistory && (bestDay !== undefined || worstDay !== undefined) ? (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-1">
                Best Day
              </p>
              <p className={`text-xl font-bold ${
                (bestDay || 0) >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
              }`}>
                {bestDay !== undefined && bestDay >= 0 ? "+" : ""}
                ${bestDay?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-white/50 uppercase tracking-wider font-medium mb-1">
                Worst Day
              </p>
              <p className={`text-xl font-bold ${
                (worstDay || 0) >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
              }`}>
                {worstDay !== undefined && worstDay >= 0 ? "+" : ""}
                ${worstDay?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </p>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-white/40">
              Pending equity history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

