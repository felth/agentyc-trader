"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Position = {
  symbol: string;
  quantity: number;
  avgPrice: number;
  marketPrice: number;
  unrealizedPnl: number;
};

type TradeExecution = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  value: number;
  realizedPnl?: number;
  time: string;
};

export default function TradesPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"open" | "history">(
    (searchParams.get("tab") as "open" | "history") || "open"
  );
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<TradeExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(30);

  useEffect(() => {
    async function fetchData() {
      try {
        const [positionsRes, tradesRes] = await Promise.all([
          fetch("/api/ibkr/positions").then((r) => r.json()),
          fetch("/api/ibkr/trades").then((r) => r.json()),
        ]);

        if (positionsRes.ok && Array.isArray(positionsRes.positions)) {
          setPositions(positionsRes.positions);
        }

        if (tradesRes.ok && Array.isArray(tradesRes.trades)) {
          setTrades(tradesRes.trades);
        }
      } catch (err) {
        console.error("Failed to fetch trades data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter trades by days
  const filteredTrades = trades.filter((trade) => {
    const tradeDate = new Date(trade.time);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysFilter);
    return tradeDate >= cutoffDate;
  });

  // Calculate totals
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalRealizedPnl = filteredTrades.reduce((sum, t) => sum + (t.realizedPnl || 0), 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-sm text-white/50">Loading trades data...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Trades</h1>
          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab("open")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "open"
                ? "text-white border-b-2 border-orange-500"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            Open Positions
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "text-white border-b-2 border-orange-500"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            Trade History
          </button>
        </div>

        {/* Open Positions Tab */}
        {activeTab === "open" && (
          <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Open Positions</h2>
              <span className="text-[10px] text-white/40 uppercase tracking-wider">
                Source: Interactive Brokers (live)
              </span>
            </div>

            {positions.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Symbol</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Quantity</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Avg Price</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Last Price</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Unrealized P&L</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">% P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((pos) => {
                        const pnlPct = ((pos.unrealizedPnl / (pos.avgPrice * pos.quantity)) * 100);
                        return (
                          <tr key={pos.symbol} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4">
                              <Link
                                href={`/symbol/${pos.symbol}`}
                                className="font-medium text-white hover:text-orange-500 transition-colors"
                              >
                                {pos.symbol}
                              </Link>
                            </td>
                            <td className="py-3 px-4 text-right text-white">{pos.quantity.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-white">${pos.avgPrice.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-white">${pos.marketPrice.toFixed(2)}</td>
                            <td className={`py-3 px-4 text-right font-medium ${pos.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {pos.unrealizedPnl >= 0 ? "+" : ""}
                              ${pos.unrealizedPnl.toFixed(2)}
                            </td>
                            <td className={`py-3 px-4 text-right font-medium ${pnlPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {pnlPct >= 0 ? "+" : ""}
                              {pnlPct.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-white/20">
                        <td className="py-3 px-4 font-bold text-white">Total</td>
                        <td className="py-3 px-4 text-right font-bold text-white">{positions.length}</td>
                        <td colSpan={2}></td>
                        <td className={`py-3 px-4 text-right font-bold ${totalUnrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {totalUnrealizedPnl >= 0 ? "+" : ""}
                          ${totalUnrealizedPnl.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-white/50">No open positions</p>
            )}
          </div>
        )}

        {/* Trade History Tab */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/50">Date range:</span>
              {[7, 30, 90, 365].map((days) => (
                <button
                  key={days}
                  onClick={() => setDaysFilter(days)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    daysFilter === days
                      ? "bg-orange-500 text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">Trade History</h2>
                <span className="text-[10px] text-white/40 uppercase tracking-wider">
                  Source: Interactive Brokers (executions)
                </span>
              </div>

              {filteredTrades.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Date/Time</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Symbol</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Side</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Quantity</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Price</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Value</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Realized P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrades
                        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                        .map((trade) => (
                          <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 text-sm text-white/80">
                              {new Date(trade.time).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <Link
                                href={`/symbol/${trade.symbol}`}
                                className="font-medium text-white hover:text-orange-500 transition-colors"
                              >
                                {trade.symbol}
                              </Link>
                            </td>
                            <td className={`py-3 px-4 text-right font-medium ${trade.side === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
                              {trade.side}
                            </td>
                            <td className="py-3 px-4 text-right text-white">{trade.quantity.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-white">${trade.price.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-white">${Math.abs(trade.value).toFixed(2)}</td>
                            <td className={`py-3 px-4 text-right font-medium ${(trade.realizedPnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {trade.realizedPnl !== undefined ? (
                                <>
                                  {(trade.realizedPnl >= 0 ? "+" : "")}
                                  ${trade.realizedPnl.toFixed(2)}
                                </>
                              ) : (
                                <span className="text-white/40">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-white/20">
                        <td colSpan={6} className="py-3 px-4 font-bold text-white">Total Realized P&L</td>
                        <td className={`py-3 px-4 text-right font-bold ${totalRealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {totalRealizedPnl >= 0 ? "+" : ""}
                          ${totalRealizedPnl.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-white/50">
                  {trades.length === 0 ? "No trade history available" : `No trades in the last ${daysFilter} days`}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

