import { NextResponse } from "next/server";
import { getIbkrAccount, callBridge } from "@/lib/data/ibkrBridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Trade history from IBKR executions
export type TradeExecution = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  value: number; // price * quantity * sign(side)
  realizedPnl?: number;
  time: string; // ISO
  assetClass: string;
};

export async function GET() {
  try {
    // Get account ID first
    const accountRes = await getIbkrAccount().catch(() => null);
    if (!accountRes?.ok || !accountRes.accountId) {
      return NextResponse.json(
        { ok: false, error: "Unable to fetch account ID" },
        { status: 500 }
      );
    }

    // Call bridge /trades endpoint (which should return executions/trade history)
    const tradesRes = await callBridge<{
      ok: boolean;
      trades?: Array<{
        id?: string;
        symbol?: string;
        side?: string;
        quantity?: number;
        price?: number;
        value?: number;
        realizedPnl?: number;
        time?: string;
        assetClass?: string;
      }>;
      error?: string;
    }>("/trades", { method: "GET" }).catch((err) => {
      console.error("[api/ibkr/trades] Bridge call failed:", err);
      return { ok: false, error: err?.message || "Bridge call failed" };
    });

    if (!tradesRes.ok || !Array.isArray(tradesRes.trades)) {
      return NextResponse.json({
        ok: true,
        accountId: accountRes.accountId,
        trades: [],
      });
    }

    // Normalize trades to our format
    const trades: TradeExecution[] = tradesRes.trades
      .filter((t) => t.id && t.symbol && t.side && t.price && t.quantity)
      .map((t) => {
        const side = (t.side?.toUpperCase() || "") as "BUY" | "SELL";
        const quantity = parseFloat(String(t.quantity || 0));
        const price = parseFloat(String(t.price || 0));
        const value = price * quantity * (side === "BUY" ? 1 : -1);

        return {
          id: String(t.id || ""),
          symbol: String(t.symbol || ""),
          side,
          quantity,
          price,
          value,
          realizedPnl: t.realizedPnl !== undefined ? parseFloat(String(t.realizedPnl)) : undefined,
          time: t.time || new Date().toISOString(),
          assetClass: t.assetClass || "STOCK",
        };
      });

    return NextResponse.json({
      ok: true,
      accountId: accountRes.accountId,
      trades,
    });
  } catch (err: any) {
    console.error("[api/ibkr/trades] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to fetch trades" },
      { status: 500 }
    );
  }
}

