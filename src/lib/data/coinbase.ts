// Coinbase Advanced Trade API client
// Public market data endpoints (no authentication required)
// Base URL: https://api.coinbase.com/api/v3/brokerage

const BASE_URL = process.env.COINBASE_BASE_URL || "https://api.coinbase.com/api/v3/brokerage";

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
export function getTicker(productId: string) {
  return coinbasePublic(`/products/${productId}/ticker`);
}

// Get order book for a product
// Product ID format: BTC-USD, ETH-USD, etc.
// limit: number of levels (default 50)
export function getOrderBook(productId: string, limit = 50) {
  return coinbasePublic(`/products/${productId}/book`, { limit });
}

// Get product details
export function getProduct(productId: string) {
  return coinbasePublic(`/products/${productId}`);
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

