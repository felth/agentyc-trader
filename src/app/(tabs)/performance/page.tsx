"use client";

import React, { useEffect, useState } from "react";
import PerformanceHero from "@/components/performance/PerformanceHero";
import EquityDrawdownCard from "@/components/performance/EquityDrawdownCard";
import PnLBreakdownCard from "@/components/performance/PnLBreakdownCard";
import ExposureBreakdownCard from "@/components/performance/ExposureBreakdownCard";
import BehaviorInsightsCard from "@/components/performance/BehaviorInsightsCard";
import { getRiskSeverity } from "@/lib/riskUtils";
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
      <main className="min-h-screen bg-black text-white">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-white/50">Loading performance data...</p>
        </div>
      </main>
    );
  }

  // Calculate metrics
  const totalRealizedPnl = trades.reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  
  // Calculate month PnL (simplified - assumes all trades this month)
  const monthPnl = totalRealizedPnl;
  const monthPnlR = account && account.equity > 0 ? monthPnl / (account.equity * 0.01) : 0; // Rough 1R estimate

  // Calculate risk severity (based on unrealized PnL as % of equity)
  const openRiskPercent = account && account.equity > 0 
    ? Math.abs(totalUnrealizedPnl) / account.equity 
    : 0;
  const riskSeverity = getRiskSeverity(openRiskPercent);

  // Calculate total value and exposure breakdown
  const totalValue = positions.reduce((sum, p) => sum + (p.marketPrice * Math.abs(p.quantity)), 0);
  
  // Top symbols by exposure
  const topSymbols = positions
    .map((p) => ({
      symbol: p.symbol,
      value: p.marketPrice * Math.abs(p.quantity),
      percentage: totalValue > 0 ? ((p.marketPrice * Math.abs(p.quantity)) / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Behavior insights (placeholder for now - will be derived from journal entries)
  const behaviorMetrics: Array<{
    label: string;
    value: number | string;
    type: "POSITIVE" | "NEGATIVE" | "WARNING" | "NEUTRAL";
  }> = [];

  // Determine status
  const ibkrStatus: "LIVE" | "DEGRADED" | "ERROR" = account ? "LIVE" : "ERROR";
  const equityStatus: "LIVE" | "ERROR" | "EMPTY" = "EMPTY"; // No equity history endpoint yet

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Hero Section */}
      <PerformanceHero
        monthPnl={monthPnl}
        monthPnlR={monthPnlR}
        riskStatus={riskSeverity}
      />

      {/* Content */}
      <section className="px-6 pb-32 flex flex-col gap-8">
        {/* Equity & Drawdown */}
        <EquityDrawdownCard />

        {/* PnL & Exposure - Two Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PnLBreakdownCard
            totalRealizedPnl={totalRealizedPnl}
            unrealizedPnl={totalUnrealizedPnl}
            hasEquityHistory={false}
            status={ibkrStatus}
          />
          <ExposureBreakdownCard
            totalPositions={positions.length}
            totalValue={totalValue}
            buyingPower={account?.buyingPower || 0}
            topSymbols={topSymbols}
            status={ibkrStatus}
          />
        </div>

        {/* Behavior Insights */}
        <BehaviorInsightsCard metrics={behaviorMetrics} status={ibkrStatus} />

        {/* Top Movers */}
        {positions.length > 0 && (
          <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
            <h2 className="text-[18px] font-bold text-white mb-4">Top Movers</h2>
            <div className="space-y-2">
              {positions
                .sort((a, b) => b.unrealizedPnl - a.unrealizedPnl)
                .slice(0, 5)
                .map((position) => (
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
                      <p className={`font-bold ${
                        position.unrealizedPnl >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
                      }`}>
                        {position.unrealizedPnl >= 0 ? "+" : ""}
                        ${position.unrealizedPnl.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-white/50">
                        {((position.unrealizedPnl / (position.avgPrice * Math.abs(position.quantity))) * 100).toFixed(2)}%
                      </p>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
