import type { Candle } from "@/lib/data/ohlcv";

// Average candle body % of range
function avgBody(candles: Candle[]): number {
  const arr = candles.slice(-10);
  return (
    arr.reduce((acc, c) => {
      const range = c.high - c.low || 1;
      return acc + Math.abs(c.close - c.open) / range;
    }, 0) / arr.length
  );
}

// Direction of last 3 closes
function direction(closes: number[]): number {
  const last3 = closes.slice(-3);
  const signs = last3.map((c, i, arr) =>
    i === 0 ? 0 : Math.sign(c - arr[i - 1])
  );
  return signs.reduce((a, b) => a + b, 0); // >0 = up, <0 = down, 0 = mixed
}

export function classifyMomentum(candles: Candle[]): string {
  if (candles.length < 10) return "Unknown";

  const closes = candles.map((c) => c.close);
  const dir = direction(closes);
  const bodyAvg = avgBody(candles);

  // Strong momentum: aligned closes + larger bodies
  if (dir > 1 && bodyAvg > 0.35) return "Strong";
  if (dir < -1 && bodyAvg > 0.35) return "Strong";

  // Weak: mixed closes or small bodies
  if (Math.abs(dir) <= 1) return "Weak";
  if (bodyAvg < 0.25) return "Weak";

  return "Stalling";
}

