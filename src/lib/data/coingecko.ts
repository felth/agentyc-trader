import { cache } from "react";

// Lazy getters for environment variables - only checked when functions are called
function getCoinGeckoBaseUrl(): string {
  const url = process.env.COINGECKO_BASE_URL;
  if (!url) {
    throw new Error("Missing COINGECKO_BASE_URL in environment");
  }
  return url;
}

function getCoinGeckoApiKey(): string {
  const key = process.env.COINGECKO_API_KEY;
  if (!key) {
    throw new Error("Missing COINGECKO_API_KEY in environment");
  }
  return key;
}

async function coingecko(path: string, params?: Record<string, string | number | boolean>): Promise<any> {
  const BASE_URL = getCoinGeckoBaseUrl();
  const API_KEY = getCoinGeckoApiKey();
  
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }
  url.searchParams.set("x_cg_pro_api_key", API_KEY);

  const res = await fetch(url.toString(), {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`CoinGecko error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export const getMarketOverview = cache(() =>
  coingecko("/global")
);

export const getSimplePrices = cache((ids: string[], vsCurrency = "usd") =>
  coingecko("/simple/price", {
    ids: ids.join(","),
    vs_currencies: vsCurrency,
    include_24hr_change: true,
  })
);

