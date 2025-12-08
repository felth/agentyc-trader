"use client";

import Link from "next/link";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import AgentHintTag from "@/components/ui/AgentHintTag";
import type { ReactNode } from "react";

type Position = {
  symbol: string;
  quantity: number;
  unrealizedPnl: number;
  correlationAlert?: boolean;
};

type PositionsMiniListProps = {
  positions: Position[];
  status: "LIVE" | "DEGRADED" | "ERROR" | "EMPTY";
  agentHint?: ReactNode;
};

export default function PositionsMiniList({
  positions,
  status,
  agentHint,
}: PositionsMiniListProps) {
  const correlationAlertExists = positions?.some(
    (p) => p.correlationAlert === true
  );
  const hint = correlationAlertExists ? (
    <AgentHintTag text="correlation watch" />
  ) : agentHint;

  // Map EMPTY status to OK for SourceStatusBadge
  const badgeStatus: "LIVE" | "OK" | "IDLE" | "DEGRADED" | "ERROR" = 
    status === "EMPTY" ? "OK" : status;

  if (positions.length === 0) {
    return (
      <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5">
        <SourceStatusBadge provider="IBKR" status={badgeStatus} />
        {hint && <div className="absolute top-2 left-4 z-10">{hint}</div>}
        <div className="pr-20 mb-2">
          <h3 className="text-[14px] font-bold text-white">Positions</h3>
        </div>
        <p className="text-white/50 text-[13px]">No open positions from IBKR.</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5">
      <SourceStatusBadge provider="IBKR" status={badgeStatus} />
      {hint && <div className="absolute top-2 left-4 z-10">{hint}</div>}
      
      <div className="pr-20 mb-3">
        <h3 className="text-[14px] font-bold text-white">Positions</h3>
      </div>
      <div className="space-y-2">
        {positions.slice(0, 5).map((pos) => (
          <Link
            key={pos.symbol}
            href={`/symbol/${pos.symbol}`}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-white">
                {pos.symbol}
              </span>
              {pos.correlationAlert && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#FFBF00]" />
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-white/50">
                {pos.quantity > 0 ? `+${pos.quantity}` : pos.quantity}
              </span>
              <span
                className={`text-[13px] font-medium ${
                  pos.unrealizedPnl >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
                }`}
              >
                {pos.unrealizedPnl >= 0 ? "+" : ""}
                ${pos.unrealizedPnl.toFixed(2)}
              </span>
              <span className="text-white/40 text-xs">→</span>
            </div>
          </Link>
        ))}
        {positions.length > 5 && (
          <Link
            href="/trades?tab=open"
            className="block text-[12px] text-white/60 hover:text-white transition-colors text-center pt-2"
          >
            View all {positions.length} positions →
          </Link>
        )}
      </div>
    </div>
  );
}

