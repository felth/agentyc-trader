"use client";

import Link from "next/link";
import SourceStatusBadge, { type Status } from "@/components/ui/SourceStatusBadge";

// Simple Sparkline Chart Component
function SparklineChart({
  values,
  color = "#00FF7F",
  width = 60,
  height = 24,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values
    .map((val, idx) => {
      const x = idx * stepX;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type WatchlistItem = {
  symbol: string;
  lastPrice: number;
  changePct: number;
  sparklineData: number[]; // Last N prices for sparkline
  spread?: number; // For FX instruments
  status: Status;
};

type InteractiveWatchlistProps = {
  items: WatchlistItem[];
};

export default function InteractiveWatchlist({
  items,
}: InteractiveWatchlistProps) {
  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-7">
      <div className="absolute top-4 right-4">
        <SourceStatusBadge provider="FMP" status="LIVE" />
      </div>

          <div className="pr-20 mb-4">
            <h3 className="text-[16px] font-semibold text-white">Watchlist</h3>
          </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((item) => {
          const changeColor =
            item.changePct >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]";

          return (
            <Link
              key={item.symbol}
              href={`/symbol/${item.symbol}`}
              className="flex-shrink-0 w-[140px] rounded-xl bg-white/5 border border-white/10 p-4 cursor-pointer transition-all duration-150 hover:scale-105 hover:bg-white/10 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-semibold text-white">
                  {item.symbol}
                </span>
                {item.status === "ERROR" && (
                  <div className="w-2 h-2 rounded-full bg-[#FF4D4D]" />
                )}
              </div>

              <p className="text-[18px] font-semibold text-white mb-1">
                ${item.lastPrice.toFixed(2)}
              </p>

              <div className="mb-2 h-[24px]">
                <SparklineChart
                  values={item.sparklineData}
                  color={item.changePct >= 0 ? "#00FF7F" : "#FF4D4D"}
                  width={60}
                  height={24}
                />
              </div>

              <div className="flex items-center justify-between">
                <p className={`text-[12px] font-medium ${changeColor}`}>
                  {item.changePct >= 0 ? "+" : ""}
                  {item.changePct.toFixed(2)}%
                </p>
                {item.spread !== undefined && (
                  <p className="text-[10px] text-white/40">
                    {item.spread.toFixed(2)} spread
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

