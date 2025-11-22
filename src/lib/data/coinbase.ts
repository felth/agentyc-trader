// Coinbase Exchange API client
// Public market data endpoints (no authentication required)
// Base URL: https://api.exchange.coinbase.com

const BASE_URL = process.env.COINBASE_BASE_URL || "https://api.exchange.coinbase.com";

export async function coinbasePublic(path: string, params?: Record<string, any>): Promise<any> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.append(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Coinbase error ${res.status}: ${errorText || res.statusText}`);
  }

  return res.json();
}

// Get ticker/price for a product
// Product ID format: BTC-USD, ETH-USD, etc.
// Endpoint: GET /products/{product_id}/ticker
export function getTicker(productId: string) {
  return coinbasePublic(`/products/${productId}/ticker`);
}

// Get order book for a product
// Product ID format: BTC-USD, ETH-USD, etc.
// level: 1 (best bid/ask), 2 (top 50 bids/asks), 3 (full order book)
// Default: level 2 (top 50 bids/asks)
export function getOrderBook(productId: string, level: 1 | 2 | 3 = 2) {
  return coinbasePublic(`/products/${productId}/book`, { level });
}

// Helper: Convert Binance symbol format (BTCUSDT) to Coinbase format (BTC-USD)
export function binanceToCoinbaseSymbol(symbol: string): string {
  // BTCUSDT -> BTC-USD
  // ETHUSDT -> ETH-USD
  if (symbol.endsWith("USDT")) {
    const base = symbol.slice(0, -4);
    return `${base}-USD`;
  }
  // If already in Coinbase format or other format, return as-is
  return symbol;
}

