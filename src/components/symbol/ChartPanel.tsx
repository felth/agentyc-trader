"use client";

import { useEffect, useState } from "react";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

type OHLC = {
  t: number; // timestamp ms
  o: number;
  h: number;
  l: number;
  c: number;
};

export default function ChartPanel({ ticker }: { ticker: string }) {
  const [tf, setTf] = useState<"5m" | "1h" | "1d">("5m");
  const [data, setData] = useState<OHLC[]>([]);
  const [status, setStatus] = useState<"LIVE" | "ERROR" | "DEGRADED">("LIVE");

  async function loadData() {
    try {
      const res = await fetch(
        `/api/market/ohlc?ticker=${ticker}&tf=${tf}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json.data || []);
      setStatus(json.status || "LIVE");
    } catch {
      setStatus("ERROR");
    }
  }

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 30000); // refresh every 30s
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, tf]);

  // Calculate chart bounds
  if (data.length === 0) {
    return (
      <div className="relative w-full rounded-3xl bg-[#111111] p-6">
        <SourceStatusBadge provider="FMP" status={status} />
        <div className="flex gap-3 mb-4">
          {(["5m", "1h", "1d"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-3 py-1 rounded-full text-[13px] font-semibold ${
                tf === t ? "bg-white text-black" : "bg-[#1A1A1A] text-[#9EA6AE]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="h-[240px] flex items-center justify-center text-[#9EA6AE] text-sm">
          No chart data available
        </div>
      </div>
    );
  }

  const minPrice = Math.min(...data.map((d) => d.l));
  const maxPrice = Math.max(...data.map((d) => d.h));
  const priceRange = maxPrice - minPrice || 1;

  return (
    <div className="relative w-full rounded-3xl bg-[#111111] p-6">
      <SourceStatusBadge provider="FMP" status={status} />

      {/* Timeframe selector */}
      <div className="flex gap-3 mb-4">
        {(["5m", "1h", "1d"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTf(t)}
            className={`px-3 py-1 rounded-full text-[13px] font-semibold ${
              tf === t ? "bg-white text-black" : "bg-[#1A1A1A] text-[#9EA6AE]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Chart SVG */}
      <svg width="100%" height="240" viewBox="0 0 600 240" className="overflow-visible">
        {data.map((candle, i) => {
          const x = (i / (data.length - 1 || 1)) * 600;
          const yHigh = 240 - ((candle.h - minPrice) / priceRange) * 240;
          const yLow = 240 - ((candle.l - minPrice) / priceRange) * 240;
          const yOpen = 240 - ((candle.o - minPrice) / priceRange) * 240;
          const yClose = 240 - ((candle.c - minPrice) / priceRange) * 240;
          const isGreen = candle.c >= candle.o;
          const color = isGreen ? "#00FF7F" : "#FF4D4D";

          return (
            <g key={i}>
              {/* Wick */}
              <line
                x1={x}
                x2={x}
                y1={yHigh}
                y2={yLow}
                stroke={color}
                strokeWidth="1"
              />
              {/* Body */}
              <rect
                x={x - 2}
                y={Math.min(yOpen, yClose)}
                width="4"
                height={Math.max(Math.abs(yClose - yOpen), 1)}
                fill={color}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

