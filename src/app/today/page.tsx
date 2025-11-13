"use client";

import React, { useEffect, useState } from "react";

type Trade = {
  id: string;
  symbol: string;
  direction: "long" | "short";
  size: number | null;
  entry: number | null;
  stop: number | null;
  target: number | null;
  opened_at: string | null;
  closed_at: string | null;
  status: "open" | "closed";
  pnl_r: number | null;
  notes: string | null;
  entry_price: number | null;
  risk_per_trade: number | null;
};

type TradesResponse = {
  ok: boolean;
  trades?: Trade[];
  error?: string;
};

export default function TodayPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrades() {
      try {
        const res = await fetch("/api/trades?status=open");
        const json: TradesResponse = await res.json();

        if (!json.ok) {
          setError(json.error || "Fetch failed");
          return;
        }

        setTrades(json.trades ?? []);
      } catch (e) {
        const err = e as Error;
        setError(err.message || "Network error");
      } finally {
        setLoading(false);
      }
    }

    loadTrades();
  }, []);

  if (loading) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold text-ultra-accent">Today</h1>
        <p className="text-sm text-gray-400">Open trades</p>
        <p className="text-sm text-gray-500">Loading open trades…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold text-ultra-accent">Today</h1>
        <p className="text-sm text-gray-400">Open trades</p>
        <p className="text-sm text-ultra-negative">Error: {error}</p>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold text-ultra-accent">Today</h1>
      <p className="text-sm text-gray-400">Open trades</p>

      {trades.length === 0 ? (
        <p className="text-sm text-gray-400">No open trades yet.</p>
      ) : (
        <div className="space-y-3">
          {trades.map((trade) => {
            const opened =
              trade.opened_at != null
                ? new Date(trade.opened_at).toLocaleString()
                : "—";

            const entryDisplay =
              typeof trade.entry_price === "number"
                ? `$${trade.entry_price.toFixed(2)}`
                : "—";

            const riskDisplay =
              typeof trade.risk_per_trade === "number"
                ? `$${trade.risk_per_trade.toFixed(2)}`
                : "—";

            const pnlDisplay =
              typeof trade.pnl_r === "number"
                ? `${trade.pnl_r.toFixed(2)} R`
                : "—";

            return (
              <div
                key={trade.id}
                className="rounded-2xl border border-ultra-border bg-ultra-card p-4 flex justify-between items-start"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">
                      {trade.symbol}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        trade.direction === "long"
                          ? "bg-ultra-positive/20 text-ultra-positive"
                          : "bg-ultra-negative/20 text-ultra-negative"
                      }`}
                    >
                      {trade.direction.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    {trade.notes || "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Size: {trade.size ?? "—"}
                  </p>
                </div>

                <div className="text-right ml-4 space-y-1">
                  <p className="text-sm font-medium">Entry: {entryDisplay}</p>
                  <p className="text-xs text-gray-400">
                    Risk / trade: {riskDisplay}
                  </p>
                  <p className="text-xs text-gray-400">PnL (R): {pnlDisplay}</p>
                  <p className="text-xs text-gray-500">Opened: {opened}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

