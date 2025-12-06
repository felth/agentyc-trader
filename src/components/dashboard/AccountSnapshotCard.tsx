"use client";

import React from "react";

export type AccountSnapshotProps = {
  accountId: string;
  balance: number;
  equity: number;
  unrealizedPnl: number;
  buyingPower: number;
  positionsCount: number;
};

export function AccountSnapshotCard({
  accountId,
  balance,
  equity,
  unrealizedPnl,
  buyingPower,
  positionsCount,
}: AccountSnapshotProps) {
  const pnlColor = unrealizedPnl >= 0 ? "text-ultra-positive" : "text-ultra-negative";
  const pnlSign = unrealizedPnl >= 0 ? "+" : "";

  return (
    <section className="mb-6">
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Account</h3>
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Source: Interactive Brokers (live)</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Row 1 */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Net Liquidity</p>
            <p className="text-xl font-semibold text-white">
              ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Unrealized P&L</p>
            <p className={`text-xl font-semibold ${pnlColor}`}>
              {pnlSign}${unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Row 2 */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Buying Power</p>
            <p className="text-base font-semibold text-white">
              ${buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Positions</p>
            <p className="text-base font-semibold text-white">{positionsCount}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

