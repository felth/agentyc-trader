import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // ---- 1) Read & validate body ----
    const body = await req.json().catch(() => ({} as any));

    const rawImageUrl = (body?.image_url ?? "").trim();
    let lesson_id = (body?.lesson_id ?? "").trim();
    const manual_notes = (body?.manual_notes ?? "").trim();

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

    // ---- 2) Call OpenAI vision to extract concept/notes from the image ----
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const systemPrompt = [
      "You are an assistant that reads trading screenshots, charts, and notes.",
      "Your job is to extract a short 'concept' and detailed 'notes' that describe the key lesson.",
      "Return STRICT JSON with keys: concept (string), notes (string), tags (string[]).",
      "Keep it factual and concise. Do NOT include any extra text outside the JSON."
    ].join(" ");

    const userContent: any[] = [
      {
        type: "text",
        text: "Analyze this image and extract the main trading lesson as JSON."
      },
      {
        type: "image_url",
        image_url: { url: rawImageUrl }
      }
    ];

    const chat = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent as any }
      ],
      temperature: 0.2
    });

    let rawContent = chat.choices?.[0]?.message?.content;

    // message.content can be string or array of content parts
    let contentText: string;
    if (typeof rawContent === "string") {
      contentText = rawContent;
    } else if (Array.isArray(rawContent)) {
      contentText = rawContent
        .map((part: any) => {
          if (typeof part === "string") return part;
          if (typeof part?.text === "string") return part.text;
          return "";
        })
        .join("\n");
    } else {
      contentText = JSON.stringify(rawContent ?? "");
    }

    let concept = "";
    let notesFromImage = "";
    let tags: string[] = [];

    try {
      // Try to find a JSON block in the response and parse it
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

    // ---- 3) Create embedding (3072 dims) ----
    const embed = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: embedContent
    });

    const values = embed.data?.[0]?.embedding ?? [];
    if (!values.length) {
      return NextResponse.json(
        { ok: false, error: "Embedding returned empty vector" },
        { status: 500 }
      );
    }
    if (values.length !== 3072) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unexpected embedding dims ${values.length}, expected 3072`
        },
        { status: 500 }
      );
    }

    const nonZero = values.some((v) => v !== 0);
    if (!nonZero) {
      return NextResponse.json(
        { ok: false, error: "Embedding appears to be all zeros" },
        { status: 500 }
      );
    }

    // ---- 4) Upsert to Pinecone ----
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
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
          tags
        }
      }
    ]);

    // ---- 5) Insert into Supabase ----
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
        image_url: rawImageUrl
      }
    ]);

    const responseBody: any = {
      ok: true,
      vectorId,
      dims: values.length,
      fromImage: true,
      tags
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
        error: err?.message ?? "Server error in /api/ingest/image"
      },
      { status: 500 }
    );
  }
}

