"use client";

import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

export default function HistoryPlaceholder() {
  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="IBKR" status="OFF" />
      <h2 className="text-[18px] font-bold text-white mb-4">Trade History</h2>
      <div className="space-y-2">
        <p className="text-sm text-white/50">
          Trade history not wired yet. Realised PnL and fills will appear here once the IBKR
          history endpoint is enabled.
        </p>
      </div>
    </div>
  );
}

