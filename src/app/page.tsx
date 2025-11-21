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

      {/* Row 1 – Market Overview */}
      <section className="space-y-4 mb-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Market Overview</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {context?.marketOverview.benchmarkSymbols.map((sym, idx) => (
            <div
              key={sym.symbol}
              className="relative rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-2xl border border-white/10 px-5 py-4 space-y-3 min-w-[140px] hover:from-white/[0.08] hover:to-white/[0.04] hover:border-white/20 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:scale-[1.02]"
            >
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{sym.symbol}</p>
              <p className="text-2xl font-bold text-white tracking-tight">{sym.price.toLocaleString()}</p>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-bold ${
                  sym.pctChange >= 0 ? "text-ultra-positive" : "text-ultra-negative"
                }`}>
                  {sym.pctChange >= 0 ? "↑" : "↓"}
                </span>
                <p
                  className={`text-sm font-bold ${
                    sym.pctChange >= 0 ? "text-ultra-positive" : "text-ultra-negative"
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

      {/* Row 2 – Focus Symbol & Regime */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Active Symbol Card */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all duration-300">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={symbolContext.symbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              className="text-base font-bold text-white bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-ultra-accent/50 focus:ring-2 focus:ring-ultra-accent/20 transition-all"
            >
              <option value="XAUUSD">XAUUSD</option>
              <option value="EURUSD">EURUSD</option>
              <option value="BTCUSD">BTCUSD</option>
              <option value="SPX">SPX</option>
            </select>
            <div className="flex gap-1.5">
              {["M15", "H1", "H4", "D1"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => handleTimeframeChange(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    symbolContext.timeframe === tf
                      ? "bg-ultra-accent/25 text-ultra-accent border border-ultra-accent/50 shadow-[0_0_12px_rgba(245,99,0,0.3)]"
                      : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/[0.08] hover:text-slate-300"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Open</p>
                <p className="text-base font-bold text-white">{ohlc.open.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">High</p>
                <p className="text-base font-bold text-ultra-positive">{ohlc.high.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Low</p>
                <p className="text-base font-bold text-ultra-negative">{ohlc.low.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Close</p>
                <p className="text-base font-bold text-white">{ohlc.close.toFixed(2)}</p>
              </div>
            </div>
            {ohlc.spread && (
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">Spread</p>
                  <p className="text-sm font-bold text-white">{ohlc.spread} pips</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Market Regime Panel */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all duration-300">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Market Regime</h3>
          {context?.regime && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Status</p>
                <span
                  className={`inline-block text-xs px-3 py-1.5 rounded-xl font-bold ${
                    context.regime.trendStatus === "TRENDING_UP"
                      ? "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40"
                      : context.regime.trendStatus === "TRENDING_DOWN"
                      ? "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/40"
                      : "bg-slate-500/20 text-slate-400 border border-slate-500/40"
                  }`}
                >
                  {context.regime.trendStatus.replace("_", " ")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">ADX</p>
                  <p className="text-xl font-bold text-white">{context.regime.adx.toFixed(1)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">BB Width</p>
                  <p className="text-xl font-bold text-white">{context.regime.bollingerWidthPercentile.toFixed(0)}%</p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Volatility</p>
                <span
                  className={`inline-block text-xs px-3 py-1.5 rounded-xl font-bold ${
                    context.regime.volatilityState === "EXPLOSIVE"
                      ? "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/40"
                      : context.regime.volatilityState === "NORMAL"
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                      : "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40"
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
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all duration-300">
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
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all duration-300">
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
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all duration-300">
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
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all duration-300">
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
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all duration-300">
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
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all duration-300">
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

      {/* Row 6 – Strategy & Behaviour */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Strategy Confluence */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all duration-300">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Strategy Confluence</h3>
          {context?.strategyConfluence && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Setup Match</p>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {context.strategyConfluence.setupMatchPct}%
                  </p>
                </div>
                <span
                  className={`text-xs px-3 py-2 rounded-xl font-bold ${
                    context.strategyConfluence.setupGrade === "A"
                      ? "bg-ultra-positive/25 text-ultra-positive border border-ultra-positive/40 shadow-[0_0_12px_rgba(50,215,75,0.2)]"
                      : context.strategyConfluence.setupGrade === "B"
                      ? "bg-yellow-500/25 text-yellow-400 border border-yellow-500/40"
                      : context.strategyConfluence.setupGrade === "C"
                      ? "bg-orange-500/25 text-orange-400 border border-orange-500/40"
                      : "bg-slate-500/20 text-slate-400 border border-slate-500/40"
                  }`}
                >
                  {context.strategyConfluence.setupGrade}-Setup
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Pattern</p>
                  <p className="text-base font-bold text-white">
                    {context.strategyConfluence.candlePattern}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Momentum</p>
                  <p className="text-base font-bold text-white">
                    {context.strategyConfluence.momentumScore}/100
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {context.strategyConfluence.notes}
              </p>
            </div>
          )}
        </div>

        {/* Behavioural State */}
        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all duration-300">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">Behavioural State</h3>
          {context?.behavioural && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Time Since Break</p>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {Math.floor(context.behavioural.minutesSinceLastBreak / 60)}h{" "}
                    {context.behavioural.minutesSinceLastBreak % 60}m
                  </p>
                </div>
                <span
                  className={`text-xs px-3 py-2 rounded-xl font-bold ${
                    context.behavioural.overtradingFlag === "CRITICAL"
                      ? "bg-ultra-negative/25 text-ultra-negative border border-ultra-negative/40 shadow-[0_0_12px_rgba(255,69,58,0.2)]"
                      : context.behavioural.overtradingFlag === "WARNING"
                      ? "bg-yellow-500/25 text-yellow-400 border border-yellow-500/40"
                      : "bg-ultra-positive/25 text-ultra-positive border border-ultra-positive/40"
                  }`}
                >
                  {context.behavioural.overtradingFlag}
                </span>
              </div>
              {context.behavioural.manualStateTag && (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Manual State</p>
                  <span
                    className={`inline-block text-xs px-3 py-2 rounded-xl font-bold ${
                      context.behavioural.manualStateTag === "STRESSED"
                        ? "bg-ultra-negative/25 text-ultra-negative border border-ultra-negative/40"
                        : context.behavioural.manualStateTag === "CALM"
                        ? "bg-ultra-positive/25 text-ultra-positive border border-ultra-positive/40"
                        : "bg-slate-500/20 text-slate-400 border border-slate-500/40"
                    }`}
                  >
                    {context.behavioural.manualStateTag}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Row 7 – Agent Insight Strip */}
      <section className="mb-6">
        <div className="relative rounded-2xl bg-gradient-to-br from-[#F56300]/20 via-[#F56300]/10 to-cyan-500/10 backdrop-blur-2xl border border-white/20 p-6 shadow-[0_12px_40px_rgba(245,99,0,0.25)] hover:shadow-[0_16px_48px_rgba(245,99,0,0.35)] transition-all duration-300">
          <div className="flex items-start justify-between gap-5">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    AGENTYC View for {symbolContext.symbol} @ {symbolContext.timeframe}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {context?.regime?.trendStatus || "RANGING"} •{" "}
                    {context?.strategyConfluence?.setupGrade || "None"}-Setup
                  </p>
                </div>
              </div>
              {context?.strategyConfluence && (
                <div className="space-y-1.5 text-sm">
                  <p className="text-slate-200">
                    <span className="font-bold text-white">Bias:</span>{" "}
                    <span className={context.strategyConfluence.momentumScore > 50 ? "text-ultra-positive" : "text-ultra-negative"}>
                      {context.strategyConfluence.momentumScore > 50 ? "BULLISH" : "BEARISH"}
                    </span>
                  </p>
                  <p className="text-slate-200">
                    <span className="font-bold text-white">Key Levels:</span>{" "}
                    {context.volumeProfile?.pocPrice.toFixed(2) || "—"} (POC),{" "}
                    {context.volumeProfile?.valueAreaHigh.toFixed(2) || "—"} (VAH)
                  </p>
                  <p className="text-ultra-accent font-semibold pt-1">
                    {context.strategyConfluence.notes || "Analyzing market conditions..."}
                  </p>
                </div>
              )}
            </div>
            <Link
              href="/agent"
              className="px-5 py-3 rounded-xl bg-ultra-accent text-black font-bold text-sm hover:bg-ultra-accentHover transition-all active:scale-95 whitespace-nowrap shadow-[0_4px_12px_rgba(245,99,0,0.4)] hover:shadow-[0_6px_16px_rgba(245,99,0,0.5)]"
            >
              Open Agent
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
