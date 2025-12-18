"use client";

import Link from "next/link";

type Position = {
  symbol: string;
  quantity: number;
  unrealizedPnl: number;
  percentMove: number;
  marketPrice: number;
  avgPrice: number;
};

type PositionsTopImpactProps = {
  positions: Position[];
};

export default function PositionsTopImpact({ positions }: PositionsTopImpactProps) {
  // Sort by absolute unrealized P&L (most impactful first)
  const sorted = [...positions].sort((a, b) => Math.abs(b.unrealizedPnl) - Math.abs(a.unrealizedPnl));
  const top5 = sorted.slice(0, 5);

  if (top5.length === 0) {
    return (
      <section className="px-6 py-4">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-8 text-center">
          <p className="text-white/40 text-[14px]">No positions</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-4">
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
        <div className="divide-y divide-white/5">
          {top5.map((pos) => (
            <Link
              key={pos.symbol}
              href={`/symbol/${pos.symbol}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className="text-[14px] font-semibold text-white w-20 flex-shrink-0">
                  {pos.symbol}
                </span>
                <span className="text-[13px] text-white/60 w-12 text-center flex-shrink-0">
                  {pos.quantity > 0 ? `+${pos.quantity}` : pos.quantity}
                </span>
                <span className={`text-[14px] font-medium flex-1 text-right ${
                  pos.unrealizedPnl >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
                }`}>
                  {pos.unrealizedPnl >= 0 ? "+" : ""}
                  ${Math.abs(pos.unrealizedPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[12px] text-white/50 w-16 text-right flex-shrink-0">
                  {pos.percentMove >= 0 ? "+" : ""}{pos.percentMove.toFixed(1)}%
                </span>
              </div>
            </Link>
          ))}
        </div>
        {positions.length > 5 && (
          <div className="px-4 py-3 border-t border-white/5">
            <Link
              href="/trades?tab=open"
              className="text-[13px] text-white/60 hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              View all {positions.length} positions
              <span>→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

