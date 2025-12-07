"use client";

import Link from "next/link";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

type Position = {
  symbol: string;
  quantity: number;
  avgPrice: number;
  marketPrice: number;
  unrealizedPnl: number;
};

type OpenPositionsTableProps = {
  positions: Position[];
  netLiquidity?: number;
  status: "LIVE" | "DEGRADED" | "ERROR";
};

export default function OpenPositionsTable({
  positions,
  netLiquidity = 0,
  status,
}: OpenPositionsTableProps) {
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

  if (positions.length === 0) {
    return (
      <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
        <SourceStatusBadge provider="IBKR" status={status} />
        <div className="space-y-2">
          <p className="text-sm text-white/50">No open positions in your IBKR account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="IBKR" status={status} />
      <h2 className="text-[18px] font-bold text-white mb-4">Open Positions</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">
                Symbol
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">
                Qty
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">
                Avg Price
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">
                Last Price
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">
                PnL
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">
                Exposure
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const pnlPct =
                pos.avgPrice * pos.quantity > 0
                  ? (pos.unrealizedPnl / (pos.avgPrice * pos.quantity)) * 100
                  : 0;
              const positionValue = pos.marketPrice * pos.quantity;
              const exposurePct =
                netLiquidity > 0 ? (positionValue / netLiquidity) * 100 : 0;

              return (
                <tr
                  key={pos.symbol}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <Link
                      href={`/symbol/${pos.symbol}`}
                      className="font-medium text-white hover:text-orange-500 transition-colors"
                    >
                      {pos.symbol}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-right text-white">
                    {pos.quantity.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-white">
                    ${pos.avgPrice.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-white">
                    ${pos.marketPrice.toFixed(2)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-medium ${
                      pos.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {pos.unrealizedPnl >= 0 ? "+" : ""}
                    ${pos.unrealizedPnl.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-white/70">
                    {exposurePct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-white/20">
              <td className="py-3 px-4 font-bold text-white">Total</td>
              <td className="py-3 px-4 text-right font-bold text-white">
                {positions.length}
              </td>
              <td colSpan={2}></td>
              <td
                className={`py-3 px-4 text-right font-bold ${
                  totalUnrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {totalUnrealizedPnl >= 0 ? "+" : ""}
                ${totalUnrealizedPnl.toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

