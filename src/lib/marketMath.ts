// DROP A — Trend & Volatility Intelligence

import type { Candle } from "@/lib/data/ohlcv";

// Simple 20-period SMA
export function sma(values: number[], period = 20): number {
  if (values.length < period) return values[values.length - 1];
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// True Range
function trueRange(prevClose: number, high: number, low: number): number {
  return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
}

// ATR(14)
export function atr(candles: Candle[]): number {
  if (candles.length < 15) return 0;
  let sum = 0;
  for (let i = candles.length - 14; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    sum += trueRange(prev.close, c.high, c.low);
  }
  return sum / 14;
}

// Trend Regime
export function getTrendRegime(closes: number[]): "UP" | "DOWN" | "RANGE" {
  const avg = sma(closes);
  const last = closes[closes.length - 1];

  if (last > avg * 1.003) return "UP";
  if (last < avg * 0.997) return "DOWN";
  return "RANGE";
}

// ATR Percentile (relative to past 100 bars)
export function getVolatilityPercentile(candles: Candle[]): number {
  if (candles.length < 30) return 50;
  const atrCurrent = atr(candles);
  const atrHistory = candles.slice(-100).map((c: Candle, i: number, arr: Candle[]) => {
    if (i === 0) return 0;
    return trueRange(arr[i - 1].close, c.high, c.low);
  });
  const sorted = [...atrHistory].sort((a, b) => a - b);
  const rank = sorted.findIndex((v) => v > atrCurrent);
  return Math.floor((rank / sorted.length) * 100);
}

