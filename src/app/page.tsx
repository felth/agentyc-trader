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



  return (

    <main className="space-y-4 pt-16 pb-24 max-w-md mx-auto px-4">

      {/* Hero */}

      <header className="rounded-3xl bg-ultra-card p-4 border border-ultra-border">

        <h1 className="text-xl font-semibold text-ultra-accent">Agent Dashboard</h1>

        <p className="text-sm text-gray-400">November 17, 2025</p>

      </header>



      {/* Market Overview */}

      <section className="overflow-x-auto">

        <h2 className="text-xs uppercase font-semibold text-ultra-accent mb-2">Market Overview</h2>

        <div className="flex gap-3 pb-2">

          {marketTiles.map((tile) => (

            <div key={tile.symbol} className="bg-ultra-cardAlt p-3 rounded-xl border border-ultra-border min-w-[120px]">

              <p className="text-xs text-gray-400">{tile.label}</p>

              <p className="text-sm font-medium">{tile.symbol}</p>

              <p className={`text-xs ${tile.state === "trending-up" ? "text-ultra-positive" : tile.state === "trending-down" ? "text-ultra-negative" : "text-gray-300"}`}>

                {tile.changePct > 0 ? "+" : ""}{tile.changePct.toFixed(2)}%

              </p>

              <p className="text-xs text-gray-400">ADR: {tile.adrUsagePct}%</p>

            </div>

          ))}

        </div>

      </section>



      {/* Open Trades */}

      <section>

        <h2 className="text-xs uppercase font-semibold text-ultra-accent mb-2">Open Trades</h2>

        {trades.length === 0 ? (

          <p className="text-sm text-gray-400">No open trades yet.</p>

        ) : (

          <div className="space-y-3">

            {trades.map((trade) => (

              <div key={trade.id} className="bg-ultra-card p-4 rounded-2xl border border-ultra-border">

                <div className="flex justify-between items-start">

                  <div className="flex-1">

                    <h3 className="text-lg font-semibold text-white">{trade.symbol}</h3>

                    <span className={`text-xs px-2 py-1 rounded-full ${

                      trade.direction === "long"

                        ? "bg-ultra-positive/20 text-ultra-positive"

                        : "bg-ultra-negative/20 text-ultra-negative"

                    }`}>

                      {trade.direction.toUpperCase()}

                    </span>

                    <p className="text-sm text-gray-400 mt-1">{trade.notes || "—"}</p>

                  </div>

                  <div className="text-right ml-4">

                    <p className="text-sm font-medium">Entry: ${trade.entry_price?.toFixed(2) || "—"}</p>

                    <p className="text-xs text-gray-400">Risk: {trade.risk_per_trade?.toFixed(2) || "—"}R</p>

                    <p className="text-xs text-gray-500">

                      Opened: {trade.opened_at ? new Date(trade.opened_at).toLocaleDateString() : "—"}

                    </p>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>



      {/* Risk Status */}

      <section>

        <h2 className="text-xs uppercase font-semibold text-ultra-accent mb-2">Risk Status</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-ultra-card p-3 rounded-2xl border border-ultra-border">

            <p className="text-xs text-gray-400">Daily Limit</p>

            <p className="text-sm font-medium">{risk.dailyRiskLimitPct}%</p>

          </div>

          <div className="bg-ultra-card p-3 rounded-2xl border border-ultra-border">

            <p className="text-xs text-gray-400">Current</p>

            <p className={`text-sm font-medium ${risk.currentRiskPct > risk.dailyRiskLimitPct ? "text-ultra-negative" : "text-ultra-positive"}`}>

              {risk.currentRiskPct.toFixed(2)}%

            </p>

          </div>

          <div className="bg-ultra-card p-3 rounded-2xl border border-ultra-border">

            <p className="text-xs text-gray-400">Today's R</p>

            <p className="text-sm font-medium">{risk.todaysR.toFixed(2)}R</p>

          </div>

          <div className="col-span-1 sm:col-span-3 bg-ultra-card p-3 rounded-2xl border border-ultra-border">

            <p className="text-xs text-gray-400">Streak</p>

            <p className="text-sm font-medium text-ultra-accent">{risk.streakLabel}</p>

          </div>

        </div>

      </section>



      {/* Playbook Signals */}

      <section>

        <h2 className="text-xs uppercase font-semibold text-ultra-accent mb-2">Playbook Signals</h2>

        <div className="space-y-3">

          {signals.map((signal) => (

            <div key={signal.id} className="bg-ultra-card p-4 rounded-2xl border border-ultra-border">

              <div className="flex justify-between items-start">

                <div>

                  <h3 className="text-lg font-semibold text-white">{signal.symbol}</h3>

                  <p className="text-sm text-gray-400">{signal.label}</p>

                </div>

                <span className={`text-xs px-2 py-1 rounded-full ${

                  signal.confidence === "high" ? "bg-ultra-positive text-ultra-positive" : "bg-ultra-negative text-ultra-negative"

                }`}>

                  {signal.confidence.toUpperCase()}

                </span>

              </div>

              <p className="text-xs text-gray-500 mt-2">{signal.type}</p>

            </div>

          ))}

        </div>

      </section>



      {/* Today's Events */}

      <section>

        <h2 className="text-xs uppercase font-semibold text-ultra-accent mb-2">Today's Events</h2>

        <div className="space-y-3">

          {events.map((event) => (

            <div key={event.id} className="bg-ultra-card p-4 rounded-2xl border border-ultra-border">

              <div className="flex justify-between items-center">

                <div>

                  <h3 className="text-lg font-semibold text-white">{event.label}</h3>

                  <p className="text-sm text-gray-400">{event.time}</p>

                </div>

                <span className={`text-xs px-2 py-1 rounded-full ${

                  event.impact === "high" ? "bg-ultra-negative text-ultra-negative" : "bg-ultra-positive text-ultra-positive"

                }`}>

                  {event.impact.toUpperCase()}

                </span>

              </div>

            </div>

          ))}

        </div>

      </section>



      {/* Agent Summary */}

      <section>

        <h2 className="text-xs uppercase font-semibold text-ultra-accent mb-2">Agent Summary</h2>

        <div className="bg-ultra-card p-4 rounded-2xl border border-ultra-border">

          <p className="text-sm text-gray-400">AI summary of your day based on trades and lessons. (Coming soon)</p>

        </div>

      </section>

    </main>

  );

}