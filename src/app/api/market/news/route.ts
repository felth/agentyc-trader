import { NextRequest, NextResponse } from "next/server";
import { fmp } from "@/lib/data/fmp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!symbol) {
      return NextResponse.json(
        { ok: false, error: "Missing required parameter: symbol" },
        { status: 400 }
      );
    }

    // Normalize symbol for FMP (indices use ^ prefix)
    const normalizedSymbol = symbol.startsWith("^") ? symbol : symbol;

    try {
      // FMP news endpoint
      const data = await fmp(`/stock-news/${normalizedSymbol}`, { limit });
      
      if (!Array.isArray(data)) {
        return NextResponse.json({
          ok: true,
          symbol,
          articles: [],
        });
      }

      const articles = data.slice(0, limit).map((item: any, index: number) => ({
        id: item.url || `article-${index}-${Date.now()}`,
        headline: item.title || item.headline || "",
        source: item.site || item.source || "Unknown",
        publishedAt: item.publishedDate || item.date || new Date().toISOString(),
        url: item.url || "",
      }));

      return NextResponse.json({
        ok: true,
        symbol,
        articles,
      });
    } catch (err: any) {
      console.error(`[api/market/news] FMP fetch failed for ${symbol}:`, err);
      // Return empty array instead of error for graceful degradation
      return NextResponse.json({
        ok: true,
        symbol,
        articles: [],
      });
    }
  } catch (err: any) {
    console.error("[api/market/news] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to fetch news" },
      { status: 500 }
    );
  }
}

