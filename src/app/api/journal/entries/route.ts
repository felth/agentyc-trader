import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { JournalEntry, Mood } from "@/lib/types/journal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/journal/entries - Create a new journal entry
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entry: Partial<JournalEntry> = {
      mood: body.mood,
      text: body.text,
      tags: body.tags || [],
      symbol: body.symbol || null,
      session: body.session || null,
      attachTradeIds: body.attachTradeIds || [],
    };

    if (!entry.mood || !entry.text) {
      return NextResponse.json(
        { ok: false, error: "mood and text are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Insert into lessons table (reusing existing structure for now)
    const { data, error } = await supabase.from("lessons").insert([
      {
        lesson_id: `journal-${Date.now()}`,
        concept: `Journal Entry - ${entry.mood}`,
        notes: entry.text,
        summary: entry.text.slice(0, 200),
        tags: [...(entry.tags || []), `mood:${entry.mood}`, ...(entry.symbol ? [`symbol:${entry.symbol}`] : [])],
        source: "journal",
      },
    ]).select().single();

    if (error) {
      console.error("Supabase insert error (/api/journal/entries):", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      entry: {
        id: data.lesson_id,
        createdAt: data.created_at,
        mood: entry.mood as Mood,
        text: entry.text,
        tags: entry.tags,
        symbol: entry.symbol,
        session: entry.session,
      },
    });
  } catch (err: any) {
    console.error("Journal entry creation error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error in /api/journal/entries" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/journal/entries - Fetch journal entries
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("lessons")
      .select("lesson_id, concept, notes, tags, created_at")
      .eq("source", "journal")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Supabase query error (/api/journal/entries):", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const entries: JournalEntry[] = (data || []).map((row) => {
      // Extract mood from tags
      const moodTag = row.tags?.find((t: string) => t.startsWith("mood:")) || "mood:neutral";
      const mood = moodTag.replace("mood:", "") as Mood;
      
      // Extract symbol from tags
      const symbolTag = row.tags?.find((t: string) => t.startsWith("symbol:"));
      const symbol = symbolTag ? symbolTag.replace("symbol:", "") : null;

      return {
        id: row.lesson_id,
        createdAt: row.created_at,
        mood,
        text: row.notes || "",
        tags: (row.tags || []).filter((t: string) => !t.startsWith("mood:") && !t.startsWith("symbol:")),
        symbol,
        session: null, // TODO: Derive from timestamp
      };
    });

    return NextResponse.json({ ok: true, entries });
  } catch (err: any) {
    console.error("Journal entries fetch error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error in /api/journal/entries" },
      { status: 500 }
    );
  }
}

