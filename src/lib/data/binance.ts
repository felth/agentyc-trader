import crypto from "crypto";

// Signed request generator (Binance standard) - only needed for signed requests
export function sign(query: string, apiSecret: string) {
  return crypto.createHmac("sha256", apiSecret).update(query).digest("hex");
}

// Alternative Binance API endpoints to try (in order of preference)
// These are load-balanced alternatives that may bypass geographic restrictions
const BINANCE_ENDPOINTS = [
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://api.binance.com",
];

export async function binancePublic(path: string, params?: Record<string, any>): Promise<any> {
  // If BASE_URL is explicitly set in env, use it (no fallback)
  if (process.env.BINANCE_BASE_URL) {
    const url = new URL(`${process.env.BINANCE_BASE_URL}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.append(k, String(v));
      }
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Binance error ${res.status}: ${errorText || res.statusText}`);
    }
    return res.json();
  }

  // Otherwise, try endpoints in order until one works
  let lastError: Error | null = null;
  for (const baseUrl of BINANCE_ENDPOINTS) {
    try {
      const url = new URL(`${baseUrl}${path}`);
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          url.searchParams.append(k, String(v));
        }
      }
      
      const res = await fetch(url.toString());
      
      if (res.ok) {
        return res.json();
      }
      
      const errorText = await res.text().catch(() => "");
      
      // If 451 or 404, try next endpoint
      if (res.status === 451 || res.status === 404) {
        lastError = new Error(`Binance ${res.status} from ${baseUrl}: ${errorText || res.statusText}`);
        continue; // Try next endpoint
      }
      
      // For other errors, throw immediately
      throw new Error(`Binance error ${res.status} from ${baseUrl}: ${errorText || res.statusText}`);
    } catch (error: any) {
      // If it's a network error or the last endpoint, save and continue/throw
      if (baseUrl === BINANCE_ENDPOINTS[BINANCE_ENDPOINTS.length - 1]) {
        throw error;
      }
      lastError = error;
    }
  }
  
  // If all endpoints failed, throw the last error
  throw lastError || new Error("All Binance endpoints failed");
}

// Example: order book
export function getOrderBook(symbol: string, limit = 50) {
  return binancePublic("/api/v3/depth", { symbol, limit });
}

// Example: ticker price
export function getTicker(symbol: string) {
  return binancePublic("/api/v3/ticker/price", { symbol });
}

