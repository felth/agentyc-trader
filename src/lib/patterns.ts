import type { Candle } from "@/lib/data/ohlcv";

// Utility: body size as % of range
function bodyPct(c: Candle): number {
  return Math.abs(c.close - c.open) / (c.high - c.low || 1);
}

export function detectCandlePattern(candles: Candle[]): string {
  if (candles.length < 3) return "None";

  const c1 = candles[candles.length - 3];
  const c2 = candles[candles.length - 2];
  const c3 = candles[candles.length - 1];

  // Inside Bar: current high/low within previous bar
  if (c2.high >= c3.high && c2.low <= c3.low) {
    return "Inside";
  }

  // Bullish Engulfing
  if (
    c2.close < c2.open && // prev down
    c3.close > c3.open && // current up
    c3.close > c2.open && // closes above prev open
    c3.open < c2.close // opens below prev close
  ) {
    return "Bullish Engulfing";
  }

  // Bearish Engulfing
  if (
    c2.close > c2.open && // prev up
    c3.close < c3.open && // current down
    c3.open > c2.close && // opens above prev close
    c3.close < c2.open // closes below prev open
  ) {
    return "Bearish Engulfing";
  }

  // Pin Bar: long wick (> 60% range), small body
  const wickTop = c3.high - Math.max(c3.close, c3.open);
  const wickBot = Math.min(c3.close, c3.open) - c3.low;
  const total = c3.high - c3.low;

  if (bodyPct(c3) < 0.3) {
    if (wickTop / total > 0.6) return "Bearish Pin Bar";
    if (wickBot / total > 0.6) return "Bullish Pin Bar";
  }

  return "None";
}

