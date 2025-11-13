import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Trade } from "../../../../types/trades";

type RouteParams = { id: string };

export async function GET(req: NextRequest, context: { params: Promise<RouteParams> }) {
  const { id } = await context.params;
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await sb
    .from("trades")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Trade not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, trade: data as Trade });
}

export async function PATCH(req: NextRequest, context: { params: Promise<RouteParams> }) {
  const { id } = await context.params;
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const updates: Partial<Trade> = await req.json();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "No updates provided" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("trades")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, trade: data as Trade });
}

