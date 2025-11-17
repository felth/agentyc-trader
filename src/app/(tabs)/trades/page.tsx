"use client";

import React, { useState, useEffect } from "react";
import { TabPage } from "../../../components/layout/TabPage";

type Trade = {
  id: string;
  symbol: string;
  direction: "long" | "short";
  entry_price: number | null;
  stop_price: number | null;
  target_price: number | null;
  risk_per_trade: number | null;
  pnl_r: number | null;
  notes: string | null;
  opened_at: string | null;
  closed_at: string | null;
  status: "open" | "closed";
};

const filters = ["All", "Open", "Closed", "Week", "Month"];

export default function TradesTab() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trades")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setTrades(j.trades || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openTrades = trades.filter((t) => t.status === "open");
  const closedTrades = trades.filter((t) => t.status === "closed").slice(0, 10);

  if (loading) {
    return (
      <TabPage>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-ultra-accent/30 border-t-ultra-accent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-medium">Loading trades...</p>
          </div>
        </div>
      </TabPage>
    );
  }

  return (
    <TabPage>
      {/* Header */}
      <div className="relative h-48 rounded-[2rem] overflow-hidden group mb-5">
        {/* Background Image - Add your photo here */}
        {/* <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/hero-trades.jpeg')"
          }}
        /> */}
        
        {/* Gradient fallback */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#F56300]/25 via-[#F56300]/5 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,99,0,0.15),_transparent_70%)]" />
        
        {/* Dark Overlay - Uncomment when adding photo */}
        {/* <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" /> */}
        <div className="relative h-full flex flex-col justify-between px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Trades</p>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Your Positions</h1>
            <p className="text-sm text-white/70">{openTrades.length} open · {closedTrades.length} recent</p>
          </div>
        </div>
      </div>

      {/* Open Trades */}
      <section className="space-y-3 mb-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Open Trades</h2>
          <span className="text-[10px] text-slate-500 font-medium">{openTrades.length} active</span>
        </div>
        {openTrades.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-6 py-12 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-sm text-slate-400 font-medium">No open trades</p>
            <p className="text-xs text-slate-600 mt-1">Your active positions will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openTrades.map((trade) => (
              <div
                key={trade.id}
                className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] active:scale-[0.99]"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <h3 className="text-xl font-bold text-white tracking-tight">{trade.symbol}</h3>
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide ${
                          trade.direction === "long"
                            ? "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40 shadow-[0_0_12px_rgba(50,215,75,0.2)]"
                            : "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/40 shadow-[0_0_12px_rgba(255,69,58,0.2)]"
                        }`}
                      >
                        {trade.direction.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium mb-3">{trade.notes || "—"}</p>
                    <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide">Entry</p>
                        <p className="text-xs font-bold text-white mt-0.5">${trade.entry_price?.toFixed(2) || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide">Risk</p>
                        <p className="text-xs font-bold text-slate-300 mt-0.5">{trade.risk_per_trade?.toFixed(2) || "—"}R</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide">PnL</p>
                        <p
                          className={`text-xs font-bold mt-0.5 ${
                            (trade.pnl_r || 0) > 0
                              ? "text-ultra-positive"
                              : (trade.pnl_r || 0) < 0
                              ? "text-ultra-negative"
                              : "text-slate-300"
                          }`}
                        >
                          {(trade.pnl_r || 0) > 0 ? "+" : ""}
                          {trade.pnl_r?.toFixed(2) || "0.00"}R
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Closed Trades */}
      {closedTrades.length > 0 && (
        <section className="space-y-3 mb-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Recent Closed</h2>
            <button className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">See all</button>
          </div>
          <div className="space-y-3">
            {closedTrades.map((trade) => (
              <div
                key={trade.id}
                className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)] active:scale-[0.99]"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <h3 className="text-lg font-bold text-white tracking-tight">{trade.symbol}</h3>
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                          trade.direction === "long"
                            ? "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40"
                            : "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/40"
                        }`}
                      >
                        {trade.direction.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide">Result</p>
                        <p
                          className={`text-sm font-bold mt-0.5 ${
                            (trade.pnl_r || 0) > 0 ? "text-ultra-positive" : "text-ultra-negative"
                          }`}
                        >
                          {(trade.pnl_r || 0) > 0 ? "+" : ""}
                          {trade.pnl_r?.toFixed(2) || "0.00"}R
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide">Closed</p>
                        <p className="text-xs font-bold text-slate-300 mt-0.5">
                          {trade.closed_at
                            ? new Date(trade.closed_at).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "2-digit",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={[
              "px-4 py-2 rounded-full text-xs font-bold border transition-all active:scale-95 flex-shrink-0",
              activeFilter === filter
                ? "bg-ultra-accent text-black border-ultra-accent shadow-[0_0_16px_rgba(245,99,0,0.6)]"
                : "bg-white/[0.03] backdrop-blur-sm text-slate-300 border-white/10 hover:bg-white/[0.06]",
            ].join(" ")}
          >
            {filter}
          </button>
        ))}
      </div>
    </TabPage>
  );
}