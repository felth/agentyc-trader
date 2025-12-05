"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type {
  MarketSymbol,
  SymbolContext,
  OHLCData,
  MarketRegimeData,
  OrderFlowData,
  VolumeData,
  ExecutionStats,
  CorrelationData,
  VolumeProfileData,
  LiquidityMapData,
  StrategyConfluenceData,
  BehaviouralStateData,
  AgentInsight,
  AgentContextBlock,
  MacroCalendarData,
  MacroCalendarEvent,
} from "@/types/trading";
import type { TradePlan } from "@/lib/agent/tradeSchema";
import { TradePlanCard } from "@/components/TradePlanCard";
import type { DashboardSnapshot } from "@/lib/data/dashboard";

// Simple Sparkline Chart Component
function SparklineChart({ values, color = "#32D74B", width = 80, height = 30 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  
  const points = values.map((val, idx) => {
    const x = idx * stepX;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Progress Bar Component
function ProgressBar({ value, max = 100, color = "#32D74B", height = 4 }: { value: number; max?: number; color?: string; height?: number }) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="relative w-full rounded-full overflow-hidden" style={{ height: `${height}px`, backgroundColor: "rgba(255,255,255,0.1)" }}>
      <div
        className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function HomePage() {
  const pathname = usePathname();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
  // State
  const [symbolContext, setSymbolContext] = useState<SymbolContext>({
    symbol: "XAUUSD",
    timeframe: "H1",
    timestamp: new Date().toISOString(),
  });
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [tradePlan, setTradePlan] = useState<TradePlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [performanceInsight, setPerformanceInsight] = useState<{ insightText: string; keyLevels: string[]; regime: string; setupScore: number; volumeScore: number } | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [ibkrStatus, setIbkrStatus] = useState<{
    ok: boolean;
    bridgeOk: boolean;
    gatewayAuthenticated: boolean;
  } | null>(null);

  // Fetch dashboard snapshot and performance insight
  useEffect(() => {
    fetchDashboard();
    fetchPerformanceInsight();
    fetchIbkrStatus();
  }, []);

  async function fetchDashboard() {
    try {
      setLoadingDashboard(true);
      setDashboardError(null);
      const res = await fetch('/api/dashboard/home');
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setDashboard(data.snapshot);
      } else {
        setDashboardError(data.error || "Failed to load dashboard");
      }
    } catch (err: any) {
      setDashboardError(err?.message || "Failed to fetch dashboard");
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function fetchTradePlan() {
    try {
      setLoadingPlan(true);
      const res = await fetch('/api/agent/trade-plan');
      const data = await res.json();
      if (data.ok) {
        // Always set the plan, even if orders array is empty
        setTradePlan(data.plan || null);
      } else {
        // On error, show error state but don't reset plan
        console.error('Failed to fetch trade plan:', data.error);
      }
    } catch (err) {
      console.error('Failed to fetch trade plan:', err);
    } finally {
      setLoadingPlan(false);
    }
  }

  async function fetchPerformanceInsight() {
    try {
      setLoadingInsight(true);
      const res = await fetch('/api/agent/performance');
      const data = await res.json();
      if (data.ok && data.insight) {
        setPerformanceInsight(data.insight);
      }
    } catch (err) {
      // Silent error - performance insight is optional
    } finally {
      setLoadingInsight(false);
    }
  }

  async function fetchIbkrStatus() {
    try {
      const res = await fetch('/api/ibkr/status');
      const data = await res.json();
      if (data.ok) {
        const bridgeOk = data.bridge?.ok === true;
        const gatewayAuthenticated = data.gateway?.ok === true && data.gateway?.status?.authenticated === true;
        setIbkrStatus({
          ok: true,
          bridgeOk,
          gatewayAuthenticated,
        });
      } else {
        setIbkrStatus({
          ok: false,
          bridgeOk: false,
          gatewayAuthenticated: false,
        });
      }
    } catch (err) {
      setIbkrStatus({
        ok: false,
        bridgeOk: false,
        gatewayAuthenticated: false,
      });
    }
  }

  function handleReconnectIbkr() {
    window.open('https://gateway.agentyc.app', '_blank');
    // Optionally poll status after opening the reconnect page
    setTimeout(() => {
      let pollCount = 0;
      const maxPolls = 12; // Poll for 1 minute (12 * 5s = 60s)
      const pollInterval = setInterval(() => {
        pollCount++;
        fetchIbkrStatus();
        if (pollCount >= maxPolls || (ibkrStatus?.bridgeOk && ibkrStatus?.gatewayAuthenticated)) {
          clearInterval(pollInterval);
        }
      }, 5000);
    }, 3000);
  }

  const handleSymbolChange = (symbol: string) => {
    setSymbolContext({ ...symbolContext, symbol });
  };

  const handleTimeframeChange = (timeframe: string) => {
    setSymbolContext({ ...symbolContext, timeframe });
  };

  // Mock OHLC data (will come from context later)
  const ohlc: OHLCData = {
    open: 2382.5,
    high: 2387.2,
    low: 2381.1,
    close: 2385.8,
    spread: 0.25,
  };

  if (loadingDashboard) {
    return (
      <main className="flex items-center justify-center min-h-screen max-w-md mx-auto px-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-ultra-accent/30 border-t-ultra-accent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dayStr = today.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <main className="space-y-6 pt-2 pb-24 max-w-md mx-auto px-4">
      {/* IBKR Connection Status Banner */}
      {ibkrStatus && (!ibkrStatus.bridgeOk || !ibkrStatus.gatewayAuthenticated) && (
        <div className="relative rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 backdrop-blur-2xl border border-amber-500/30 p-4 mb-4 shadow-[0_8px_24px_rgba(245,99,0,0.2)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-bold text-amber-400">IBKR not connected</h3>
              <p className="text-xs text-amber-300/90 leading-relaxed">
                To refresh your live brokerage data, tap Reconnect and complete login in the IBKR app.
              </p>
            </div>
            <button
              onClick={handleReconnectIbkr}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors duration-200 whitespace-nowrap"
            >
              Reconnect IBKR
            </button>
          </div>
        </div>
      )}
      
      {/* Background Image with Date - Like health app */}
      <section className="relative h-48 rounded-[2rem] overflow-hidden mb-5 -mx-4">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-home.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="relative h-full flex flex-col px-6 py-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white/90 tracking-tight">AGENTYC</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <span className="text-sm">🔍</span>
              </button>
              <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center relative">
                <span className="text-sm">🔔</span>
              </button>
              <Link
                href="/profile"
                className={[
                  "w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center",
                  pathname === "/profile"
                    ? "bg-ultra-accent/20 border-ultra-accent/50"
                    : "bg-white/5 border-white/10"
                ].join(" ")}
                aria-label="Settings"
              >
                <span className="text-sm">⚙️</span>
              </Link>
            </div>
          </div>

          {/* Large Date Display - Like health app */}
          <div className="mt-auto">
            <p className="text-6xl font-bold text-white/90 tracking-tight mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {dateStr}
            </p>
            <p className="text-sm text-white/70 font-medium">{dayStr}</p>
            <p className="text-xs text-white/60 mt-1">{time}</p>
          </div>
        </div>
      </section>


      {/* Trading Context - Read-only display */}
      {dashboard && (
        <section className="mb-6">
          <h2 className="text-base font-bold text-white mb-3">Trading Context</h2>
          <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)] space-y-4">
            {/* Account */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Account</h3>
              <pre className="text-xs text-white/70 overflow-x-auto">
                {JSON.stringify(dashboard.account, null, 2)}
              </pre>
            </div>
            {/* Buying Power */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Buying Power</h3>
              <p className="text-sm text-white/70">{dashboard.account?.buyingPower}</p>
            </div>
            {/* Unrealized PnL */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Unrealized PnL</h3>
              <p className="text-sm text-white/70">{dashboard.account?.unrealizedPnl}</p>
            </div>
            {/* Positions */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Positions</h3>
              <pre className="text-xs text-white/70 overflow-x-auto">
                {JSON.stringify(dashboard.positions, null, 2)}
              </pre>
            </div>
            {/* Orders */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Orders</h3>
              <pre className="text-xs text-white/70 overflow-x-auto">
                {JSON.stringify(dashboard.orders, null, 2)}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* Trade Plan Section */}
      <TradePlanCard
        plan={tradePlan}
        loading={loadingPlan}
        onGenerate={fetchTradePlan}
      />

      {/* Performance Insight Card - Like health app */}
      {(loadingInsight || performanceInsight) && (
        <section className="mb-6">
          <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">⭐</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Performance Insight</h3>
                <p className="text-xs text-slate-400">Market Analysis</p>
              </div>
            </div>
            {loadingInsight ? (
              <p className="text-sm text-slate-200 leading-relaxed">Analyzing your performance…</p>
            ) : performanceInsight ? (
              <>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {performanceInsight.insightText || "Analyzing market conditions..."}
                </p>
                {performanceInsight.keyLevels && performanceInsight.keyLevels.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Key Levels:</span>
                      <span className="text-sm font-bold text-white">
                        {performanceInsight.keyLevels.slice(0, 3).join(", ")}
                      </span>
                    </div>
                    <Link
                      href="/agent"
                      className="text-xs text-ultra-accent font-semibold hover:underline"
                    >
                      Open Agent →
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-200 leading-relaxed">Performance insight unavailable</p>
            )}
          </div>
        </section>
      )}

      {/* Today's Activity Section - Like health app */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">Today's Activity</h2>
          <Link href="/trades" className="text-sm text-white/70 font-medium hover:text-white transition-colors">
            Add New
          </Link>
        </div>
        <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          {dashboard?.dailyActivity ? (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📊</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white/70 leading-relaxed">
                  {dashboard.dailyActivity.notes}
                </p>
                {dashboard.dailyActivity.hasTradesToday && (
                  <Link href="/trades" className="text-sm text-ultra-accent font-semibold mt-2 inline-block hover:underline">
                    View trades →
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📊</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white/70 leading-relaxed">
                  Loading activity...
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Economic Calendar - Apple-inspired design */}
      {dashboard?.economicCalendar && dashboard.economicCalendar.items.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📊</span>
              <h2 className="text-base font-bold text-white">Economic Calendar</h2>
            </div>
            <span className="text-xs text-white/50 font-medium">
              {new Date(dashboard.economicCalendar.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          
          <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="divide-y divide-white/10">
              {dashboard.economicCalendar.items.slice(0, 5).map((event) => {
                const eventTime = new Date(event.timeUtc);
                const isUpcoming = eventTime > new Date();
                const isPast = eventTime < new Date();
                const timeDisplay = eventTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                const impactColors = {
                  HIGH: { bg: "from-red-500/20 via-red-500/15 to-orange-500/10", border: "border-red-500/30", dot: "bg-red-500", text: "text-red-300" },
                  MEDIUM: { bg: "from-yellow-500/20 via-yellow-500/15 to-amber-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500", text: "text-yellow-300" },
                  LOW: { bg: "from-slate-500/15 via-slate-500/10 to-slate-500/5", border: "border-slate-500/20", dot: "bg-slate-500", text: "text-slate-300" },
                };
                const colors = impactColors[event.importance];
                
                return (
                  <div
                    key={event.id}
                    className={`relative px-5 py-4 transition-all duration-300 hover:bg-white/[0.03] ${
                      isPast ? "opacity-60" : ""
                    }`}
                  >
                    {/* Time & Impact Indicator */}
                    <div className="flex items-start gap-4">
                      {/* Time Column */}
                      <div className="flex-shrink-0 w-20">
                        <p className={`text-sm font-semibold ${isUpcoming ? "text-white" : "text-white/50"}`}>
                          {timeDisplay}
                        </p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                          {event.region}
                        </p>
                      </div>
                      
                      {/* Impact Dot */}
                      <div className="flex-shrink-0 pt-1">
                        <div className={`w-2 h-2 rounded-full ${colors.dot} ${isUpcoming ? "ring-2 ring-offset-2 ring-offset-black/20" : ""}`} />
                      </div>
                      
                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-semibold leading-tight ${isUpcoming ? "text-white" : "text-white/70"}`}>
                              {event.title}
                            </h3>
                          </div>
                          
                          {/* Impact Badge */}
                          <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg bg-gradient-to-br ${colors.bg} border ${colors.border} backdrop-blur-sm`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                              {event.importance}
                            </span>
                          </div>
                        </div>
                        
                        {/* Forecast/Previous */}
                        {(event.forecast || event.previous) && (
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
                            {event.forecast && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-white/40 uppercase tracking-wider">Forecast</span>
                                <span className="text-xs font-semibold text-white/70">{event.forecast}</span>
                              </div>
                            )}
                            {event.previous && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-white/40 uppercase tracking-wider">Previous</span>
                                <span className="text-xs font-semibold text-white/50">{event.previous}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Subtle gradient accent on hover */}
                    {isUpcoming && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${colors.bg} opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg`} />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Footer - Show more indicator */}
            {dashboard.economicCalendar.items.length > 5 && (
              <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02]">
                <p className="text-xs text-white/50 text-center font-medium">
                  +{dashboard.economicCalendar.items.length - 5} more events today
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Market Overview */}
      <section className="space-y-4 mb-6">
        <h2 className="text-base font-bold text-white">Market Overview</h2>
        <div className="grid grid-cols-3 gap-3">
          {dashboard?.marketOverview?.tiles ? (
            dashboard.marketOverview.tiles.map((tile) => (
              <div
                key={tile.symbol}
                className={`relative rounded-xl backdrop-blur-2xl border p-4 space-y-2 transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:scale-[1.02] ${
                  (tile.changePct ?? 0) >= 0
                    ? "bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/10 border-emerald-500/30"
                    : "bg-gradient-to-br from-red-500/20 via-orange-500/15 to-amber-500/10 border-red-500/30"
                }`}
              >
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{tile.label}</p>
                <p className="text-lg font-bold text-white tracking-tight">
                  {tile.value !== null ? tile.value.toLocaleString(undefined, {
                    minimumFractionDigits: tile.label === "DXY" || tile.label === "VIX" ? 2 : 0,
                    maximumFractionDigits: tile.label === "XAUUSD" || tile.label === "BTCUSD" ? 2 : 2,
                  }) : "—"}
                </p>
                {tile.changePct !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${
                      tile.changePct >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {tile.changePct >= 0 ? "↑" : "↓"}
                    </span>
                    <p
                      className={`text-sm font-bold ${
                        tile.changePct >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {tile.changePct >= 0 ? "+" : ""}
                      {tile.changePct.toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            // Loading state
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="relative rounded-xl backdrop-blur-2xl border border-white/10 p-4 space-y-2 bg-white/5 animate-pulse"
              >
                <div className="h-3 w-12 bg-white/10 rounded" />
                <div className="h-6 w-20 bg-white/10 rounded" />
                <div className="h-4 w-16 bg-white/10 rounded" />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Key Metrics - Side by Side */}
      {dashboard?.volumeDelta && (
        <section className="grid grid-cols-2 gap-3 mb-6">
          {/* Volume Delta Quick View */}
          <div className="relative rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-3 space-y-2 transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                (dashboard.volumeDelta.volumeDelta ?? 0) >= 0 ? "bg-emerald-400" : "bg-red-400"
              }`} />
              <p className="text-[10px] font-bold text-white uppercase tracking-wide">Volume</p>
            </div>
            {dashboard.volumeDelta.volumeDelta !== null && (
              <p className={`text-2xl font-bold leading-tight ${
                dashboard.volumeDelta.volumeDelta >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                {dashboard.volumeDelta.volumeDelta >= 0 ? "+" : ""}
                {Math.abs(dashboard.volumeDelta.volumeDelta).toLocaleString()}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Focus Symbol & Regime (Detailed) - Apple-style Landscape Cards Stacked */}
      <section className="space-y-6 mb-8">
        {/* XAUUSD Card - Landscape */}
        <div className="relative rounded-3xl bg-gradient-to-br from-ultra-accent/15 via-orange-500/10 to-amber-500/8 backdrop-blur-3xl border border-white/10 p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-white/20 transition-all duration-500">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <select
                value={symbolContext.symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="text-xl font-semibold text-white bg-white/5 border-0 rounded-2xl px-6 py-3 focus:outline-none focus:ring-2 focus:ring-ultra-accent/30 transition-all appearance-none cursor-pointer"
              >
                <option value="XAUUSD">XAUUSD</option>
                <option value="EURUSD">EURUSD</option>
                <option value="BTCUSD">BTCUSD</option>
                <option value="SPX">SPX</option>
              </select>
              <div className="flex gap-1.5 items-center">
                {["M15", "H1", "H4", "D1"].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => handleTimeframeChange(tf)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      symbolContext.timeframe === tf
                        ? "bg-white/20 text-white"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* OHLC & Chart - Horizontal Layout */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* OHLC Values */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 flex-1 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium whitespace-nowrap">Open</p>
                <p className="text-xl font-semibold text-white truncate">{ohlc.open.toFixed(2)}</p>
              </div>
              <div className="space-y-1.5 min-w-0">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium whitespace-nowrap">High</p>
                <p className="text-xl font-semibold text-emerald-400 truncate">{ohlc.high.toFixed(2)}</p>
              </div>
              <div className="space-y-1.5 min-w-0">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium whitespace-nowrap">Low</p>
                <p className="text-xl font-semibold text-red-400 truncate">{ohlc.low.toFixed(2)}</p>
              </div>
              <div className="space-y-1.5 min-w-0">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium whitespace-nowrap">Close</p>
                <p className="text-xl font-semibold text-white truncate">{ohlc.close.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Chart */}
            <div className="flex-1 bg-white/3 rounded-2xl p-4 border border-white/5 min-w-0">
              <div className="w-full h-full min-h-[60px]">
                <SparklineChart 
                  values={[ohlc.open, ohlc.low, ohlc.high, ohlc.close]} 
                  color={ohlc.close >= ohlc.open ? "#10B981" : "#EF4444"} 
                  width={100} 
                  height={60} 
                />
              </div>
            </div>
          </div>
          
          {ohlc.spread && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/50 font-medium">Spread</p>
                <p className="text-sm font-semibold text-white">{ohlc.spread} pips</p>
              </div>
            </div>
          )}
        </div>

      </section>

      {/* Row 3 – Order Flow & Volume */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* DOM Panel */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/25 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">DOM & Order Flow</h3>
            {dashboard?.dom?.source && (
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{dashboard.dom.source}</span>
            )}
          </div>
          {loadingDashboard ? (
            <div className="space-y-3">
              <div className="h-4 bg-white/10 rounded animate-pulse" />
              <div className="h-4 bg-white/10 rounded animate-pulse" />
              <div className="h-4 bg-white/10 rounded animate-pulse" />
            </div>
          ) : dashboard?.dom ? (
            <div className="space-y-4">
              {dashboard.dom.levels.length > 0 ? (
                <>
                  <div className="text-xs space-y-2">
                    <div className="grid grid-cols-3 gap-3 font-semibold text-slate-500 pb-2 border-b border-white/10">
                      <div>Price</div>
                      <div className="text-right">Bid</div>
                      <div className="text-right">Ask</div>
                    </div>
                    {dashboard.dom.levels.slice(0, 5).map((level, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-3 py-1">
                        <div className="font-mono text-sm text-white font-semibold">{level.price.toFixed(2)}</div>
                        <div className="text-right font-mono text-sm text-ultra-positive font-bold">{level.bidSize}</div>
                        <div className="text-right font-mono text-sm text-ultra-negative font-bold">{level.askSize}</div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-white/10 space-y-2.5">
                    {dashboard.dom.volumeImbalancePct !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-medium">Volume Imbalance</span>
                        <span
                          className={`text-sm font-bold ${
                            dashboard.dom.volumeImbalancePct > 0
                              ? "text-ultra-positive"
                              : "text-ultra-negative"
                          }`}
                        >
                          {dashboard.dom.volumeImbalancePct > 0 ? "+" : ""}
                          {dashboard.dom.volumeImbalancePct.toFixed(0)}%
                        </span>
                      </div>
                    )}
                    {dashboard.dom.liquidityAbove !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-medium">Liquidity Above</span>
                        <span className="text-sm font-bold text-white">{dashboard.dom.liquidityAbove}</span>
                      </div>
                    )}
                    {dashboard.dom.liquidityBelow !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-medium">Liquidity Below</span>
                        <span className="text-sm font-bold text-white">{dashboard.dom.liquidityBelow}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-white/50">DOM data unavailable</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-white/50">DOM data unavailable</p>
          )}
        </div>

        {/* Volume Delta & CVD */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/25 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Volume Delta & CVD</h3>
            {dashboard?.volumeDelta?.source && (
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{dashboard.volumeDelta.source}</span>
            )}
          </div>
          {loadingDashboard ? (
            <div className="space-y-3">
              <div className="h-8 bg-white/10 rounded animate-pulse" />
              <div className="h-8 bg-white/10 rounded animate-pulse" />
            </div>
          ) : dashboard?.volumeDelta ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Bar Volume</p>
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {dashboard.volumeDelta.barVolume !== null ? dashboard.volumeDelta.barVolume.toLocaleString() : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Volume Delta</p>
                  <p
                    className={`text-2xl font-bold tracking-tight ${
                      (dashboard.volumeDelta.volumeDelta ?? 0) >= 0
                        ? "text-ultra-positive"
                        : "text-ultra-negative"
                    }`}
                  >
                    {dashboard.volumeDelta.volumeDelta !== null ? (
                      <>
                        {(dashboard.volumeDelta.volumeDelta >= 0 ? "+" : "")}
                        {dashboard.volumeDelta.volumeDelta.toLocaleString()}
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                {dashboard.volumeDelta.cvd !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">CVD</span>
                    <span
                      className={`text-base font-bold ${
                        dashboard.volumeDelta.cvd >= 0 ? "text-ultra-positive" : "text-ultra-negative"
                      }`}
                    >
                      {dashboard.volumeDelta.cvd >= 0 ? "+" : ""}
                      {dashboard.volumeDelta.cvd.toLocaleString()}
                    </span>
                  </div>
                )}
                {dashboard.volumeDelta.tapeSpeed !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">Tape Speed</span>
                    <span className="text-base font-bold text-white">{dashboard.volumeDelta.tapeSpeed} ticks/s</span>
                  </div>
                )}
              </div>
              {dashboard.volumeDelta.notes && (
                <div className="pt-2">
                  <p className="text-xs text-white/50">{dashboard.volumeDelta.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-white/50">Volume data unavailable</p>
          )}
        </div>
      </section>

      {/* Row 4 – Execution & Risk */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Broker Execution Quality */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/25 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Execution Quality</h3>
            {dashboard?.executionQuality?.source && (
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{dashboard.executionQuality.source}</span>
            )}
          </div>
          {loadingDashboard ? (
            <div className="space-y-3">
              <div className="h-8 bg-white/10 rounded animate-pulse" />
              <div className="h-8 bg-white/10 rounded animate-pulse" />
            </div>
          ) : dashboard?.executionQuality ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Avg Slippage</p>
                  <p className="text-xl font-bold text-white">
                    {dashboard.executionQuality.avgSlippagePips !== null ? `${dashboard.executionQuality.avgSlippagePips.toFixed(2)} pips` : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Max Slippage</p>
                  <p className="text-xl font-bold text-ultra-negative">
                    {dashboard.executionQuality.maxSlippagePips !== null ? `${dashboard.executionQuality.maxSlippagePips.toFixed(2)} pips` : "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Fill Rate</p>
                  <p className="text-xl font-bold text-ultra-positive">
                    {dashboard.executionQuality.fillRatePct !== null ? `${dashboard.executionQuality.fillRatePct}%` : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Rejection Rate</p>
                  <p className="text-xl font-bold text-white">
                    {dashboard.executionQuality.rejectionRatePct !== null ? `${dashboard.executionQuality.rejectionRatePct}%` : "—"}
                  </p>
                </div>
              </div>
              {dashboard.executionQuality.notes && (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {dashboard.executionQuality.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-white/50">Execution stats unavailable</p>
          )}
        </div>

        {/* Correlation & Exposure */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/25 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Correlation & Exposure</h3>
            {dashboard?.correlationExposure?.source && (
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{dashboard.correlationExposure.source}</span>
            )}
          </div>
          {loadingDashboard ? (
            <div className="space-y-3">
              <div className="h-4 bg-white/10 rounded animate-pulse" />
              <div className="h-4 bg-white/10 rounded animate-pulse" />
              <div className="h-4 bg-white/10 rounded animate-pulse" />
            </div>
          ) : dashboard?.correlationExposure ? (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {dashboard.correlationExposure.dxyCorr !== null && (
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-sm font-medium text-white">DXY</span>
                    <span
                      className={`text-sm font-bold ${
                        Math.abs(dashboard.correlationExposure.dxyCorr) > 0.7
                          ? dashboard.correlationExposure.dxyCorr > 0
                            ? "text-ultra-positive"
                            : "text-ultra-negative"
                          : "text-slate-400"
                      }`}
                    >
                      {dashboard.correlationExposure.dxyCorr > 0 ? "+" : ""}
                      {dashboard.correlationExposure.dxyCorr.toFixed(2)}
                    </span>
                  </div>
                )}
                {dashboard.correlationExposure.spxCorr !== null && (
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-sm font-medium text-white">SPX</span>
                    <span
                      className={`text-sm font-bold ${
                        Math.abs(dashboard.correlationExposure.spxCorr) > 0.7
                          ? dashboard.correlationExposure.spxCorr > 0
                            ? "text-ultra-positive"
                            : "text-ultra-negative"
                          : "text-slate-400"
                      }`}
                    >
                      {dashboard.correlationExposure.spxCorr > 0 ? "+" : ""}
                      {dashboard.correlationExposure.spxCorr.toFixed(2)}
                    </span>
                  </div>
                )}
                {dashboard.correlationExposure.btcCorr !== null && (
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-sm font-medium text-white">BTC</span>
                    <span
                      className={`text-sm font-bold ${
                        Math.abs(dashboard.correlationExposure.btcCorr) > 0.7
                          ? dashboard.correlationExposure.btcCorr > 0
                            ? "text-ultra-positive"
                            : "text-ultra-negative"
                          : "text-slate-400"
                      }`}
                    >
                      {dashboard.correlationExposure.btcCorr > 0 ? "+" : ""}
                      {dashboard.correlationExposure.btcCorr.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                {dashboard.correlationExposure.usdExposurePct !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">USD Exposure</span>
                    <span className="text-base font-bold text-white">
                      {dashboard.correlationExposure.usdExposurePct.toFixed(0)}%
                    </span>
                  </div>
                )}
                {dashboard.correlationExposure.betaToEquities !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">Beta to Equities</span>
                    <span className="text-base font-bold text-white">
                      {dashboard.correlationExposure.betaToEquities.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              {dashboard.correlationExposure.notes && (
                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  {dashboard.correlationExposure.notes}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-white/50">Correlation data unavailable</p>
          )}
        </div>
      </section>

      {/* Row 5 – Volume Profile & Liquidity */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Volume Profile Snapshot */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/25 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Volume Profile</h3>
            {dashboard?.volumeProfile?.source && (
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{dashboard.volumeProfile.source}</span>
            )}
          </div>
          {loadingDashboard ? (
            <div className="space-y-3">
              <div className="h-8 bg-white/10 rounded animate-pulse" />
              <div className="h-12 bg-white/10 rounded animate-pulse" />
            </div>
          ) : dashboard?.volumeProfile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">POC</p>
                  <p className="text-xl font-bold text-white">
                    {dashboard.volumeProfile.poc !== null ? dashboard.volumeProfile.poc.toFixed(2) : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Value Area</p>
                  <p className="text-sm font-bold text-white leading-tight">
                    {dashboard.volumeProfile.valueAreaHigh !== null && dashboard.volumeProfile.valueAreaLow !== null
                      ? `${dashboard.volumeProfile.valueAreaHigh.toFixed(2)} / ${dashboard.volumeProfile.valueAreaLow.toFixed(2)}`
                      : "—"}
                  </p>
                </div>
              </div>
              {dashboard.volumeProfile.highVolumeNodes.length > 0 && (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">High Volume Nodes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dashboard.volumeProfile.highVolumeNodes.map((price, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-ultra-accent/25 text-ultra-accent text-[10px] font-bold border border-ultra-accent/30"
                      >
                        {price.toFixed(1)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dashboard.volumeProfile.lowVolumeAreas.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Low Volume Areas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dashboard.volumeProfile.lowVolumeAreas.map((price, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-slate-500/20 text-slate-400 text-[10px] font-bold border border-slate-500/30"
                      >
                        {price.toFixed(1)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-white/50">Volume profile unavailable</p>
          )}
        </div>

        {/* Liquidity Zones */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/25 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Liquidity Zones</h3>
            {dashboard?.liquidityZones?.source && (
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{dashboard.liquidityZones.source}</span>
            )}
          </div>
          {loadingDashboard ? (
            <div className="space-y-3">
              <div className="h-20 bg-white/10 rounded animate-pulse" />
            </div>
          ) : dashboard?.liquidityZones ? (
            <div className="space-y-4">
              {dashboard.liquidityZones.abovePrice.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2.5">Above Price</p>
                  <div className="space-y-2">
                    {dashboard.liquidityZones.abovePrice.map((zone, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1.5">
                        <span className="text-sm font-semibold text-white">{zone.level.toFixed(2)}</span>
                        <span className="text-xs text-slate-400 capitalize px-2 py-0.5 rounded bg-white/5">{zone.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {dashboard.liquidityZones.belowPrice.length > 0 && (
                <div className={dashboard.liquidityZones.abovePrice.length > 0 ? "pt-3 border-t border-white/10" : ""}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2.5">Below Price</p>
                  <div className="space-y-2">
                    {dashboard.liquidityZones.belowPrice.map((zone, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1.5">
                        <span className="text-sm font-semibold text-white">{zone.level.toFixed(2)}</span>
                        <span className="text-xs text-slate-400 capitalize px-2 py-0.5 rounded bg-white/5">{zone.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {dashboard.liquidityZones.abovePrice.length === 0 && dashboard.liquidityZones.belowPrice.length === 0 && (
                <p className="text-xs text-white/50">No liquidity zones available</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-white/50">Liquidity zones unavailable</p>
          )}
        </div>
      </section>
    </main>
  );
}
