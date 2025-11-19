import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {

  try {

    const supabase = createClient(

      process.env.SUPABASE_URL!,

      process.env.SUPABASE_SERVICE_ROLE_KEY!

    );

    const { data, error } = await supabase

      .from("lessons")

      .select("lesson_id, concept, notes, tags, created_at, summary")

      .eq("source", "journal")

      .order("created_at", { ascending: false })

      .limit(50);

    if (error) {

      console.error("Supabase query error (/api/journal):", error);

      return NextResponse.json(

        { ok: false, error: error.message },

        { status: 500 }

      );

    }

    const entries = (data || []).map((entry) => ({

      lesson_id: entry.lesson_id,

      concept: entry.concept || "",

      notes: entry.notes || entry.summary || "",

      tags: Array.isArray(entry.tags) ? entry.tags : [],

      created_at: entry.created_at,

      timestamp: formatTimestamp(entry.created_at),

    }));

    return NextResponse.json({ ok: true, entries });

  } catch (err: any) {

    console.error("Journal fetch error:", err);

    return NextResponse.json(

      { ok: false, error: err?.message ?? "Server error in /api/journal" },

      { status: 500 }

    );

  }

}

function formatTimestamp(isoString: string | null): string {

  if (!isoString) return "";

  const date = new Date(isoString);

  const now = new Date();

  const diffMs = now.getTime() - date.getTime();

  const diffMins = Math.floor(diffMs / 60000);

  const diffHours = Math.floor(diffMs / 3600000);

  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";

  if (diffMins < 60) return `${diffMins}m ago`;

  if (diffHours < 24) {

    const sameDay = date.toDateString() === now.toDateString();

    if (sameDay) return `Today · ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;

    return `Yesterday · ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;

  }

  if (diffDays === 1) return `Yesterday · ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;

  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

}

