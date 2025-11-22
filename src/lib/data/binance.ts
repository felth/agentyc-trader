import crypto from "crypto";

// Signed request generator (Binance standard) - only needed for signed requests
export function sign(query: string, apiSecret: string) {
  return crypto.createHmac("sha256", apiSecret).update(query).digest("hex");
}

export async function binancePublic(path: string, params?: Record<string, any>) {
  // Check env var at runtime, not module load time
  const BASE_URL = process.env.BINANCE_BASE_URL || "https://api.binance.com";
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.append(k, String(v));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    if (res.status === 451) {
      throw new Error(`Binance IP restriction (451): Your server IP may not be whitelisted. Check Binance API settings for IP restrictions.`);
    }
    throw new Error(`Binance error ${res.status}: ${errorText || res.statusText}`);
  }
  return res.json();
}

// Example: order book
export function getOrderBook(symbol: string, limit = 50) {
  return binancePublic("/api/v3/depth", { symbol, limit });
}

// Example: ticker price
export function getTicker(symbol: string) {
  return binancePublic("/api/v3/ticker/price", { symbol });
}

