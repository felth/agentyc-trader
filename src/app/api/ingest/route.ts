import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { Pinecone } from "@pinecone-database/pinecone";



export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';



export async function POST(req: NextRequest) {

  try {

    // Read & validate body

    const body = await req.json().catch(() => ({}));

    const concept = (body?.concept ?? "").trim();

    const notes = (body?.notes ?? "").trim();

    const image_url = (body?.image_url ?? "").trim();

    const lesson_id = (body?.lesson_id ?? "").trim();

    const source = (body?.source ?? "journal").trim();



    if (!lesson_id) {

      return NextResponse.json({ ok: false, error: "lesson_id is required" }, { status: 400 });

    }

    if (!concept && !notes) {

      return NextResponse.json({ ok: false, error: "Provide concept or notes" }, { status: 400 });

    }



    // Build content to embed

    const content = [concept, notes, image_url].filter(Boolean).join("\n");



    // Pinecone client and index

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

    const index = pc.index(process.env.PINECONE_INDEX!, process.env.PINECONE_HOST!);



    // Create embedding - using OpenAI text-embedding-3-large (3072 dims) to match index

    // Note: llama-text-embed-v2 only produces 1024 dims, but index expects 3072

    let values: number[] = [];

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {

      return NextResponse.json({ ok: false, error: "OPENAI_API_KEY required for 3072-dim embeddings. Index expects 3072 but llama-text-embed-v2 only produces 1024." }, { status: 500 });

    }

    try {

      const res = await fetch("https://api.openai.com/v1/embeddings", {

        method: "POST",

        headers: {

          "Authorization": `Bearer ${OPENAI_API_KEY}`,

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          model: "text-embedding-3-large",

          input: content,

          dimensions: 3072,

        }),

      });

      if (!res.ok) {

        const error = await res.text();

        throw new Error(`OpenAI API error: ${error}`);

      }

      const data = await res.json();

      values = data.data[0].embedding;

    } catch (e: any) {

      console.error("OpenAI embedding error:", e);

      return NextResponse.json({ ok: false, error: `Embedding generation failed: ${e.message}` }, { status: 500 });

    }



    if (!values?.length) {

      return NextResponse.json({ ok: false, error: "Embedding returned empty vector" }, { status: 500 });

    }

    const expectedDims = 3072;

    if (values.length !== expectedDims) {

      return NextResponse.json({ ok: false, error: `Unexpected embedding dims ${values.length}, expected ${expectedDims}` }, { status: 500 });

    }

    // Basic zero-check

    const nonZero = values.some(v => v !== 0);

    if (!nonZero) {

      return NextResponse.json({ ok: false, error: "Embedding appears to be all zeros" }, { status: 500 });

    }



    // Upsert to Pinecone

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

          source,

        },

      },

    ]);



    // Supabase insert

    try {

      const supabase = createClient(

        process.env.SUPABASE_URL!,

        process.env.SUPABASE_SERVICE_ROLE_KEY!

      );



      const insertPayload = [{ lesson_id, concept, notes, image_url, source }];

      const { error: sbError } = await supabase.from("lessons").insert(insertPayload);



      if (sbError) {

        console.error("Supabase insert error:", sbError);

        return NextResponse.json({

          ok: true,

          vectorId,

          dims: values.length,

          warning: "Vector stored; Supabase insert failed",

          supabaseError: sbError.message ?? sbError

        });

      }

    } catch (e: any) {

      console.error("Supabase client/fetch error:", e?.message, e);

      return NextResponse.json({

        ok: true,

        vectorId,

        dims: values.length,

        warning: "Vector stored; Supabase client/fetch failed",

        supabaseError: e?.message ?? String(e)

      });

    }



    return NextResponse.json({ ok: true, vectorId, dims: values.length });

  } catch (err: any) {

    console.error("Ingest route error:", err);

    return NextResponse.json({ ok: false, error: err?.message ?? "Server error" }, { status: 500 });

  }

}
