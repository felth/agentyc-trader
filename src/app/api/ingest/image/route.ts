import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { Pinecone } from "@pinecone-database/pinecone";

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ImageIngestBody = {

  image_url?: string;

  lesson_id?: string;

  manual_notes?: string;

  source?: string;

};

function normalizeSource(raw?: string | null): string {

  const trimmed = (raw ?? "").trim();

  return trimmed.length > 0 ? trimmed : "manual";

}

export async function POST(req: NextRequest) {

  try {

    const body = (await req.json()) as ImageIngestBody;

    const rawImageUrl = (body.image_url ?? "").trim();

    let lesson_id = (body.lesson_id ?? "").trim();

    const manual_notes = (body.manual_notes ?? "").trim();

    const source = normalizeSource(body.source);

    if (!rawImageUrl) {

      return NextResponse.json(

        { ok: false, error: "image_url is required" },

        { status: 400 }

      );

    }

    if (!rawImageUrl.startsWith("http")) {

      return NextResponse.json(

        { ok: false, error: "image_url must be an HTTP/HTTPS URL" },

        { status: 400 }

      );

    }

    if (!lesson_id) {

      lesson_id = `image-${Date.now()}`;

    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const systemPrompt = [

      "You are an assistant that reads trading screenshots, charts, and notes.",

      "Your job is to extract a short 'concept' and detailed 'notes' that describe the key lesson.",

      "Return STRICT JSON with keys: concept (string), notes (string), tags (string[]).",

      "Keep it factual and concise. Do NOT include any extra text outside the JSON.",

    ].join(" ");

    const userContent: Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }> = [

      {

        type: "text",

        text: "Analyze this image and extract the main trading lesson as JSON.",

      },

      {

        type: "image_url",

        image_url: { url: rawImageUrl },

      },

    ];

    const chat = await openai.chat.completions.create({

      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",

      messages: [

        { role: "system", content: systemPrompt },

        { role: "user", content: userContent as any },

      ],

      temperature: 0.2,

    });

    const rawContent = chat.choices?.[0]?.message?.content;

    let contentText = "";

    if (typeof rawContent === "string") {

      contentText = rawContent;

    } else if (Array.isArray(rawContent)) {

      contentText = (rawContent as any[])

        .map((part: any) => {

          if (typeof part === "string") return part;

          if (typeof part?.text === "string") return part.text;

          return "";

        })

        .join("\n");

    } else if (rawContent) {

      contentText = JSON.stringify(rawContent);

    }

    let concept = "";

    let notesFromImage = "";

    let tags: string[] = [];

    try {

      const jsonMatch = contentText.match(/\{[\s\S]*\}/);

      const jsonString = jsonMatch ? jsonMatch[0] : contentText;

      const parsed = JSON.parse(jsonString);

      concept = (parsed.concept ?? "").trim();

      notesFromImage = (parsed.notes ?? parsed.summary ?? "").trim();

      if (Array.isArray(parsed.tags)) {

        tags = parsed.tags.map((t: any) => String(t));

      }

    } catch (err) {

      console.warn("Failed to parse JSON from vision response, falling back:", err);

      concept = concept || "Lesson from image";

      notesFromImage = notesFromImage || contentText.trim();

    }

    const notes = [notesFromImage, manual_notes].filter(Boolean).join("\n\n");

    const embedContent = [concept, notes].filter(Boolean).join("\n");

    if (!embedContent) {

      return NextResponse.json(

        { ok: false, error: "No usable text extracted from image" },

        { status: 400 }

      );

    }

    const embed = await openai.embeddings.create({

      model: "text-embedding-3-large",

      input: embedContent,

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

          image_url: rawImageUrl,

          tags,

          source, // <-- important

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

        image_url: rawImageUrl,

        source,

      },

    ]);

    const responseBody: any = {

      ok: true,

      vectorId,

      dims: values.length,

      fromImage: true,

      tags,

      source,

    };

    if (sbError) {

      console.error("Supabase insert error (image ingest):", sbError);

      responseBody.supabaseWarning = "Vector stored; Supabase insert failed";

    }

    return NextResponse.json(responseBody);

  } catch (err: any) {

    console.error("Image ingest error:", err);

    return NextResponse.json(

      {

        ok: false,

        error: err?.message ?? "Server error in /api/ingest/image",

      },

      { status: 500 }

    );

  }

}
