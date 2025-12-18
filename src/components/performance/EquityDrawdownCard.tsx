"use client";

import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

export default function EquityDrawdownCard() {

  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="BROKER" status="OFF" />
      
      <h2 className="text-[18px] font-bold text-white mb-4">Equity & Drawdown</h2>

      <div className="h-[300px] flex items-center justify-center text-sm text-white/50 border border-dashed border-white/10 rounded-lg">
        <div className="text-center max-w-md px-4">
          <p className="mb-2 font-medium">Daily equity history unavailable — broker history endpoint not connected yet.</p>
          <p className="text-xs text-white/40">
            This chart will show your equity curve and max drawdown once wired.
          </p>
        </div>
      </div>
    </div>
  );
}

