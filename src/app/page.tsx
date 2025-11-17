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
    { symbol: "BTCUSD", label: "CRYPTO", state: "ranging", changePct: -0.2, adrUsagePct: 40, volatility: "high" },
    { symbol: "SPX", label: "INDEX", state: "quiet", changePct: 0.1, adrUsagePct: 20, volatility: "low" }
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

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen max-w-md mx-auto px-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-ultra-accent/30 border-t-ultra-accent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex items-center justify-center min-h-screen max-w-md mx-auto px-4">
        <div className="rounded-3xl bg-ultra-negative/10 border border-ultra-negative/30 px-6 py-4 text-center">
          <p className="text-sm text-ultra-negative font-medium">{error}</p>
        </div>
      </main>
    );
  }

  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  const dayNumber = now.getDate();

  return (
    <main className="space-y-5 pt-4 pb-24 max-w-md mx-auto px-4">
      {/* Hero Header - Premium Gradient with Depth */}
      <section className="relative h-48 rounded-[2rem] overflow-hidden mb-5 group">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#F56300]/25 via-[#F56300]/5 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,99,0,0.15),_transparent_70%)]" />
        
        {/* Subtle animated shimmer */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        </div>
        
        <div className="relative h-full flex flex-col justify-between px-6 py-5">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white/90 tracking-tight">{time}</span>
            <div className="flex items-center gap-4">
              <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95">
                <span className="text-base">🔍</span>
              </button>
              <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 relative">
                <span className="text-base">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-ultra-accent rounded-full border border-black" />
              </button>
            </div>
          </div>
          
          {/* Date and greeting */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{dayNumber}</span>
              </div>
              <p className="text-xs text-white/70 font-medium tracking-wide uppercase">{date.split(',')[0]}</p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
              Hello, Liam
            </h1>
          </div>
        </div>
      </section>

      {/* Market Overview - Horizontal Scroll with Premium Cards */}
      <section className="space-y-3 mb-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Market Overview</h2>
          <button className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">View All</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {marketTiles.map((tile, idx) => (
            <div 
              key={tile.symbol} 
              className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 space-y-3 min-w-[150px] hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] active:scale-[0.98]"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{tile.label}</p>
                <div className={`w-2 h-2 rounded-full ${
                  tile.volatility === "high" ? "bg-ultra-negative" : 
                  tile.volatility === "normal" ? "bg-yellow-500" : 
                  "bg-ultra-positive"
                }`} />
              </div>
              <p className="text-xl font-bold text-white tracking-tight">{tile.symbol}</p>
              <div className="space-y-1">
                <p className={`text-base font-bold tracking-tight ${
                  tile.changePct > 0 ? "text-ultra-positive" : 
                  tile.changePct < 0 ? "text-ultra-negative" : 
                  "text-slate-300"
                }`}>
                  {tile.changePct > 0 ? "+" : ""}{tile.changePct.toFixed(2)}%
                </p>
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 font-medium">ADR: {tile.adrUsagePct}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Open Trades - Premium Card Design */}
      <section className="space-y-3 mb-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Open Trades</h2>
          <span className="text-[10px] text-slate-500 font-medium">{trades.length} active</span>
        </div>
        {trades.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-6 py-12 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-sm text-slate-400 font-medium">No open trades</p>
            <p className="text-xs text-slate-600 mt-1">Your active positions will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trades.map((trade) => (
              <div 
                key={trade.id} 
                className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] active:scale-[0.99]"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <h3 className="text-xl font-bold text-white tracking-tight">{trade.symbol}</h3>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide ${
                        trade.direction === "long"
                          ? "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40 shadow-[0_0_12px_rgba(50,215,75,0.2)]"
                          : "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/40 shadow-[0_0_12px_rgba(255,69,58,0.2)]"
                      }`}>
                        {trade.direction.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">{trade.notes || "—"}</p>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide">Risk</p>
                        <p className="text-xs font-bold text-slate-300 mt-0.5">{trade.risk_per_trade?.toFixed(2) || "—"}R</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide">Opened</p>
                        <p className="text-xs font-bold text-slate-300 mt-0.5">
                          {trade.opened_at ? new Date(trade.opened_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-white tracking-tight">${trade.entry_price?.toFixed(2) || "—"}</p>
                    <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wide">Entry</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Risk Status - Grid with Visual Hierarchy */}
      <section className="space-y-3 mb-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Risk Status</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-4 py-4 space-y-2 hover:bg-white/[0.06] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Daily Limit</span>
            <div className="text-xl font-bold tracking-tight text-white">{risk.dailyRiskLimitPct}%</div>
          </div>
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-4 py-4 space-y-2 hover:bg-white/[0.06] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Current</span>
            <div className={`text-xl font-bold tracking-tight ${
              risk.currentRiskPct > risk.dailyRiskLimitPct 
                ? "text-ultra-negative" 
                : risk.currentRiskPct > risk.dailyRiskLimitPct * 0.8
                ? "text-yellow-400"
                : "text-ultra-positive"
            }`}>
              {risk.currentRiskPct.toFixed(2)}%
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-4 py-4 space-y-2 hover:bg-white/[0.06] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Today's R</span>
            <div className={`text-xl font-bold tracking-tight ${
              risk.todaysR > 0 ? "text-ultra-positive" : 
              risk.todaysR < 0 ? "text-ultra-negative" : 
              "text-white"
            }`}>
              {risk.todaysR > 0 ? "+" : ""}{risk.todaysR.toFixed(2)}R
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[#F56300]/15 via-[#F56300]/5 to-cyan-500/5 backdrop-blur-2xl border border-white/10 px-5 py-4 shadow-[0_8px_32px_rgba(245,99,0,0.15)]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Streak</span>
              <div className="text-base font-bold text-ultra-accent mt-1.5">{risk.streakLabel}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-ultra-accent/20 border border-ultra-accent/30 flex items-center justify-center">
              <span className="text-xl">🔥</span>
            </div>
          </div>
        </div>
      </section>

      {/* Playbook Signals - Premium Cards */}
      {signals.length > 0 && (
        <section className="space-y-3 mb-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Playbook Signals</h2>
            <button className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">{signals.length} active</button>
          </div>
          <div className="space-y-3">
            {signals.map((signal) => (
              <div 
                key={signal.id} 
                className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] active:scale-[0.99]"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <h3 className="text-xl font-bold text-white tracking-tight">{signal.symbol}</h3>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                        signal.confidence === "high" 
                          ? "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40 shadow-[0_0_12px_rgba(50,215,75,0.2)]" 
                          : signal.confidence === "medium"
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.2)]"
                          : "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/40 shadow-[0_0_12px_rgba(255,69,58,0.2)]"
                      }`}>
                        {signal.confidence.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 font-medium mb-2">{signal.label}</p>
                    <p className="text-[10px] text-slate-600 uppercase tracking-wide capitalize">{signal.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Today's Events - Premium Cards */}
      {events.length > 0 && (
        <section className="space-y-3 mb-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Today's Events</h2>
            <button className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">{events.length} scheduled</button>
          </div>
          <div className="space-y-3">
            {events.map((event) => (
              <div 
                key={event.id} 
                className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] active:scale-[0.99]"
              >
                <div className="flex justify-between items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{event.time}</span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white tracking-tight">{event.label}</h3>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold flex-shrink-0 ${
                    event.impact === "high" 
                      ? "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/40 shadow-[0_0_12px_rgba(255,69,58,0.2)]" 
                      : event.impact === "medium"
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.2)]"
                      : "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40 shadow-[0_0_12px_rgba(50,215,75,0.2)]"
                  }`}>
                    {event.impact.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Agent Summary - Premium Gradient Card */}
      <section className="space-y-3 mb-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Agent Summary</h2>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[#F56300]/15 via-[#F56300]/5 to-cyan-500/5 backdrop-blur-2xl border border-white/10 px-5 py-5 shadow-[0_8px_32px_rgba(245,99,0,0.15)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🤖</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                AI summary of your day based on trades and lessons.
              </p>
              <p className="text-xs text-slate-500 mt-2 font-medium">Coming soon</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}