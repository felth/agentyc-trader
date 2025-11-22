import crypto from "crypto";

const API_KEY = process.env.BINANCE_API_KEY!;
const API_SECRET = process.env.BINANCE_API_SECRET!;
const BASE_URL = process.env.BINANCE_BASE_URL!;

// Validate environment variables
if (!API_KEY || !API_SECRET || !BASE_URL) {
  throw new Error("Missing BINANCE_API_KEY, BINANCE_API_SECRET, or BINANCE_BASE_URL");
}

// Signed request generator (Binance standard)
function sign(query: string) {
  return crypto.createHmac("sha256", API_SECRET).update(query).digest("hex");
}

export async function binancePublic(path: string, params?: Record<string, any>) {
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

