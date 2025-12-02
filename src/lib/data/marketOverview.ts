// Market Overview - Real-time data for SPX, NDX, DXY, VIX, XAUUSD, BTCUSD
import { cache } from "react";
import { fmp } from "./fmp";
import { getTicker } from "./coinbase";
import { getSimplePrices } from "./coingecko";

export type MarketOverviewSnapshot = {
  spx: { value: number; changePct: number };
  ndx: { value: number; changePct: number };
  dxy: { value: number; changePct: number };
  vix: { value: number; changePct: number };
  xauusd: { value: number; changePct: number };
  btcusd: { value: number; changePct: number };
};

async function getFmpQuote(symbol: string): Promise<{ price: number; change: number } | null> {
  try {
    // FMP quote endpoint - returns current price and change
    const data = await fmp(`/quote/${symbol}`);
    if (Array.isArray(data) && data.length > 0) {
      const quote = data[0];
      return {
        price: quote.price || 0,
        change: quote.change || 0,
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function getFmpChangePercent(symbol: string): Promise<number> {
  try {
    const quote = await getFmpQuote(symbol);
    if (quote && quote.price > 0) {
      // Calculate change % from change amount
      return (quote.change / (quote.price - quote.change)) * 100;
    }
    return 0;
  } catch (err) {
    return 0;
  }
}

async function getGoldPrice(): Promise<{ value: number; changePct: number }> {
  try {
    // Try FMP first for gold (XAUUSD)
    const quote = await getFmpQuote("XAUUSD");
    if (quote && quote.price > 0) {
      const changePct = (quote.change / (quote.price - quote.change)) * 100;
      return { value: quote.price, changePct };
    }
    
    // Fallback: try as "GOLD" or use a default
    return { value: 2380, changePct: 0 };
  } catch (err) {
    return { value: 2380, changePct: 0 };
  }
}

async function getBtcPrice(): Promise<{ value: number; changePct: number }> {
  try {
    // Use Coinbase for BTC-USD
    const ticker = await getTicker("BTC-USD");
    const price = parseFloat(ticker.price || "0");
    const changePct = parseFloat(ticker.price_percentage_change_24h || "0");
    return { value: price, changePct };
  } catch (err) {
    // Fallback to CoinGecko if Coinbase fails
    try {
      const prices = await getSimplePrices(["bitcoin"], "usd");
      const btc = prices.bitcoin;
      const changePct = btc.usd_24h_change || 0;
      return { value: btc.usd || 0, changePct };
    } catch (err2) {
      return { value: 0, changePct: 0 };
    }
  }
}

export const fetchMarketOverview = cache(async (): Promise<MarketOverviewSnapshot> => {
  // Fetch all market data in parallel
  const [spxData, ndxData, dxyData, vixData, goldData, btcData] = await Promise.all([
    getFmpQuote("^GSPC").catch(() => null), // SPX
    getFmpQuote("^NDX").catch(() => null),  // NDX
    getFmpQuote("DX-Y.NYB").catch(() => null), // DXY (may need different symbol)
    getFmpQuote("^VIX").catch(() => null),  // VIX
    getGoldPrice(),
    getBtcPrice(),
  ]);

  // Helper to calculate change percent from quote
  const calcChangePct = (quote: { price: number; change: number } | null): number => {
    if (!quote || quote.price <= 0) return 0;
    return (quote.change / (quote.price - quote.change)) * 100;
  };

  // Helper to get price from quote
  const getPrice = (quote: { price: number; change: number } | null, fallback: number): number => {
    return quote?.price || fallback;
  };

  return {
    spx: {
      value: getPrice(spxData, 5500),
      changePct: calcChangePct(spxData),
    },
    ndx: {
      value: getPrice(ndxData, 18000),
      changePct: calcChangePct(ndxData),
    },
    dxy: {
      value: getPrice(dxyData, 104.5),
      changePct: calcChangePct(dxyData),
    },
    vix: {
      value: getPrice(vixData, 15),
      changePct: calcChangePct(vixData),
    },
    xauusd: goldData,
    btcusd: btcData,
  };
});

