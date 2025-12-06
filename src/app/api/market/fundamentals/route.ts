import { NextRequest, NextResponse } from "next/server";
import { fmp } from "@/lib/data/fmp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { ok: false, error: "Missing required parameter: symbol" },
        { status: 400 }
      );
    }

    // Normalize symbol for FMP (indices use ^ prefix)
    const normalizedSymbol = symbol.startsWith("^") ? symbol : symbol;

    try {
      // Try FMP profile endpoint for company fundamentals
      const profileData = await fmp(`/profile/${normalizedSymbol}`);
      
      if (Array.isArray(profileData) && profileData.length > 0) {
        const profile = profileData[0];
        return NextResponse.json({
          ok: true,
          symbol,
          data: {
            marketCap: profile.mktCap ? parseFloat(profile.mktCap) : undefined,
            pe: profile.pe ? parseFloat(profile.pe) : undefined,
            dividendYield: profile.lastDiv ? parseFloat(profile.lastDiv) : undefined,
            sector: profile.sector || undefined,
            industry: profile.industry || undefined,
            currency: profile.currency || undefined,
            exchange: profile.exchange || undefined,
            companyName: profile.companyName || undefined,
            description: profile.description || undefined,
            website: profile.website || undefined,
          },
        });
      }

      // Try financial metrics endpoint
      const metricsData = await fmp(`/ratios/${normalizedSymbol}`);
      if (Array.isArray(metricsData) && metricsData.length > 0) {
        const metrics = metricsData[0];
        return NextResponse.json({
          ok: true,
          symbol,
          data: {
            pe: metrics.peRatio ? parseFloat(metrics.peRatio) : undefined,
            dividendYield: metrics.dividendYield ? parseFloat(metrics.dividendYield) : undefined,
            // Add more metrics as needed
          },
        });
      }

      // For indices/FX/crypto, return minimal data
      return NextResponse.json({
        ok: true,
        symbol,
        data: {
          // Indices/FX/crypto don't have traditional fundamentals
        },
      });
    } catch (err: any) {
      console.error(`[api/market/fundamentals] FMP fetch failed for ${symbol}:`, err);
      // Return minimal data instead of error
      return NextResponse.json({
        ok: true,
        symbol,
        data: {},
      });
    }
  } catch (err: any) {
    console.error("[api/market/fundamentals] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to fetch fundamentals" },
      { status: 500 }
    );
  }
}

