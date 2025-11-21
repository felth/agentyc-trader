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

  // Fetch dashboard context
  useEffect(() => {
    fetchDashboardContext();
  }, [symbolContext.symbol, symbolContext.timeframe]);

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

  return (
    <main className="space-y-6 pt-4 pb-24 max-w-md mx-auto px-4">
      {/* Header / App Shell */}
      <section className="relative h-48 rounded-[2rem] overflow-hidden mb-6 group">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-home.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,99,0,0.1),_transparent_70%)]" />
        
        <div className="relative h-full flex flex-col justify-between px-6 py-5">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">AGENTYC</span>
              <span className="text-xs text-white/60 font-medium">TRADER</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/agent"
                className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
                aria-label="Agent"
              >
                <span className="text-base">🤖</span>
              </Link>
              <Link
                href="/library"
                className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
                aria-label="Library"
              >
                <span className="text-base">📚</span>
              </Link>
              <Link
                href="/profile"
                className={[
                  "w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center hover:bg-white/10 transition-all active:scale-95",
                  pathname === "/profile"
                    ? "bg-ultra-accent/20 border-ultra-accent/50"
                    : "bg-white/5 border-white/10"
                ].join(" ")}
                aria-label="Settings"
              >
                <span className="text-base">⚙️</span>
              </Link>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Trading Dashboard</p>
            <h1 className="text-2xl font-bold tracking-tight text-white">Live Cockpit</h1>
            <p className="text-sm text-white/70">{time}</p>
          </div>
        </div>
      </section>

      {/* AI Summary Section - Like health app motivational text */}
      {aiSummary && (
        <section className="mb-6">
          <div className="rounded-2xl bg-gradient-to-br from-ultra-accent/25 via-orange-500/15 to-amber-500/10 backdrop-blur-xl border border-ultra-accent/40 p-6 shadow-[0_12px_40px_rgba(245,99,0,0.25)] hover:shadow-[0_16px_48px_rgba(245,99,0,0.35)] transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(245,99,0,0.3)]">
                <span className="text-2xl">🤖</span>
              </div>
              <div className="flex-1">
                <p className="text-base text-white leading-relaxed font-medium">
                  {aiSummary}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Row 1 – Market Overview */}
      <section className="space-y-4 mb-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-white">Market Overview</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {context?.marketOverview.benchmarkSymbols.slice(0, 6).map((sym, idx) => (
            <div
              key={sym.symbol}
              className={`relative rounded-2xl backdrop-blur-2xl border p-4 space-y-2 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] hover:scale-[1.03] ${
                sym.pctChange >= 0
                  ? "bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/10 border-emerald-500/30 hover:border-emerald-500/50"
                  : "bg-gradient-to-br from-red-500/20 via-orange-500/15 to-amber-500/10 border-red-500/30 hover:border-red-500/50"
              }`}
            >
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{sym.symbol}</p>
              <p className="text-xl font-bold text-white tracking-tight">{sym.price.toLocaleString()}</p>
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

      {/* Row 2 – Key Trading Metrics (Like Vital Trends) */}
      <section className="space-y-4 mb-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-white">Trading Metrics</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Setup Confluence */}
          <div className={`relative rounded-2xl backdrop-blur-2xl border p-5 space-y-4 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] hover:scale-[1.02] ${
            context?.strategyConfluence?.setupGrade === "A"
              ? "bg-gradient-to-br from-emerald-500/25 via-teal-500/15 to-cyan-500/10 border-emerald-500/40"
              : context?.strategyConfluence?.setupGrade === "B"
              ? "bg-gradient-to-br from-yellow-500/25 via-amber-500/15 to-orange-500/10 border-yellow-500/40"
              : "bg-gradient-to-br from-white/[0.08] to-white/[0.04] border-white/15"
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Setup Confluence</p>
              {context?.strategyConfluence && (
                <span
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold shadow-lg ${
                    context.strategyConfluence.setupGrade === "A"
                      ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 shadow-emerald-500/20"
                      : context.strategyConfluence.setupGrade === "B"
                      ? "bg-yellow-500/30 text-yellow-300 border border-yellow-400/50 shadow-yellow-500/20"
                      : "bg-slate-500/20 text-slate-400 border border-slate-500/40"
                  }`}
                >
                  {context.strategyConfluence.setupGrade}
                </span>
              )}
            </div>
            {context?.strategyConfluence && (
              <>
                <p className="text-3xl font-bold text-white tracking-tight">{context.strategyConfluence.setupMatchPct}%</p>
                <ProgressBar value={context.strategyConfluence.setupMatchPct} color={context.strategyConfluence.setupGrade === "A" ? "#10B981" : context.strategyConfluence.setupGrade === "B" ? "#F59E0B" : "#6B7280"} height={6} />
              </>
            )}
          </div>

          {/* Market Regime */}
          <div className="relative rounded-2xl bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-500/10 backdrop-blur-2xl border border-blue-500/30 p-5 space-y-4 hover:border-blue-500/50 transition-all duration-300 shadow-[0_8px_24px_rgba(59,130,246,0.3)] hover:shadow-[0_12px_32px_rgba(59,130,246,0.4)] hover:scale-[1.02]">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Market Regime</p>
            {context?.regime && (
              <>
                <p className="text-3xl font-bold text-white tracking-tight">{context.regime.trendStatus.replace("_", " ")}</p>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <span className="text-xs text-slate-300 font-medium">ADX: </span>
                  <span className="text-base font-bold text-white">{context.regime.adx.toFixed(1)}</span>
                </div>
              </>
            )}
          </div>

          {/* Volume Delta */}
          <div className={`relative rounded-2xl backdrop-blur-2xl border p-5 space-y-4 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] hover:scale-[1.02] ${
            context?.volume && context.volume.volumeDelta >= 0
              ? "bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/10 border-emerald-500/30"
              : "bg-gradient-to-br from-red-500/20 via-orange-500/15 to-amber-500/10 border-red-500/30"
          }`}>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Volume Delta</p>
            {context?.volume && (
              <>
                <p
                  className={`text-3xl font-bold tracking-tight ${
                    context.volume.volumeDelta >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {context.volume.volumeDelta >= 0 ? "+" : ""}
                  {context.volume.volumeDelta.toLocaleString()}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <span className="text-xs text-slate-300 font-medium">CVD: </span>
                  <span className={`text-base font-bold ${
                    context.volume.cvd >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {context.volume.cvd >= 0 ? "+" : ""}
                    {context.volume.cvd.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 overflow-hidden">
                  <div className="w-full">
                    <SparklineChart 
                      values={[0, -50, -120, -200, -280, -340]} 
                      color={context.volume.volumeDelta >= 0 ? "#10B981" : "#EF4444"} 
                      width={120} 
                      height={24} 
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Behavioural State */}
          <div className={`relative rounded-2xl backdrop-blur-2xl border p-5 space-y-4 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] hover:scale-[1.02] ${
            context?.behavioural?.overtradingFlag === "CRITICAL"
              ? "bg-gradient-to-br from-red-500/25 via-orange-500/15 to-amber-500/10 border-red-500/40"
              : context?.behavioural?.overtradingFlag === "WARNING"
              ? "bg-gradient-to-br from-yellow-500/25 via-amber-500/15 to-orange-500/10 border-yellow-500/40"
              : "bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/10 border-emerald-500/30"
          }`}>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Trading State</p>
            {context?.behavioural && (
              <>
                <p className="text-3xl font-bold text-white tracking-tight">
                  {Math.floor(context.behavioural.minutesSinceLastBreak / 60)}h{" "}
                  {context.behavioural.minutesSinceLastBreak % 60}m
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <span
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold shadow-lg ${
                      context.behavioural.overtradingFlag === "CRITICAL"
                        ? "bg-red-500/30 text-red-300 border border-red-400/50 shadow-red-500/20"
                        : context.behavioural.overtradingFlag === "WARNING"
                        ? "bg-yellow-500/30 text-yellow-300 border border-yellow-400/50 shadow-yellow-500/20"
                        : "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 shadow-emerald-500/20"
                    }`}
                  >
                    {context.behavioural.overtradingFlag}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Row 3 – Focus Symbol & Regime (Detailed) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Active Symbol Card */}
        <div className="relative rounded-2xl bg-gradient-to-br from-ultra-accent/25 via-orange-500/20 to-amber-500/15 backdrop-blur-2xl border border-ultra-accent/50 p-6 space-y-5 shadow-[0_12px_40px_rgba(245,99,0,0.35)] hover:shadow-[0_16px_48px_rgba(245,99,0,0.45)] hover:border-ultra-accent/70 transition-all duration-300 hover:scale-[1.01]">
          <div className="flex items-center gap-3">
            <select
              value={symbolContext.symbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              className="text-lg font-bold text-white bg-white/10 border border-white/20 rounded-xl px-5 py-2.5 focus:outline-none focus:border-ultra-accent focus:ring-2 focus:ring-ultra-accent/30 transition-all flex-shrink-0 shadow-lg"
            >
              <option value="XAUUSD">XAUUSD</option>
              <option value="EURUSD">EURUSD</option>
              <option value="BTCUSD">BTCUSD</option>
              <option value="SPX">SPX</option>
            </select>
            <div className="flex gap-2 items-center">
              {["M15", "H1", "H4", "D1"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => handleTimeframeChange(tf)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all h-[40px] flex items-center justify-center shadow-lg ${
                    symbolContext.timeframe === tf
                      ? "bg-ultra-accent/40 text-white border-2 border-ultra-accent shadow-[0_0_16px_rgba(245,99,0,0.5)]"
                      : "bg-white/10 text-slate-300 border border-white/20 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-[11px] text-slate-300 uppercase tracking-wider font-bold">Open</p>
                <p className="text-lg font-bold text-white leading-tight">{ohlc.open.toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-slate-300 uppercase tracking-wider font-bold">High</p>
                <p className="text-lg font-bold text-emerald-400 leading-tight">{ohlc.high.toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-slate-300 uppercase tracking-wider font-bold">Low</p>
                <p className="text-lg font-bold text-red-400 leading-tight">{ohlc.low.toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-slate-300 uppercase tracking-wider font-bold">Close</p>
                <p className="text-lg font-bold text-white leading-tight">{ohlc.close.toFixed(2)}</p>
              </div>
            </div>
            {/* Price Chart */}
            <div className="pt-3 pb-2 bg-white/5 rounded-xl p-3 border border-white/10 overflow-hidden">
              <div className="w-full">
                <SparklineChart 
                  values={[ohlc.open, ohlc.low, ohlc.high, ohlc.close]} 
                  color={ohlc.close >= ohlc.open ? "#10B981" : "#EF4444"} 
                  width={100} 
                  height={50} 
                />
              </div>
            </div>
            {ohlc.spread && (
              <div className="pt-3 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-300 font-semibold">Spread</p>
                  <p className="text-base font-bold text-white">{ohlc.spread} pips</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Market Regime Panel */}
        <div className="relative rounded-2xl bg-gradient-to-br from-indigo-500/25 via-purple-500/20 to-pink-500/15 backdrop-blur-2xl border border-indigo-500/50 p-6 space-y-5 shadow-[0_12px_40px_rgba(99,102,241,0.35)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.45)] hover:border-indigo-500/70 transition-all duration-300 hover:scale-[1.01]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Market Regime</h3>
          {context?.regime && (
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-[11px] text-slate-300 uppercase tracking-wider font-bold">Status</p>
                <span
                  className={`inline-block text-sm px-4 py-2 rounded-xl font-bold shadow-lg ${
                    context.regime.trendStatus === "TRENDING_UP"
                      ? "bg-emerald-500/30 text-emerald-300 border-2 border-emerald-400/50 shadow-emerald-500/20"
                      : context.regime.trendStatus === "TRENDING_DOWN"
                      ? "bg-red-500/30 text-red-300 border-2 border-red-400/50 shadow-red-500/20"
                      : "bg-slate-500/30 text-slate-300 border-2 border-slate-500/50 shadow-slate-500/20"
                  }`}
                >
                  {context.regime.trendStatus.replace("_", " ")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-300 uppercase tracking-wider font-bold">ADX</p>
                  <p className="text-2xl font-bold text-white leading-tight">{context.regime.adx.toFixed(1)}</p>
                  <ProgressBar value={context.regime.adx} max={50} color={context.regime.adx > 25 ? "#10B981" : context.regime.adx > 20 ? "#F59E0B" : "#6B7280"} height={5} />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-300 uppercase tracking-wider font-bold">BB Width</p>
                  <p className="text-2xl font-bold text-white leading-tight">{context.regime.bollingerWidthPercentile.toFixed(0)}%</p>
                  <ProgressBar value={context.regime.bollingerWidthPercentile} max={100} color={context.regime.bollingerWidthPercentile > 70 ? "#EF4444" : context.regime.bollingerWidthPercentile > 50 ? "#F59E0B" : "#10B981"} height={5} />
                </div>
              </div>
              <div className="pt-3 border-t border-white/20 space-y-3">
                <p className="text-[11px] text-slate-300 uppercase tracking-wider font-bold">Volatility</p>
                <span
                  className={`inline-block text-sm px-4 py-2 rounded-xl font-bold shadow-lg ${
                    context.regime.volatilityState === "EXPLOSIVE"
                      ? "bg-red-500/30 text-red-300 border-2 border-red-400/50 shadow-red-500/20"
                      : context.regime.volatilityState === "NORMAL"
                      ? "bg-yellow-500/30 text-yellow-300 border-2 border-yellow-400/50 shadow-yellow-500/20"
                      : "bg-emerald-500/30 text-emerald-300 border-2 border-emerald-400/50 shadow-emerald-500/20"
                  }`}
                >
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
    </main>
  );
}
