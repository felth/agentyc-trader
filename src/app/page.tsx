"use client";
import React, { useEffect, useState } from "react";

export default function HomePage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/trades?status=open");
        const j = await res.json();
        if (j.ok) setTrades(j.trades);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ultra-accent mb-4">Open Trades</h1>

      {loading && <div>Loading…</div>}

      {!loading && trades.length === 0 && (
        <div className="text-gray-500">No open trades.</div>
      )}

      <div className="space-y-3">
        {trades.map((t) => (
          <div
            key={t.id}
            className="rounded-xl bg-ultra-card border border-ultra-border p-4"
          >
            <div className="flex justify-between">
              <span className="font-semibold">{t.symbol}</span>
              <span className={t.direction === "long" ? "text-ultra-positive" : "text-ultra-negative"}>
                {t.direction.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Entry: {t.entry ?? "—"} | Risk: {t.risk ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
