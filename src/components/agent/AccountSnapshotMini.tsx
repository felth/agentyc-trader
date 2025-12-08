"use client";

import Link from "next/link";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import AgentHintTag from "@/components/ui/AgentHintTag";
import { getRiskSeverity } from "@/lib/riskUtils";
import type { ReactNode } from "react";

type AccountSnapshotMiniProps = {
  netLiquidity: number;
  buyingPower: number;
  unrealizedPnl: number;
  openRiskR: number;
  status: "LIVE" | "DEGRADED" | "ERROR";
  agentHint?: ReactNode;
};

export default function AccountSnapshotMini({
  netLiquidity,
  buyingPower,
  unrealizedPnl,
  openRiskR,
  status,
  agentHint,
}: AccountSnapshotMiniProps) {
  const severity = getRiskSeverity(openRiskR);
  const hint = severity === "OK" ? undefined : (
    <AgentHintTag text={`RISK ${severity}`} />
  );

  return (
    <Link
      href="/performance"
      className="relative block rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5 cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:border-white/25 active:scale-[0.99]"
    >
      <SourceStatusBadge provider="IBKR" status={status} />
      {(agentHint || hint) && (
        <div className="absolute top-2 left-4 z-10">{agentHint || hint}</div>
      )}

      <div className="pr-20 mb-3">
        <h3 className="text-[14px] font-bold text-white">Account Snapshot</h3>
      </div>
      <div className="space-y-2 text-[13px]">
        <div className="flex justify-between">
          <span className="text-white/50">Net Liquidity</span>
          <span className="text-white font-medium">
            ${netLiquidity.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Buying Power</span>
          <span className="text-white font-medium">
            ${buyingPower.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Unrealized P&L</span>
          <span
            className={`font-medium ${
              unrealizedPnl >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
            }`}
          >
            {unrealizedPnl >= 0 ? "+" : ""}
            ${unrealizedPnl.toFixed(2)}
          </span>
        </div>
      </div>
    </Link>
  );
}

