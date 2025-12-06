"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

type Position = {
  symbol: string;
  unrealizedPnl: number;
  quantity: number;
  correlationAlert?: boolean; // If > 0.6 correlation to another position
};

type PositionsSnapshotProps = {
  positions: Position[];
  status: "LIVE" | "DEGRADED" | "ERROR";
};

export default function PositionsSnapshot({
  positions,
  status,
}: PositionsSnapshotProps) {
  const router = useRouter();

  if (positions.length === 0) {
    return (
      <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-7">
        <SourceStatusBadge provider="IBKR" status={status} />
        <p className="text-white/50 text-[14px]">No active trades</p>
      </div>
    );
  }

  return (
    <Link
      href="/trades?tab=open"
      className="relative block rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-7 cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:border-white/25 active:scale-[0.99]"
    >
      <SourceStatusBadge provider="IBKR" status={status} />
      
      <div className="flex flex-wrap gap-3 overflow-x-auto pb-2">
        {positions.map((pos) => (
          <div
            key={pos.symbol}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <span className="text-[14px] font-semibold text-white">
              {pos.symbol}
            </span>
            <span
              className={`text-[13px] font-medium ${
                pos.unrealizedPnl >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
              }`}
            >
              {pos.unrealizedPnl >= 0 ? "+" : ""}
              ${pos.unrealizedPnl.toFixed(2)}
            </span>
            <span className="text-[12px] text-white/50">
              {pos.quantity > 0 ? `+${pos.quantity}` : pos.quantity}
            </span>
            {pos.correlationAlert && (
              <div className="w-2 h-2 rounded-full bg-[#FFBF00]" />
            )}
          </div>
        ))}
      </div>
    </Link>
  );
}

