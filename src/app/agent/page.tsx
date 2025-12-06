"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { DashboardSnapshot } from "@/lib/data/dashboard";

export default function AgentPage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "chat";
  const ticker = searchParams.get("ticker") || "";

  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [symbolData, setSymbolData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContext() {
      try {
        const [dashboardRes, ...rest] = await Promise.all([
          fetch("/api/dashboard/home").then((r) => r.json()),
          ...(view === "symbol" && ticker
            ? [
                fetch(`/api/market/ohlcv?symbol=${ticker}&tf=H1`).then((r) => r.json()),
                fetch(`/api/market/news?symbol=${ticker}&limit=3`).then((r) => r.json()),
              ]
            : []),
        ]);

        if (dashboardRes.ok && dashboardRes.snapshot) {
          setDashboard(dashboardRes.snapshot);
        }

        if (view === "symbol" && ticker && rest.length > 0) {
          setSymbolData({
            ohlcv: rest[0]?.ok ? rest[0] : null,
            news: rest[1]?.ok ? rest[1] : null,
          });
        }
      } catch (err) {
        console.error("Failed to fetch agent context:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchContext();
  }, [view, ticker]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-sm text-white/50">Loading agent context...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Agent</h1>
          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Chat - Left Column */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
              <h2 className="text-base font-bold text-white mb-4">Agent Chat</h2>
              <div className="h-96 flex items-center justify-center text-sm text-white/50 border border-dashed border-white/10 rounded-lg">
                Agent chat interface coming soon
                <br />
                <span className="text-xs">Context sidebar loaded with current market state</span>
              </div>
            </div>
          </div>

          {/* Context Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Account Snapshot */}
            {dashboard?.account && (
              <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5">
                <h3 className="text-sm font-bold text-white mb-3">Account Snapshot</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/50">Net Liquidity</span>
                    <span className="text-white font-medium">
                      ${dashboard.account.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Buying Power</span>
                    <span className="text-white font-medium">
                      ${dashboard.account.buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Unrealized P&L</span>
                    <span className={`font-medium ${dashboard.account.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {dashboard.account.unrealizedPnl >= 0 ? "+" : ""}
                      ${dashboard.account.unrealizedPnl.toFixed(2)}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider mt-2 block">
                  Source: Interactive Brokers (live)
                </span>
              </div>
            )}

            {/* Positions */}
            {dashboard?.positions && dashboard.positions.length > 0 && (
              <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5">
                <h3 className="text-sm font-bold text-white mb-3">Positions</h3>
                <div className="space-y-2">
                  {dashboard.positions.slice(0, 5).map((pos) => (
                    <div key={pos.symbol} className="flex justify-between text-xs">
                      <span className="text-white">{pos.symbol}</span>
                      <span className={`font-medium ${pos.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {pos.unrealizedPnl >= 0 ? "+" : ""}
                        ${pos.unrealizedPnl.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {dashboard.positions.length > 5 && (
                    <Link
                      href="/trades?tab=open"
                      className="text-xs text-white/60 hover:text-white transition-colors"
                    >
                      View all {dashboard.positions.length} positions →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Today's Calendar */}
            {dashboard?.economicCalendar && dashboard.economicCalendar.items.length > 0 && (
              <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5">
                <h3 className="text-sm font-bold text-white mb-3">Today's Calendar</h3>
                <div className="space-y-2">
                  {dashboard.economicCalendar.items.slice(0, 3).map((event) => (
                    <div key={event.id} className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white/50">
                          {new Date(event.timeUtc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          event.importance === "HIGH" ? "bg-red-500/20 text-red-300" :
                          event.importance === "MEDIUM" ? "bg-amber-500/20 text-amber-200" :
                          "bg-slate-500/20 text-slate-300"
                        }`}>
                          {event.importance}
                        </span>
                      </div>
                      <p className="text-white/80">{event.title}</p>
                    </div>
                  ))}
                  <Link
                    href="/calendar"
                    className="text-xs text-white/60 hover:text-white transition-colors block mt-2"
                  >
                    View full calendar →
                  </Link>
                </div>
              </div>
            )}

            {/* Symbol Data (when view=symbol) */}
            {view === "symbol" && ticker && symbolData && (
              <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5">
                <h3 className="text-sm font-bold text-white mb-3">Symbol: {ticker}</h3>
                {symbolData.ohlcv?.latestOhlc && (
                  <div className="space-y-2 text-xs mb-3">
                    <div className="flex justify-between">
                      <span className="text-white/50">Last Price</span>
                      <span className="text-white font-medium">
                        ${symbolData.ohlcv.latestOhlc.close.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                {symbolData.news?.articles && symbolData.news.articles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-white/50 text-xs mb-2">Recent News:</p>
                    {symbolData.news.articles.slice(0, 2).map((article: any) => (
                      <a
                        key={article.id}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-white/70 hover:text-white transition-colors"
                      >
                        {article.headline}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* View Presets */}
            <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5">
              <h3 className="text-sm font-bold text-white mb-3">Quick Views</h3>
              <div className="space-y-2">
                <Link
                  href="/agent?view=insight"
                  className="block text-xs text-white/60 hover:text-white transition-colors"
                >
                  → Performance Insight
                </Link>
                <Link
                  href="/agent?view=plan"
                  className="block text-xs text-white/60 hover:text-white transition-colors"
                >
                  → Trade Plan
                </Link>
                {ticker && (
                  <Link
                    href={`/symbol/${ticker}`}
                    className="block text-xs text-white/60 hover:text-white transition-colors"
                  >
                    → View {ticker} Page
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
