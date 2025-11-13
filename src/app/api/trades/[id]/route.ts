import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Trade } from "../../../../types/trades";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await sb
    .from("trades")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Trade not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, trade: data as Trade });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const updates: Partial<Trade> = await req.json();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "No updates provided" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("trades")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, trade: data as Trade });
}

