"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type AccountData = {
  accountId: string;
  balance: number;
  equity: number;
  unrealizedPnl: number;
  buyingPower: number;
};

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

export default function PerformancePage() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<TradeExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [accountRes, positionsRes, tradesRes] = await Promise.all([
          fetch("/api/ibkr/account").then((r) => r.json()),
          fetch("/api/ibkr/positions").then((r) => r.json()),
          fetch("/api/ibkr/trades").then((r) => r.json()),
        ]);

        if (accountRes.ok) {
          setAccount({
            accountId: accountRes.accountId,
            balance: accountRes.balance || 0,
            equity: accountRes.equity || 0,
            unrealizedPnl: accountRes.unrealizedPnl || 0,
            buyingPower: accountRes.buyingPower || 0,
          });
        }

        if (positionsRes.ok && Array.isArray(positionsRes.positions)) {
          setPositions(positionsRes.positions);
        }

        if (tradesRes.ok && Array.isArray(tradesRes.trades)) {
          setTrades(tradesRes.trades);
        }
      } catch (err) {
        console.error("Failed to fetch performance data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-sm text-white/50">Loading performance data...</p>
          </div>
        </div>
      </main>
    );
  }

  // Calculate metrics
  const totalRealizedPnl = trades.reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const winRate = trades.length > 0 
    ? (trades.filter(t => (t.realizedPnl || 0) > 0).length / trades.length) * 100 
    : null;

  // Top movers
  const topMovers = [...positions]
    .sort((a, b) => b.unrealizedPnl - a.unrealizedPnl)
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Performance</h1>
            {account && (
              <p className="text-sm text-white/50 mt-1">
                {account.accountId} · <span className="text-[10px] text-white/40 uppercase tracking-wider">Source: Interactive Brokers (live)</span>
              </p>
            )}
          </div>
          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Equity Curve - Placeholder */}
        <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
          <h2 className="text-base font-bold text-white mb-4">Equity Curve</h2>
          <div className="h-64 flex items-center justify-center text-sm text-white/50 border border-dashed border-white/10 rounded-lg">
            Daily equity history unavailable (IBKR endpoint needed).
            <br />
            <span className="text-xs">Trade history available for realized PnL tracking.</span>
          </div>
        </div>

        {/* PnL Breakdown & Exposure - Two Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PnL Breakdown */}
          <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
            <h2 className="text-base font-bold text-white mb-4">PnL Breakdown</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Total Realized PnL</p>
                <p className={`text-2xl font-bold ${totalRealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {totalRealizedPnl >= 0 ? "+" : ""}
                  ${totalRealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Unrealized PnL</p>
                <p className={`text-2xl font-bold ${totalUnrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {totalUnrealizedPnl >= 0 ? "+" : ""}
                  ${totalUnrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              {winRate !== null && (
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Win Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {winRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    {trades.filter(t => (t.realizedPnl || 0) > 0).length} winning trades / {trades.length} total
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Exposure Breakdown */}
          <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
            <h2 className="text-base font-bold text-white mb-4">Exposure Breakdown</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Total Positions</p>
                <p className="text-2xl font-bold text-white">{positions.length}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Total Value</p>
                <p className="text-2xl font-bold text-white">
                  ${positions.reduce((sum, p) => sum + (p.marketPrice * p.quantity), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              {account && (
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Buying Power</p>
                  <p className="text-2xl font-bold text-white">
                    ${account.buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Movers */}
        <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
          <h2 className="text-base font-bold text-white mb-4">Top Movers</h2>
          {topMovers.length > 0 ? (
            <div className="space-y-2">
              {topMovers.map((position) => (
                <Link
                  key={position.symbol}
                  href={`/symbol/${position.symbol}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <p className="font-medium text-white">{position.symbol}</p>
                    <p className="text-xs text-white/50">
                      {position.quantity} @ ${position.avgPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${position.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {position.unrealizedPnl >= 0 ? "+" : ""}
                      ${position.unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-white/50">
                      {((position.unrealizedPnl / (position.avgPrice * position.quantity)) * 100).toFixed(2)}%
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/50">No positions to display</p>
          )}
        </div>
      </div>
    </main>
  );
}
