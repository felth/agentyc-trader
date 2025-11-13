import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Trade } from "../../../types/trades";

export async function GET(req: NextRequest) {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const status = req.nextUrl.searchParams.get("status") || "open";
  const { data, error } = await sb
    .from("trades")
    .select("*")
    .eq("status", status)
    .order("opened_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, trades: data as Trade[] });
}

export async function POST(req: NextRequest) {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const body: Partial<Trade> = await req.json();

  if (!body.symbol || !body.direction) {
    return NextResponse.json({ ok: false, error: "symbol and direction required" }, { status: 400 });
  }

  if (body.status === "closed" && !body.closed_at) {
    body.closed_at = new Date().toISOString();
  }

  const { data, error } = await sb.from("trades").insert(body).select().single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, trade: data as Trade });
}

