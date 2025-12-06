// XAUUSD OHLCV Data Helper - Fetch real candle data from AlphaVantage
import { cache } from "react";
import { getFxIntraday } from "./alphaVantage";

export type Timeframe = "M15" | "H1" | "H4" | "D1";

export type Candle = {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

// Map our timeframe format to AlphaVantage intervals
function timeframeToInterval(tf: Timeframe): "1min" | "5min" | "15min" | "30min" | "60min" {
  switch (tf) {
    case "M15":
      return "15min";
    case "H1":
      return "60min";
    case "H4":
      // H4 = 4 hours, AlphaVantage doesn't support this directly
      // We'll use 60min and aggregate later, or fetch daily and use that
      return "60min";
    case "D1":
      // For daily, we'll need a different endpoint
      return "60min"; // Placeholder
    default:
      return "15min";
  }
}

// Parse AlphaVantage FX_INTRADAY response into candles
function parseAlphaVantageFxIntraday(data: any): Candle[] {
  try {
    const timeSeriesKey = Object.keys(data).find((key) => key.includes("Time Series"));
    if (!timeSeriesKey) {
      return [];
    }

    const timeSeries = data[timeSeriesKey];
    const candles: Candle[] = [];

    for (const [timestamp, values] of Object.entries(timeSeries)) {
      const candle = values as any;
      candles.push({
        time: new Date(timestamp).getTime(),
        open: parseFloat(candle["1. open"] || candle.open || "0"),
        high: parseFloat(candle["2. high"] || candle.high || "0"),
        low: parseFloat(candle["3. low"] || candle.low || "0"),
        close: parseFloat(candle["4. close"] || candle.close || "0"),
        volume: 0, // FX data typically doesn't include volume
      });
    }

    // Sort by time (oldest first)
    return candles.sort((a, b) => a.time - b.time);
  } catch (err) {
    console.error("[xauusd] Failed to parse AlphaVantage response:", err);
    return [];
  }
}

// Fetch XAUUSD candles for a given timeframe
export const getXauusdCandles = cache(async (timeframe: Timeframe): Promise<Candle[]> => {
  try {
    // AlphaVantage FX_INTRADAY for XAU/USD (may not be supported, will fallback gracefully)
    const interval = timeframeToInterval(timeframe);
    const data = await getFxIntraday("XAU", "USD", interval);
    
    if (data["Error Message"] || data["Note"]) {
      console.warn("[xauusd] AlphaVantage API error:", data["Error Message"] || data["Note"]);
      // Return empty - caller can use market overview as fallback
      return [];
    }

    const candles = parseAlphaVantageFxIntraday(data);
    
    if (candles.length === 0) {
      return [];
    }
    
    // For H4, aggregate 60min candles into 4-hour candles
    if (timeframe === "H4" && candles.length > 0) {
      return aggregateCandles(candles, 4); // 4 hours
    }

    // For D1, we need daily data - for now return latest day's worth
    if (timeframe === "D1") {
      // Use last 24 hours of hourly data as approximation
      const last24Hours = candles.filter(
        (c) => c.time > Date.now() - 24 * 60 * 60 * 1000
      );
      if (last24Hours.length > 0) {
        return [aggregateCandlesToSingle(last24Hours)];
      }
    }

    return candles;
  } catch (err) {
    console.error("[xauusd] Failed to fetch candles:", err);
    // Return empty - caller should use market overview as fallback
    return [];
  }
});

// Aggregate candles (e.g., 4 hourly candles into 1 H4 candle)
function aggregateCandles(candles: Candle[], periods: number): Candle[] {
  const aggregated: Candle[] = [];
  
  for (let i = 0; i < candles.length; i += periods) {
    const group = candles.slice(i, i + periods);
    if (group.length === 0) continue;

    aggregated.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + c.volume, 0),
    });
  }

  return aggregated;
}

// Aggregate all candles into a single candle
function aggregateCandlesToSingle(candles: Candle[]): Candle {
  if (candles.length === 0) {
    throw new Error("Cannot aggregate empty candles array");
  }

  return {
    time: candles[0].time,
    open: candles[0].open,
    high: Math.max(...candles.map((c) => c.high)),
    low: Math.min(...candles.map((c) => c.low)),
    close: candles[candles.length - 1].close,
    volume: candles.reduce((sum, c) => sum + c.volume, 0),
  };
}

// Get latest OHLC for a timeframe
export async function getXauusdLatestOhlc(timeframe: Timeframe): Promise<{
  open: number;
  high: number;
  low: number;
  close: number;
} | null> {
  const candles = await getXauusdCandles(timeframe);
  if (candles.length === 0) {
    return null;
  }

  const latest = candles[candles.length - 1];
  return {
    open: latest.open,
    high: latest.high,
    low: latest.low,
    close: latest.close,
  };
}

