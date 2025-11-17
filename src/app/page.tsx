"use client";

import React, { useEffect, useState } from "react";



type Trade = {

  id: string;

  symbol: string;

  direction: "long" | "short";

  timeframe: string | null;

  entry_price: number | null;

  stop_price: number | null;

  target_price: number | null;

  size: number | null;

  status: "open" | "closed";

  strategy_tag: string | null;

  notes: string | null;

  opened_at: string | null;

  closed_at: string | null;

  pnl_r: number | null;

  created_at: string | null;

  risk_per_trade: number | null;

};



type MarketTile = {

  symbol: string;

  label: string;

  state: "trending-up" | "trending-down" | "ranging" | "quiet";

  changePct: number;

  adrUsagePct: number;

  volatility: "low" | "normal" | "high";

};



type RiskSnapshot = {

  dailyRiskLimitPct: number;

  currentRiskPct: number;

  todaysR: number;

  streakLabel: string;

};



type PlaybookSignal = {

  id: string;

  symbol: string;

  label: string;

  type: "breakout" | "trend" | "reversion";

  confidence: "low" | "medium" | "high";

};



type EventItem = {

  id: string;

  time: string;

  label: string;

  impact: "low" | "medium" | "high";

};



export default function HomePage() {

  const [trades, setTrades] = useState<Trade[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);



  useEffect(() => {

    fetch("/api/trades?status=open")

      .then((r) => r.json())

      .then((j) => {

        if (j.ok) setTrades(j.trades || []);

        else setError(j.error || "Fetch failed");

      })

      .catch((e: any) => setError(e.message || "Network error"))

      .finally(() => setLoading(false));

  }, []);



  // Mocks

  const marketTiles: MarketTile[] = [

    { symbol: "EURUSD", label: "FX", state: "trending-up", changePct: 0.45, adrUsagePct: 65, volatility: "normal" },

    { symbol: "BTCUSD", label: "Crypto", state: "ranging", changePct: -0.2, adrUsagePct: 40, volatility: "high" },

    { symbol: "SPX", label: "Index", state: "quiet", changePct: 0.1, adrUsagePct: 20, volatility: "low" }

  ];



  const risk: RiskSnapshot = {

    dailyRiskLimitPct: 1.0,

    currentRiskPct: trades.reduce((sum, t) => sum + (t.risk_per_trade || 0), 0),

    todaysR: trades.reduce((sum, t) => sum + (t.pnl_r || 0), 0),

    streakLabel: "Flat today"

  };



  const signals: PlaybookSignal[] = [

    { id: "1", symbol: "GBPUSD", label: "Pullback entry", type: "trend", confidence: "high" },

    { id: "2", symbol: "ETHUSD", label: "Reversion play", type: "reversion", confidence: "medium" }

  ];



  const events: EventItem[] = [

    { id: "1", time: "14:00", label: "ECB Rate Decision", impact: "high" },

    { id: "2", time: "16:30", label: "US Retail Sales", impact: "medium" }

  ];



  if (loading) return <p className="text-sm text-gray-400">Loading dashboard…</p>;

  if (error) return <p className="text-sm text-ultra-negative">Error: {error}</p>;



  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

  return (

    <main className="space-y-6 pt-16 pb-24 max-w-md mx-auto px-4">

      {/* Hero Header with Gradient */}
      <section className="relative h-44 rounded-3xl overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F56300]/20 via-black/60 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="relative h-full flex flex-col justify-between px-5 py-4">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-medium">{time}</span>
            <div className="flex items-center gap-3">
              <span role="img" aria-label="search" className="text-base">🔍</span>
              <span role="img" aria-label="notifications" className="text-base">🔔</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs">📅</span>
              <p className="text-xs text-slate-200 font-medium">{date}</p>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Hello, Liam</h1>
          </div>
        </div>
      </section>



      {/* Market Overview */}
      <section className="space-y-3 mb-6">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-ultra-accent mb-3">Market Overview</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {marketTiles.map((tile) => (
            <div key={tile.symbol} className="rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 px-4 py-3 space-y-2 min-w-[140px] hover:bg-white/8 transition shadow-lg">
              <p className="text-xs text-slate-400 uppercase tracking-wide">{tile.label}</p>
              <p className="text-base font-semibold text-white">{tile.symbol}</p>
              <p className={`text-sm font-medium ${tile.state === "trending-up" ? "text-ultra-positive" : tile.state === "trending-down" ? "text-ultra-negative" : "text-slate-300"}`}>
                {tile.changePct > 0 ? "+" : ""}{tile.changePct.toFixed(2)}%
              </p>
              <div className="pt-2 border-t border-white/5">
                <p className="text-[11px] text-slate-500">ADR: {tile.adrUsagePct}%</p>
              </div>
            </div>
          ))}
        </div>
      </section>



      {/* Open Trades */}
      <section className="space-y-3 mb-6">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-ultra-accent mb-3">Open Trades</h2>
        {trades.length === 0 ? (
          <div className="rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 px-4 py-6 text-center">
            <p className="text-sm text-slate-400">No open trades yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trades.map((trade) => (
              <div key={trade.id} className="rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 px-5 py-4 hover:bg-white/8 transition shadow-lg">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{trade.symbol}</h3>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                        trade.direction === "long"
                          ? "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/30"
                          : "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/30"
                      }`}>
                        {trade.direction.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{trade.notes || "—"}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm font-semibold text-white">${trade.entry_price?.toFixed(2) || "—"}</p>
                    <p className="text-xs text-slate-500 mt-1">Risk: {trade.risk_per_trade?.toFixed(2) || "—"}R</p>
                    <p className="text-[10px] text-slate-600 mt-1">
                      {trade.opened_at ? new Date(trade.opened_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>



      {/* Risk Status */}
      <section className="space-y-3 mb-6">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-ultra-accent mb-3">Risk Status</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 px-4 py-3 space-y-1 hover:bg-white/8 transition">
            <span className="text-xs text-slate-400">Daily Limit</span>
            <div className="text-base font-semibold tracking-tight text-white">{risk.dailyRiskLimitPct}%</div>
          </div>
          <div className="rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 px-4 py-3 space-y-1 hover:bg-white/8 transition">
            <span className="text-xs text-slate-400">Current</span>
            <div className={`text-base font-semibold tracking-tight ${risk.currentRiskPct > risk.dailyRiskLimitPct ? "text-ultra-negative" : "text-ultra-positive"}`}>
              {risk.currentRiskPct.toFixed(2)}%
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 px-4 py-3 space-y-1 hover:bg-white/8 transition">
            <span className="text-xs text-slate-400">Today's R</span>
            <div className="text-base font-semibold tracking-tight text-white">{risk.todaysR.toFixed(2)}R</div>
          </div>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-[#F56300]/10 to-cyan-500/5 backdrop-blur-2xl border border-white/10 px-4 py-3 shadow-lg">
          <span className="text-xs text-slate-400">Streak</span>
          <div className="text-sm font-semibold text-ultra-accent mt-1">{risk.streakLabel}</div>
        </div>
      </section>



      {/* Playbook Signals */}
      <section className="space-y-3 mb-6">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-ultra-accent mb-3">Playbook Signals</h2>
        <div className="space-y-3">
          {signals.map((signal) => (
            <div key={signal.id} className="rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 px-5 py-4 hover:bg-white/8 transition shadow-lg">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1">{signal.symbol}</h3>
                  <p className="text-sm text-slate-400">{signal.label}</p>
                  <p className="text-xs text-slate-500 mt-2 capitalize">{signal.type}</p>
                </div>
                <span className={`text-[10px] px-3 py-1.5 rounded-full font-medium flex-shrink-0 ${
                  signal.confidence === "high" 
                    ? "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/30" 
                    : signal.confidence === "medium"
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/30"
                }`}>
                  {signal.confidence.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>



      {/* Today's Events */}
      <section className="space-y-3 mb-6">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-ultra-accent mb-3">Today's Events</h2>
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 px-5 py-4 hover:bg-white/8 transition shadow-lg">
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1">{event.label}</h3>
                  <p className="text-sm text-slate-400">{event.time}</p>
                </div>
                <span className={`text-[10px] px-3 py-1.5 rounded-full font-medium flex-shrink-0 ${
                  event.impact === "high" 
                    ? "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/30" 
                    : event.impact === "medium"
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/30"
                }`}>
                  {event.impact.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Summary */}
      <section className="space-y-3 mb-6">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-ultra-accent mb-3">Agent Summary</h2>
        <div className="rounded-3xl bg-gradient-to-br from-[#F56300]/10 to-cyan-500/5 backdrop-blur-2xl border border-white/10 px-5 py-4 shadow-lg">
          <p className="text-sm text-slate-400 leading-relaxed">AI summary of your day based on trades and lessons. (Coming soon)</p>
        </div>
      </section>

    </main>

  );

}