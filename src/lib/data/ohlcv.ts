// Generic OHLCV Data Helper - Fetch candles for any symbol/timeframe
import { cache } from "react";
import { getFxIntraday, getCryptoIntraday, getGlobalQuote } from "./alphaVantage";
import { fmp } from "./fmp";

export type Timeframe = "M15" | "H1" | "H4" | "D1";

export type Candle = {
  timestamp: string; // ISO format
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

// Map our timeframe format to AlphaVantage intervals
function timeframeToInterval(tf: Timeframe): "1min" | "5min" | "15min" | "30min" | "60min" {
  switch (tf) {
    case "M15":
      return "15min";
    case "H1":
      return "60min";
    case "H4":
      return "60min"; // Will aggregate to 4-hour
    case "D1":
      return "60min"; // Will aggregate to daily
    default:
      return "15min";
  }
}

// Determine if symbol is FX pair (e.g., XAUUSD, EURUSD)
function isFxPair(symbol: string): boolean {
  const fxPattern = /^[A-Z]{3,6}(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD)$/;
  return fxPattern.test(symbol);
}

// Determine if symbol is crypto (e.g., BTCUSD, ETHUSD)
function isCrypto(symbol: string): boolean {
  const cryptoPattern = /^(BTC|ETH|LTC|XRP|ADA|DOT|SOL|AVAX|MATIC|LINK)(USD)?$/i;
  return cryptoPattern.test(symbol);
}

// Normalize symbol for different providers
function normalizeSymbol(symbol: string, provider: "alphavantage" | "fmp"): string {
  // For AlphaVantage FX, need to split XAUUSD -> XAU/USD
  if (provider === "alphavantage" && isFxPair(symbol)) {
    if (symbol.length === 6) {
      const base = symbol.slice(0, 3);
      const quote = symbol.slice(3, 6);
      return `${base}/${quote}`;
    }
  }
  
  // For indices, FMP uses ^ prefix
  if (provider === "fmp" && ["SPX", "NDX", "VIX", "DXY"].includes(symbol)) {
    return `^${symbol}`;
  }
  
  return symbol;
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
      const date = new Date(timestamp);
      candles.push({
        timestamp: date.toISOString(),
        open: parseFloat(candle["1. open"] || candle.open || "0"),
        high: parseFloat(candle["2. high"] || candle.high || "0"),
        low: parseFloat(candle["3. low"] || candle.low || "0"),
        close: parseFloat(candle["4. close"] || candle.close || "0"),
        volume: 0, // FX data typically doesn't include volume
      });
    }

    // Sort by time (oldest first)
    return candles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (err) {
    console.error("[ohlcv] Failed to parse AlphaVantage FX response:", err);
    return [];
  }
}

