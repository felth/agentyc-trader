import crypto from "crypto";

// Signed request generator (Binance standard) - only needed for signed requests
function sign(query: string, apiSecret: string) {
  return crypto.createHmac("sha256", apiSecret).update(query).digest("hex");
}

function getBaseUrl(): string {
  const BASE_URL = process.env.BINANCE_BASE_URL;
  if (!BASE_URL) {
    throw new Error("Missing BINANCE_BASE_URL");
  }
  return BASE_URL;
}

export async function binancePublic(path: string, params?: Record<string, any>) {
  const BASE_URL = getBaseUrl();
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.append(k, String(v));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Binance error: ${res.status}`);
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

