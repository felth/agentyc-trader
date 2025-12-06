"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Timeframe } from "@/lib/data/ohlcv";

type OhlcvData = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type Fundamentals = {
  marketCap?: number;
  pe?: number;
  dividendYield?: number;
  sector?: string;
  industry?: string;
  currency?: string;
  companyName?: string;
};

type NewsArticle = {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  url: string;
};

type Position = {
  symbol: string;
  quantity: number;
  avgPrice: number;
  marketPrice: number;
  unrealizedPnl: number;
};

function SparklineChart({ values, color = "#32D74B", width = 200, height = 80 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function SymbolPage() {
  const params = useParams();
  const ticker = (params.ticker as string)?.toUpperCase() || "";
  
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [ohlcv, setOhlcv] = useState<OhlcvData[]>([]);
  const [latestOhlc, setLatestOhlc] = useState<{ open: number; high: number; low: number; close: number } | null>(null);
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      if (!ticker) return;

      try {
        const [ohlcvRes, fundamentalsRes, newsRes, positionsRes] = await Promise.all([
          fetch(`/api/market/ohlcv?symbol=${ticker}&tf=${timeframe}`).then((r) => r.json()),
          fetch(`/api/market/fundamentals?symbol=${ticker}`).then((r) => r.json()),
          fetch(`/api/market/news?symbol=${ticker}&limit=5`).then((r) => r.json()),
          fetch("/api/ibkr/positions").then((r) => r.json()),
        ]);

        if (ohlcvRes.ok) {
          setOhlcv(ohlcvRes.candles || []);
          setLatestOhlc(ohlcvRes.latestOhlc || null);
          setProvider(ohlcvRes.provider || "");
        }

        if (fundamentalsRes.ok && fundamentalsRes.data) {
          setFundamentals(fundamentalsRes.data);
        }

        if (newsRes.ok && Array.isArray(newsRes.articles)) {
          setNews(newsRes.articles);
        }

        if (positionsRes.ok && Array.isArray(positionsRes.positions)) {
          const userPosition = positionsRes.positions.find((p: Position) => p.symbol === ticker);
          setPosition(userPosition || null);
        }
      } catch (err) {
        console.error("Failed to fetch symbol data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [ticker, timeframe]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-sm text-white/50">Loading {ticker}...</p>
          </div>
        </div>
      </main>
    );
  }

  const changePct = latestOhlc && ohlcv.length > 1
    ? ((latestOhlc.close - ohlcv[0].open) / ohlcv[0].open) * 100
    : null;

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{ticker}</h1>
            {fundamentals?.companyName && (
              <p className="text-sm text-white/50 mt-1">{fundamentals.companyName}</p>
            )}
          </div>
          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Price Header */}
        {latestOhlc && (
          <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold text-white">
                  ${latestOhlc.close.toFixed(2)}
                </p>
                {changePct !== null && (
                  <p className={`text-sm font-medium mt-1 ${changePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {changePct >= 0 ? "+" : ""}
                    {changePct.toFixed(2)}%
                  </p>
                )}
              </div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider">
                {provider} (live)
              </span>
            </div>

            {/* OHLC */}
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Open</p>
                <p className="text-sm font-semibold text-white">{latestOhlc.open.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">High</p>
                <p className="text-sm font-semibold text-emerald-400">{latestOhlc.high.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Low</p>
                <p className="text-sm font-semibold text-red-400">{latestOhlc.low.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Close</p>
                <p className="text-sm font-semibold text-white">{latestOhlc.close.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Two Column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart & News */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart */}
            <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">Price Chart</h2>
                <div className="flex gap-2">
                  {(["M15", "H1", "H4", "D1"] as Timeframe[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        timeframe === tf
                          ? "bg-white text-black"
                          : "bg-white/5 text-white/65 hover:bg-white/10"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              {ohlcv.length > 0 ? (
                <div className="h-64">
                  <SparklineChart
                    values={ohlcv.map((c) => c.close)}
                    color={latestOhlc && ohlcv.length > 1 && latestOhlc.close >= ohlcv[0].open ? "#10B981" : "#EF4444"}
                    width={600}
                    height={256}
                  />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-sm text-white/50">
                  Chart data unavailable
                </div>
              )}
            </div>

            {/* News */}
            <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
              <h2 className="text-base font-bold text-white mb-4">News</h2>
              {news.length > 0 ? (
                <div className="space-y-4">
                  {news.map((article) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <p className="text-sm font-medium text-white mb-1">{article.headline}</p>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>{article.source}</span>
                        <span>·</span>
                        <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/50">No news available</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Position Card */}
            {position ? (
              <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
                <h2 className="text-base font-bold text-white mb-4">Your Position</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Quantity</p>
                    <p className="text-lg font-semibold text-white">{position.quantity.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Avg Price</p>
                    <p className="text-lg font-semibold text-white">${position.avgPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Market Price</p>
                    <p className="text-lg font-semibold text-white">${position.marketPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Unrealized P&L</p>
                    <p className={`text-lg font-semibold ${position.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {position.unrealizedPnl >= 0 ? "+" : ""}
                      ${position.unrealizedPnl.toFixed(2)}
                    </p>
                  </div>
                  <Link
                    href={`/trades?tab=open&symbol=${ticker}`}
                    className="block mt-4 text-center text-xs text-white/60 hover:text-white transition-colors"
                  >
                    View in Trades →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
                <h2 className="text-base font-bold text-white mb-2">Your Position</h2>
                <p className="text-sm text-white/50">No active IBKR position</p>
              </div>
            )}

            {/* Stats */}
            <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
              <h2 className="text-base font-bold text-white mb-4">Statistics</h2>
              <div className="space-y-3">
                {fundamentals?.marketCap && (
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Market Cap</p>
                    <p className="text-sm font-semibold text-white">
                      ${(fundamentals.marketCap / 1e9).toFixed(2)}B
                    </p>
                  </div>
                )}
                {fundamentals?.pe && (
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1">P/E Ratio</p>
                    <p className="text-sm font-semibold text-white">{fundamentals.pe.toFixed(2)}</p>
                  </div>
                )}
                {fundamentals?.sector && (
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Sector</p>
                    <p className="text-sm font-semibold text-white">{fundamentals.sector}</p>
                  </div>
                )}
                {fundamentals?.industry && (
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Industry</p>
                    <p className="text-sm font-semibold text-white">{fundamentals.industry}</p>
                  </div>
                )}
                {!fundamentals?.marketCap && !fundamentals?.pe && (
                  <p className="text-sm text-white/50">Statistics unavailable</p>
                )}
              </div>
            </div>

            {/* Agent CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 p-6">
              <h2 className="text-base font-bold text-white mb-2">Ask Agent</h2>
              <p className="text-sm text-white/70 mb-4">Get insights about {ticker}</p>
              <Link
                href={`/agent?view=symbol&ticker=${ticker}`}
                className="block w-full text-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Ask Agent about {ticker} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

