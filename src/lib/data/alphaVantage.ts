import { cache } from "react";

const ALPHAVANTAGE_BASE_URL = "https://www.alphavantage.co/query";

// Lazy getter for API key - only checked when function is called
function getAlphaVantageApiKey(): string {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("ALPHAVANTAGE_API_KEY is not set");
  }
  return apiKey;
}

async function alpha(params: Record<string, string | number>): Promise<any> {
  const API_KEY = getAlphaVantageApiKey();
  
  const url = new URL(ALPHAVANTAGE_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, String(value));
  }
  url.searchParams.append("apikey", API_KEY);

  const res = await fetch(url.toString(), {
    // short cache, we'll tune later
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Alpha Vantage error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// FX – intraday (e.g. EURUSD, XAUUSD)
export const getFxIntraday = cache((
  fromSymbol: string,
  toSymbol: string,
  interval: "1min" | "5min" | "15min" | "30min" | "60min" = "15min"
) =>
  alpha({
    function: "FX_INTRADAY",
    from_symbol: fromSymbol,
    to_symbol: toSymbol,
    interval,
    outputsize: "compact",
  })
);

// Crypto (e.g. BTCUSD, ETHUSD)
export const getCryptoIntraday = cache((
  symbol: string,
  market: string = "USD"
) =>
  alpha({
    function: "CRYPTO_INTRADAY",
    symbol,
    market,
    interval: "15min",
    outputsize: "compact",
  })
);

// Global quote for equities / ETFs (e.g. SPY, QQQ)
export const getGlobalQuote = cache((symbol: string) =>
  alpha({
    function: "GLOBAL_QUOTE",
    symbol,
  })
);

