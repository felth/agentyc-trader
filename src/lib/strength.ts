import type { Candle } from "@/lib/data/ohlcv";
import { getTrendRegime, getVolatilityPercentile } from "./marketMath";
import { detectCandlePattern } from "./patterns";
import { classifyMomentum } from "./momentum";

export function computeStrengthScore(candles: Candle[]): number {
  if (candles.length < 30) return 50; // insufficient data

  const closes = candles.map((c) => c.close);
  const trend = getTrendRegime(closes);
  const volPct = getVolatilityPercentile(candles);
  const pattern = detectCandlePattern(candles);
  const momentum = classifyMomentum(candles);

  let score = 0;

  // Trend (40%)
  if (trend === "UP" || trend === "DOWN") score += 40;

  // Volatility (20%) — target 40–70th percentile
  if (volPct >= 40 && volPct <= 70) score += 20;

  // Pattern (25%)
  if (
    pattern === "Bullish Engulfing" ||
    pattern === "Bearish Engulfing" ||
    pattern.includes("Pin Bar")
  ) {
    score += 25;
  }

  // Momentum (15%)
  if (momentum === "Strong") score += 15;

  return Math.min(score, 100);
}

