"use client";

import React, { useEffect, useState } from "react";
import type { DashboardSnapshot } from "@/lib/data/dashboard";

export default function AgentContextPage() {
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/home');
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setDashboard(data.snapshot);
      } else {
        setError(data.error || "Failed to load trading context");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to fetch trading context");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen max-w-md mx-auto px-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-ultra-accent/30 border-t-ultra-accent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Loading trading context...</p>
        </div>
      </main>
    );
  }

  if (error || !dashboard) {
    return (
      <main className="max-w-md mx-auto px-4 pt-6">
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-5">
          <p className="text-sm text-red-400 font-medium">Error loading trading context</p>
          <p className="text-xs text-red-400/70 mt-1">{error || "Unknown error"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 pt-2 pb-24 max-w-md mx-auto px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Trading Context</h1>
        <p className="text-sm text-white/60">
          Live snapshot of your IBKR account + positions as seen by the agent.
        </p>
      </div>

      {/* Account Summary */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-white mb-3">Account Summary</h2>
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Account ID</p>
              <p className="text-sm font-semibold text-white">{dashboard.account.accountId || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Balance</p>
              <p className="text-sm font-semibold text-white">
                ${dashboard.account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Equity</p>
              <p className="text-sm font-semibold text-white">
                ${dashboard.account.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Buying Power</p>
              <p className="text-sm font-semibold text-white">
                ${dashboard.account.buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-1 col-span-2">
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Unrealized P&L</p>
              <p className={`text-lg font-semibold ${dashboard.account.unrealizedPnl >= 0 ? "text-ultra-positive" : "text-ultra-negative"}`}>
                {dashboard.account.unrealizedPnl >= 0 ? "+" : ""}
                ${dashboard.account.unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Positions Table */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-white mb-3">Positions</h2>
        {dashboard.positions.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5">
            <p className="text-sm text-white/50 text-center">No open positions</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">Symbol</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-white/70 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-white/70 uppercase tracking-wider">Avg Price</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-white/70 uppercase tracking-wider">Mkt Price</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-white/70 uppercase tracking-wider">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {dashboard.positions.map((pos, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-white">{pos.symbol}</td>
                      <td className="px-4 py-3 text-sm text-white/90 text-right">{pos.quantity}</td>
                      <td className="px-4 py-3 text-sm text-white/90 text-right">
                        ${pos.avgPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/90 text-right">
                        ${pos.marketPrice.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right ${pos.unrealizedPnl >= 0 ? "text-ultra-positive" : "text-ultra-negative"}`}>
                        {pos.unrealizedPnl >= 0 ? "+" : ""}
                        ${pos.unrealizedPnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Raw JSON (Collapsible) */}
      <section className="mb-6">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full flex items-center justify-between rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-4 hover:bg-white/[0.12] transition-colors"
        >
          <h2 className="text-base font-bold text-white">Raw JSON Context</h2>
          <span className="text-sm text-white/50">{showRawJson ? "▼" : "▶"}</span>
        </button>
        {showRawJson && (
          <div className="mt-3 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5 overflow-hidden">
            <pre className="text-xs text-white/70 overflow-x-auto whitespace-pre-wrap font-mono">
              {JSON.stringify(
                {
                  account: dashboard.account,
                  positions: dashboard.positions,
                  orders: dashboard.orders,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </section>
    </main>
  );
}