// Parse AlphaVantage CRYPTO_INTRADAY response
function parseAlphaVantageCryptoIntraday(data: any): Candle[] {
  try {
    const timeSeriesKey = Object.keys(data).find((key) => key.includes("Time Series"));
    if (!timeSeriesKey) {
      return [];
    }

    const timeSeries = data[timeSeriesKey];
    const candles: Candle[] = [];

    for (const [timestamp, values] of Object.entries(timeSeries)) {
      const candle = values as any;
      const date = new Date(timestamp);
      candles.push({
        timestamp: date.toISOString(),
        open: parseFloat(candle["1. open"] || candle.open || "0"),
        high: parseFloat(candle["2. high"] || candle.high || "0"),
        low: parseFloat(candle["3. low"] || candle.low || "0"),
        close: parseFloat(candle["4. close"] || candle.close || "0"),
        volume: parseFloat(candle["5. volume"] || candle.volume || "0"),
      });
    }

    return candles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (err) {
    console.error("[ohlcv] Failed to parse AlphaVantage Crypto response:", err);
    return [];
  }
}

// Fetch FMP historical price data
async function fetchFmpHistorical(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
  try {
    const normalized = normalizeSymbol(symbol, "fmp");
    
    // FMP historical price endpoint
    // For daily data
    if (timeframe === "D1") {
      const data = await fmp(`/historical-price-full/${normalized}`, { limit: 100 });
      if (data && data.historical && Array.isArray(data.historical)) {
        return data.historical.map((item: any) => ({
          timestamp: new Date(item.date).toISOString(),
          open: parseFloat(item.open || "0"),
          high: parseFloat(item.high || "0"),
          low: parseFloat(item.low || "0"),
          close: parseFloat(item.close || "0"),
          volume: parseFloat(item.volume || "0"),
        })).reverse(); // Reverse to get oldest first
      }
    }
    
    // For intraday, FMP may not support all timeframes
    // Fallback to daily aggregation
    return [];
  } catch (err) {
    console.error("[ohlcv] FMP historical fetch failed:", err);
    return [];
  }
}

// Aggregate candles (e.g., 4 hourly candles into 1 H4 candle)
function aggregateCandles(candles: Candle[], periods: number): Candle[] {
  if (candles.length === 0) return [];
  
  const aggregated: Candle[] = [];
  
  for (let i = 0; i < candles.length; i += periods) {
    const group = candles.slice(i, i + periods);
    if (group.length === 0) continue;

    aggregated.push({
      timestamp: group[0].timestamp,
      open: group[0].open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + (c.volume || 0), 0),
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
    timestamp: candles[0].timestamp,
    open: candles[0].open,
    high: Math.max(...candles.map((c) => c.high)),
    low: Math.min(...candles.map((c) => c.low)),
    close: candles[candles.length - 1].close,
    volume: candles.reduce((sum, c) => sum + (c.volume || 0), 0),
  };
}

// Main function to fetch OHLCV candles for any symbol
export const getOhlcv = cache(async (
  symbol: string,
  timeframe: Timeframe
): Promise<{ candles: Candle[]; provider: "AlphaVantage" | "FMP" }> => {
  try {
    // Try AlphaVantage for FX pairs
    if (isFxPair(symbol)) {
      try {
        const normalized = normalizeSymbol(symbol, "alphavantage");
        const parts = normalized.split("/");
        if (parts.length === 2) {
          const interval = timeframeToInterval(timeframe);
          const data = await getFxIntraday(parts[0], parts[1], interval);
          
          if (data["Error Message"] || data["Note"]) {
            console.warn(`[ohlcv] AlphaVantage FX error for ${symbol}:`, data["Error Message"] || data["Note"]);
            // Try FMP as fallback
            return { candles: await fetchFmpHistorical(symbol, timeframe), provider: "FMP" };
          }

          let candles = parseAlphaVantageFxIntraday(data);
          
          // Aggregate for H4 and D1
          if (timeframe === "H4" && candles.length > 0) {
            candles = aggregateCandles(candles, 4);
          } else if (timeframe === "D1" && candles.length > 0) {
            const last24Hours = candles.filter(
              (c) => new Date(c.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
            );
            if (last24Hours.length > 0) {
              candles = [aggregateCandlesToSingle(last24Hours)];
            }
          }
          
          return { candles, provider: "AlphaVantage" };
        }
      } catch (err) {
        console.error(`[ohlcv] AlphaVantage FX fetch failed for ${symbol}:`, err);
      }
    }
    
    // Try AlphaVantage for crypto
    if (isCrypto(symbol)) {
      try {
        const interval = timeframeToInterval(timeframe);
        const cryptoSymbol = symbol.replace("USD", "");
        const data = await getCryptoIntraday(cryptoSymbol, "USD");
        
        if (data["Error Message"] || data["Note"]) {
          console.warn(`[ohlcv] AlphaVantage Crypto error for ${symbol}:`, data["Error Message"] || data["Note"]);
          return { candles: [], provider: "AlphaVantage" };
        }

        let candles = parseAlphaVantageCryptoIntraday(data);
        
        // Aggregate for H4 and D1
        if (timeframe === "H4" && candles.length > 0) {
          candles = aggregateCandles(candles, 4);
        } else if (timeframe === "D1" && candles.length > 0) {
          const last24Hours = candles.filter(
            (c) => new Date(c.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
          );
          if (last24Hours.length > 0) {
            candles = [aggregateCandlesToSingle(last24Hours)];
          }
        }
        
        return { candles, provider: "AlphaVantage" };
      } catch (err) {
        console.error(`[ohlcv] AlphaVantage Crypto fetch failed for ${symbol}:`, err);
      }
    }
    
    // Try FMP for equities, indices, ETFs
    try {
      const candles = await fetchFmpHistorical(symbol, timeframe);
      if (candles.length > 0) {
        return { candles, provider: "FMP" };
      }
    } catch (err) {
      console.error(`[ohlcv] FMP fetch failed for ${symbol}:`, err);
    }
    
    // If all providers fail, return empty
    return { candles: [], provider: "FMP" };
  } catch (err) {
    console.error(`[ohlcv] Failed to fetch OHLCV for ${symbol}:`, err);
    return { candles: [], provider: "FMP" };
  }
});

// Get latest OHLC for a symbol/timeframe
export async function getLatestOhlc(
  symbol: string,
  timeframe: Timeframe
): Promise<{
  open: number;
  high: number;
  low: number;
  close: number;
} | null> {
  const { candles } = await getOhlcv(symbol, timeframe);
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

