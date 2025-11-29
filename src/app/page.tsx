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
  const [context, setContext] = useState<AgentContextBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [macroCalendar, setMacroCalendar] = useState<MacroCalendarData | null>(null);
  const [tradingContext, setTradingContext] = useState<any>(null);

  // Fetch dashboard context
  useEffect(() => {
    fetchDashboardContext();
    fetchTradingContext();
  }, [symbolContext.symbol, symbolContext.timeframe]);

  async function fetchTradingContext() {
    try {
      const res = await fetch('/api/agent/trading-context');
      const data = await res.json();
      if (data.ok) {
        setTradingContext(data.context);
      }
    } catch (err) {
      // Silent error handling
    }
  }

  async function fetchDashboardContext() {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/mock/dashboard?symbol=${symbolContext.symbol}&timeframe=${symbolContext.timeframe}`
      );
      const data = await res.json();
      if (data.ok) {
        setContext(data.context);
        setAiSummary(data.aiSummary || "");
        setMacroCalendar(data.macroCalendar || null);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard context:", err);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
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
      {/* Background Image with Date - Like health app */}
      <section className="relative h-64 rounded-[2rem] overflow-hidden mb-6 -mx-4">
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

      {/* Today's Summary - Like health app */}
      {aiSummary && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📅</span>
            <h2 className="text-base font-bold text-white">Today</h2>
          </div>
          <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <p className="text-sm text-white/90 leading-relaxed">
              {aiSummary}
            </p>
          </div>
        </section>
      )}

      {/* Trading Context - Read-only display */}
      {tradingContext && (
        <section className="mb-6">
          <h2 className="text-base font-bold text-white mb-3">Trading Context</h2>
          <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)] space-y-4">
            {/* Account */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Account</h3>
              <pre className="text-xs text-white/70 overflow-x-auto">
                {JSON.stringify(tradingContext.account, null, 2)}
              </pre>
            </div>
            {/* Buying Power */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Buying Power</h3>
              <p className="text-sm text-white/70">{tradingContext.account?.buyingPower}</p>
            </div>
            {/* Open PnL */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Open PnL</h3>
              <p className="text-sm text-white/70">{tradingContext.account?.openPnl}</p>
            </div>
            {/* Positions */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Positions</h3>
              <pre className="text-xs text-white/70 overflow-x-auto">
                {JSON.stringify(tradingContext.positions, null, 2)}
              </pre>
            </div>
            {/* Orders */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Orders</h3>
              <pre className="text-xs text-white/70 overflow-x-auto">
                {JSON.stringify(tradingContext.orders, null, 2)}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* Performance Insight Card - Like health app */}
      {context?.strategyConfluence && (
        <section className="mb-6">
          <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">⭐</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Performance Insight</h3>
                <p className="text-xs text-slate-400">{symbolContext.symbol} @ {symbolContext.timeframe}</p>
              </div>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {context.strategyConfluence.notes || "Analyzing market conditions..."}
            </p>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Key Levels:</span>
                <span className="text-sm font-bold text-white">
                  {context.volumeProfile?.pocPrice.toFixed(2) || "—"} (POC)
                </span>
              </div>
              <Link
                href="/agent"
                className="text-xs text-ultra-accent font-semibold hover:underline"
              >
                Open Agent →
              </Link>
            </div>
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
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📊</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/70 leading-relaxed">
                Nothing yet for today. Try syncing or adding a new trade.
              </p>
              <Link href="/trades" className="text-sm text-ultra-accent font-semibold mt-2 inline-block hover:underline">
                Sync now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Macro Calendar - Apple-inspired design */}
      {macroCalendar && macroCalendar.today.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📊</span>
              <h2 className="text-base font-bold text-white">Economic Calendar</h2>
            </div>
            <span className="text-xs text-white/50 font-medium">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          
          <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="divide-y divide-white/10">
              {macroCalendar.today.slice(0, 5).map((event) => {
                const isUpcoming = new Date(event.time) > new Date();
                const isPast = new Date(event.time) < new Date();
                const impactColors = {
                  HIGH: { bg: "from-red-500/20 via-red-500/15 to-orange-500/10", border: "border-red-500/30", dot: "bg-red-500", text: "text-red-300" },
                  MEDIUM: { bg: "from-yellow-500/20 via-yellow-500/15 to-amber-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500", text: "text-yellow-300" },
                  LOW: { bg: "from-slate-500/15 via-slate-500/10 to-slate-500/5", border: "border-slate-500/20", dot: "bg-slate-500", text: "text-slate-300" },
                };
                const colors = impactColors[event.impact];
                
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
                          {event.timeDisplay}
                        </p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                          {event.country}
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
                              {event.name}
                            </h3>
                            {event.description && (
                              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                                {event.description}
                              </p>
                            )}
                          </div>
                          
                          {/* Impact Badge */}
                          <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg bg-gradient-to-br ${colors.bg} border ${colors.border} backdrop-blur-sm`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                              {event.impact}
                            </span>
                          </div>
                        </div>
                        
                        {/* Forecast/Previous/Actual */}
                        {(event.forecast || event.previous || event.actual) && (
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
                            {event.actual && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-white/40 uppercase tracking-wider">Actual</span>
                                <span className="text-xs font-bold text-emerald-400">{event.actual}</span>
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
            {macroCalendar.today.length > 5 && (
              <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02]">
                <p className="text-xs text-white/50 text-center font-medium">
                  +{macroCalendar.today.length - 5} more events today
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
          {context?.marketOverview.benchmarkSymbols.slice(0, 6).map((sym, idx) => (
            <div
              key={sym.symbol}
              className={`relative rounded-xl backdrop-blur-2xl border p-4 space-y-2 transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:scale-[1.02] ${
                sym.pctChange >= 0
                  ? "bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/10 border-emerald-500/30"
                  : "bg-gradient-to-br from-red-500/20 via-orange-500/15 to-amber-500/10 border-red-500/30"
              }`}
            >
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{sym.symbol}</p>
              <p className="text-lg font-bold text-white tracking-tight">{sym.price.toLocaleString()}</p>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-bold ${
                  sym.pctChange >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {sym.pctChange >= 0 ? "↑" : "↓"}
                </span>
                <p
                  className={`text-sm font-bold ${
                    sym.pctChange >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {sym.pctChange >= 0 ? "+" : ""}
                  {sym.pctChange.toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Metrics - Side by Side */}
      <section className="grid grid-cols-2 gap-3 mb-6">
          {/* Setup Confluence */}
          <div className="relative rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-3 space-y-2 transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                context?.strategyConfluence?.setupGrade === "A" ? "bg-emerald-400" :
                context?.strategyConfluence?.setupGrade === "B" ? "bg-yellow-400" : "bg-slate-400"
              }`} />
              <p className="text-[10px] font-bold text-white uppercase tracking-wide">Setup</p>
            </div>
            {context?.strategyConfluence && (
              <>
                <p className="text-2xl font-bold text-white leading-tight">{context.strategyConfluence.setupMatchPct}%</p>
              </>
            )}
          </div>

          {/* Market Regime */}
          <div className="relative rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-3 space-y-2 transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <p className="text-[10px] font-bold text-white uppercase tracking-wide">Regime</p>
            </div>
            {context?.regime && (
              <>
                <p className="text-2xl font-bold text-white leading-tight">{context.regime.trendStatus.replace("_", " ").split(" ")[0]}</p>
              </>
            )}
          </div>

          {/* Volume Delta */}
          <div className="relative rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-3 space-y-2 transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                context?.volume && context.volume.volumeDelta >= 0 ? "bg-emerald-400" : "bg-red-400"
              }`} />
              <p className="text-[10px] font-bold text-white uppercase tracking-wide">Volume</p>
            </div>
            {context?.volume && (
              <>
                <p className={`text-2xl font-bold leading-tight ${
                  context.volume.volumeDelta >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {context.volume.volumeDelta >= 0 ? "+" : ""}
                  {Math.abs(context.volume.volumeDelta).toLocaleString()}
                </p>
              </>
            )}
          </div>

          {/* Behavioural State */}
          <div className="relative rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-3 space-y-2 transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                context?.behavioural?.overtradingFlag === "CRITICAL" ? "bg-red-400" :
                context?.behavioural?.overtradingFlag === "WARNING" ? "bg-yellow-400" : "bg-emerald-400"
              }`} />
              <p className="text-[10px] font-bold text-white uppercase tracking-wide">State</p>
            </div>
            {context?.behavioural && (
              <>
                <p className="text-2xl font-bold text-white leading-tight">
                  {Math.floor(context.behavioural.minutesSinceLastBreak / 60)}h
                </p>
              </>
            )}
          </div>
      </section>

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
            <div className="grid grid-cols-4 gap-4 flex-1">
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Open</p>
                <p className="text-xl font-semibold text-white">{ohlc.open.toFixed(2)}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">High</p>
                <p className="text-xl font-semibold text-emerald-400">{ohlc.high.toFixed(2)}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Low</p>
                <p className="text-xl font-semibold text-red-400">{ohlc.low.toFixed(2)}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Close</p>
                <p className="text-xl font-semibold text-white">{ohlc.close.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Chart */}
            <div className="flex-1 bg-white/3 rounded-2xl p-4 border border-white/5">
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

        {/* Market Regime Card - Landscape */}
        <div className="relative rounded-3xl bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-pink-500/8 backdrop-blur-3xl border border-white/10 p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-white/20 transition-all duration-500">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-6">Market Regime</h3>
          {context?.regime && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Status */}
              <div className="space-y-3">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Status</p>
                <span className={`inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold ${
                  context.regime.trendStatus === "TRENDING_UP"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : context.regime.trendStatus === "TRENDING_DOWN"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-white/10 text-white/80"
                }`}>
                  {context.regime.trendStatus.replace("_", " ")}
                </span>
              </div>
              
              {/* ADX */}
              <div className="space-y-3">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">ADX</p>
                <p className="text-2xl font-semibold text-white">{context.regime.adx.toFixed(1)}</p>
                <ProgressBar value={context.regime.adx} max={50} color={context.regime.adx > 25 ? "#10B981" : context.regime.adx > 20 ? "#F59E0B" : "#6B7280"} height={4} />
              </div>
              
              {/* BB Width */}
              <div className="space-y-3">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">BB Width</p>
                <p className="text-2xl font-semibold text-white">{context.regime.bollingerWidthPercentile.toFixed(0)}%</p>
                <ProgressBar value={context.regime.bollingerWidthPercentile} max={100} color={context.regime.bollingerWidthPercentile > 70 ? "#EF4444" : context.regime.bollingerWidthPercentile > 50 ? "#F59E0B" : "#10B981"} height={4} />
              </div>
              
              {/* Volatility */}
              <div className="space-y-3">
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Volatility</p>
                <span className={`inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold w-full ${
                  context.regime.volatilityState === "EXPLOSIVE"
                    ? "bg-red-500/20 text-red-300"
                    : context.regime.volatilityState === "NORMAL"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-emerald-500/20 text-emerald-300"
                }`}>
                  {context.regime.volatilityState}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Row 3 – Order Flow & Volume */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* DOM Panel */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/25 transition-all duration-300">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">DOM & Order Flow</h3>
          {context?.orderFlow && (
            <div className="space-y-4">
              <div className="text-xs space-y-2">
                <div className="grid grid-cols-3 gap-3 font-semibold text-slate-500 pb-2 border-b border-white/10">
                  <div>Price</div>
                  <div className="text-right">Bid</div>
                  <div className="text-right">Ask</div>
                </div>
                {context.orderFlow.dom.slice(0, 5).map((level, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-3 py-1">
                    <div className="font-mono text-sm text-white font-semibold">{level.price.toFixed(2)}</div>
                    <div className="text-right font-mono text-sm text-ultra-positive font-bold">{level.bidSize}</div>
                    <div className="text-right font-mono text-sm text-ultra-negative font-bold">{level.askSize}</div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Volume Imbalance</span>
                  <span
                    className={`text-sm font-bold ${
                      context.orderFlow.volumeImbalance > 0
                        ? "text-ultra-positive"
                        : "text-ultra-negative"
                    }`}
                  >
                    {(context.orderFlow.volumeImbalance * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Liquidity Above</span>
                  <span className="text-sm font-bold text-white">{context.orderFlow.restingLiquidityAbove}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Liquidity Below</span>
                  <span className="text-sm font-bold text-white">{context.orderFlow.restingLiquidityBelow}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Volume Delta & CVD */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/25 transition-all duration-300">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Volume Delta & CVD</h3>
          {context?.volume && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Bar Volume</p>
                  <p className="text-2xl font-bold text-white tracking-tight">{context.volume.barVolume.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Volume Delta</p>
                  <p
                    className={`text-2xl font-bold tracking-tight ${
                      context.volume.volumeDelta >= 0
                        ? "text-ultra-positive"
                        : "text-ultra-negative"
                    }`}
                  >
                    {context.volume.volumeDelta >= 0 ? "+" : ""}
                    {context.volume.volumeDelta.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">CVD</span>
                  <span
                    className={`text-base font-bold ${
                      context.volume.cvd >= 0 ? "text-ultra-positive" : "text-ultra-negative"
                    }`}
                  >
                    {context.volume.cvd >= 0 ? "+" : ""}
                    {context.volume.cvd.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Tape Speed</span>
                  <span className="text-base font-bold text-white">{context.volume.tapeSpeed} ticks/s</span>
                </div>
              </div>
              <div className="pt-2">
                <p className={`text-xs font-semibold ${
                  context.volume.volumeDelta < 0 ? "text-ultra-negative" : "text-ultra-positive"
                }`}>
                  {context.volume.volumeDelta < 0
                    ? "↓ Aggressive selling pressure"
                    : "↑ Aggressive buying pressure"}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Row 4 – Execution & Risk */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Broker Execution Quality */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/25 transition-all duration-300">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Execution Quality</h3>
          {context?.execution && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Avg Slippage</p>
                  <p className="text-xl font-bold text-white">{context.execution.avgSlippagePips.toFixed(2)} pips</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Max Slippage</p>
                  <p className="text-xl font-bold text-ultra-negative">{context.execution.maxSlippagePips.toFixed(2)} pips</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Fill Rate</p>
                  <p className="text-xl font-bold text-ultra-positive">{context.execution.fillRatePct}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Rejection Rate</p>
                  <p className="text-xl font-bold text-white">{context.execution.rejectionRatePct}%</p>
                </div>
              </div>
              <div className="pt-3 border-t border-white/10">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {context.execution.spreadExpansionNotes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Correlation & Exposure */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/25 transition-all duration-300">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Correlation & Exposure</h3>
          {context?.correlation && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {context.correlation.correlations.slice(0, 3).map((corr, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1.5">
                    <span className="text-sm font-medium text-white">{corr.symbol}</span>
                    <span
                      className={`text-sm font-bold ${
                        Math.abs(corr.correlation) > 0.7
                          ? corr.correlation > 0
                            ? "text-ultra-positive"
                            : "text-ultra-negative"
                          : "text-slate-400"
                      }`}
                    >
                      {corr.correlation > 0 ? "+" : ""}
                      {corr.correlation.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">USD Exposure</span>
                  <span className="text-base font-bold text-white">
                    {context.correlation.portfolioUsdExposurePct.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Beta to Equities</span>
                  <span className="text-base font-bold text-white">
                    {context.correlation.portfolioBetaToEquities.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {context.correlation.notes}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Row 5 – Volume Profile & Liquidity */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Volume Profile Snapshot */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/25 transition-all duration-300">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Volume Profile</h3>
          {context?.volumeProfile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">POC</p>
                  <p className="text-xl font-bold text-white">{context.volumeProfile.pocPrice.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Value Area</p>
                  <p className="text-sm font-bold text-white leading-tight">
                    {context.volumeProfile.valueAreaHigh.toFixed(2)} /{" "}
                    {context.volumeProfile.valueAreaLow.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-white/10">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">High Volume Nodes</p>
                <div className="flex flex-wrap gap-1.5">
                  {context.volumeProfile.highVolumeNodes.map((price, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-ultra-accent/25 text-ultra-accent text-[10px] font-bold border border-ultra-accent/30"
                    >
                      {price.toFixed(1)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Low Volume Areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {context.volumeProfile.lowVolumeAreas.map((price, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-500/20 text-slate-400 text-[10px] font-bold border border-slate-500/30"
                    >
                      {price.toFixed(1)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Liquidity Zones */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/25 transition-all duration-300">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Liquidity Zones</h3>
          {context?.liquidityMap && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2.5">Above Price</p>
                <div className="space-y-2">
                  {context.liquidityMap.zones
                    .filter((z) => z.direction === "above")
                    .map((zone, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1.5">
                        <span className="text-sm font-semibold text-white">{zone.price.toFixed(2)}</span>
                        <span className="text-xs text-slate-400 capitalize px-2 py-0.5 rounded bg-white/5">{zone.type}</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="pt-3 border-t border-white/10">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2.5">Below Price</p>
                <div className="space-y-2">
                  {context.liquidityMap.zones
                    .filter((z) => z.direction === "below")
                    .map((zone, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1.5">
                        <span className="text-sm font-semibold text-white">{zone.price.toFixed(2)}</span>
                        <span className="text-xs text-slate-400 capitalize px-2 py-0.5 rounded bg-white/5">{zone.type}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
