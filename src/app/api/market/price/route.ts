import { NextRequest, NextResponse } from "next/server";
import { fmp } from "@/lib/data/fmp";
import { getTicker } from "@/lib/data/coinbase";
import { getSimplePrices } from "@/lib/data/coingecko";

export const dynamic = "force-dynamic";

type PriceResponse = {
  symbol: string;
  last: number;
  changePct: number;
  spread: number;
  session: string;
  status: "LIVE" | "ERROR" | "OK";
};

function getMarketSession(): string {
  const now = new Date();
  const hour = now.getUTCHours();
  
  // Simple session detection (can be improved)
  // US market: 13:30-20:00 UTC (9:30 AM - 4:00 PM ET)
  // Asia: 0:00-8:00 UTC
  // London: 8:00-17:00 UTC
  
  if (hour >= 13 && hour < 20) {
    return "US Open";
  } else if (hour >= 8 && hour < 13) {
    return "London";
  } else if (hour >= 0 && hour < 8) {
    return "Asia";
  } else {
    return "Closed";
  }
}

async function getFmpQuote(symbol: string): Promise<{ price: number; changePct: number } | null> {
  try {
    // Normalize symbol for FMP
    let fmpSymbol = symbol;
    
    // Handle index symbols
    if (symbol === "SPX") fmpSymbol = "^GSPC";
    else if (symbol === "NDX") fmpSymbol = "^NDX";
    else if (symbol === "VIX") fmpSymbol = "^VIX";
    
    const data = await fmp(`/quote/${fmpSymbol}`);
    if (Array.isArray(data) && data.length > 0) {
      const quote = data[0];
      const price = quote.price || 0;
      const change = quote.change || 0;
      const changePct = price > 0 ? (change / (price - change)) * 100 : 0;
      return { price, changePct };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function getCryptoPrice(symbol: string): Promise<{ price: number; changePct: number } | null> {
  try {
    const normalized = symbol.toUpperCase().replace("USD", "");
    
    // Try Coinbase first
    try {
      const ticker = await getTicker(`${normalized}-USD`);
      const price = parseFloat(ticker.price || "0");
      const changePct = parseFloat(ticker.price_percentage_change_24h || "0");
      return { price, changePct };
    } catch {
      // Fallback to CoinGecko
      const coinIds: Record<string, string> = {
        BTC: "bitcoin",
        ETH: "ethereum",
      };
      
      const coinId = coinIds[normalized];
      if (coinId) {
        const prices = await getSimplePrices([coinId], "usd");
        const coin = prices[coinId];
        return {
          price: coin.usd || 0,
          changePct: coin.usd_24h_change || 0,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getFxPrice(symbol: string): Promise<{ price: number; changePct: number; spread: number } | null> {
  try {
    // For FX pairs like XAUUSD, try FMP
    const quote = await getFmpQuote(symbol);
    if (quote) {
      // Estimate spread (can be improved with real bid/ask)
      const spread = quote.price * 0.0001; // ~0.01% typical for XAUUSD
      return { ...quote, spread };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get("ticker")?.toUpperCase();
    
    if (!ticker) {
      return NextResponse.json(
        { symbol: "", last: 0, changePct: 0, spread: 0, session: "Closed", status: "ERROR" as const },
        { status: 400 }
      );
    }
    
    const session = getMarketSession();
    
    // Determine symbol type and fetch price
    const isCrypto = /^(BTC|ETH|LTC|XRP|ADA|DOT|SOL|AVAX|MATIC|LINK)(USD)?$/i.test(ticker);
    const isFx = /^[A-Z]{3,6}(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD)$/.test(ticker);
    
    let last = 0;
    let changePct = 0;
    let spread = 0;
    let status: "LIVE" | "ERROR" | "OK" = "ERROR";
    
    if (isCrypto) {
      const cryptoData = await getCryptoPrice(ticker);
      if (cryptoData) {
        last = cryptoData.price;
        changePct = cryptoData.changePct;
        spread = last * 0.0005; // Estimate 0.05% spread for crypto
        status = last > 0 ? "LIVE" : "ERROR";
      }
    } else if (isFx) {
      const fxData = await getFxPrice(ticker);
      if (fxData) {
        last = fxData.price;
        changePct = fxData.changePct;
        spread = fxData.spread;
        status = last > 0 ? "LIVE" : "ERROR";
      }
    } else {
      // Stocks/indices via FMP
      const quote = await getFmpQuote(ticker);
      if (quote && quote.price > 0) {
        last = quote.price;
        changePct = quote.changePct;
        spread = 0; // Stocks don't show spread in this format
        status = "LIVE";
      }
    }
    
    const response: PriceResponse = {
      symbol: ticker,
      last,
      changePct,
      spread,
      session,
      status: last > 0 ? status : "ERROR",
    };
    
    return NextResponse.json(response);
  } catch (err: any) {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get("ticker")?.toUpperCase() || "";
    
    return NextResponse.json({
      symbol: ticker,
      last: 0,
      changePct: 0,
      spread: 0,
      session: "Closed",
      status: "ERROR" as const,
    });
  }
}

