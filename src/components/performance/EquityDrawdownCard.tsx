"use client";

import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

type EquityDrawdownCardProps = {
  hasData: boolean;
  status: "LIVE" | "ERROR" | "EMPTY";
};

export default function EquityDrawdownCard({
  hasData,
  status,
}: EquityDrawdownCardProps) {
  // Map EMPTY to OK for badge
  const badgeStatus: "LIVE" | "OK" | "IDLE" | "DEGRADED" | "ERROR" = 
    status === "EMPTY" ? "OK" : status;

  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="IBKR" status={badgeStatus} />
      
      <h2 className="text-[18px] font-bold text-white mb-4">Equity & Drawdown</h2>

      {hasData ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-white/50 border border-dashed border-white/10 rounded-lg">
          <div className="text-center">
            <p className="mb-2">Equity chart coming soon</p>
            <p className="text-xs text-white/40">Daily equity history will display here</p>
          </div>
        </div>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-sm text-white/50 border border-dashed border-white/10 rounded-lg">
          <div className="text-center max-w-md px-4">
            <p className="mb-2">Daily equity history unavailable (IBKR endpoint needed).</p>
            <p className="text-xs text-white/40">
              Trade history still available for realised PnL tracking.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

