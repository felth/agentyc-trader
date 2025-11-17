import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { Pinecone } from "@pinecone-database/pinecone";

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type IngestBody = {

  concept?: string;

  notes?: string;

  lesson_id?: string;

  image_url?: string;

  tags?: string[];

  source?: string; // e.g. "finelo", "book:naked-trader", "pdf:xyz", "journal"

};

function normalizeSource(raw?: string | null): string {

  const trimmed = (raw ?? "").trim();

  // For now default to "manual" – when ingesting Finelo, we will explicitly pass "finelo"

  return trimmed.length > 0 ? trimmed : "manual";

}

export async function POST(req: NextRequest) {

  try {

    const body = (await req.json()) as IngestBody;

    const concept = (body.concept ?? "").trim();

    const notes = (body.notes ?? "").trim();

    const image_url = (body.image_url ?? "").trim();

    const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];

    const source = normalizeSource(body.source);

    let lesson_id = (body.lesson_id ?? "").trim();

    if (!concept && !notes) {

      return NextResponse.json(

        { ok: false, error: "concept or notes required" },

        { status: 400 }

      );

    }

    if (!lesson_id) {

      lesson_id = `lesson-${Date.now()}`;

    }

    const textForEmbed = [concept, notes].filter(Boolean).join("\n");

    const openai = new OpenAI({

      apiKey: process.env.OPENAI_API_KEY!,

    });

    const embed = await openai.embeddings.create({

      model: "text-embedding-3-large",

      input: textForEmbed,

    });

    const values = embed.data?.[0]?.embedding ?? [];

    if (!values.length) {

      return NextResponse.json(

        { ok: false, error: "Embedding returned empty vector" },

        { status: 500 }

      );

    }

    const pc = new Pinecone({

      apiKey: process.env.PINECONE_API_KEY!,

    });

    const index = pc.index(

      process.env.PINECONE_INDEX!,

      process.env.PINECONE_HOST!

    );

    const vectorId = `${lesson_id}-${Date.now()}`;

    await index.upsert([

      {

        id: vectorId,

        values,

        metadata: {

          lesson_id,

          concept,

          notes,

          image_url,

          tags,

          source, // <-- key piece for future books/PDFs/etc.

        },

      },

    ]);

    const supabase = createClient(

      process.env.SUPABASE_URL!,

      process.env.SUPABASE_SERVICE_ROLE_KEY!

    );

    const { error: sbError } = await supabase.from("lessons").insert([

      {

        lesson_id,

        concept,

        notes,

        summary: concept,

        tags,

        image_url,

        source,

      },

    ]);

    const response: any = {

      ok: true,

      vectorId,

      dims: values.length,

      source,

    };

    if (sbError) {

      console.error("Supabase insert error (/api/ingest):", sbError);

      response.supabaseWarning = "Vector stored; Supabase insert failed";

    }

    return NextResponse.json(response);

  } catch (err: any) {

    console.error("Text ingest error:", err);

    return NextResponse.json(

      { ok: false, error: err?.message ?? "Server error in /api/ingest" },

      { status: 500 }

    );

  }

}
