import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { Pinecone } from "@pinecone-database/pinecone";

import { createClient } from "@supabase/supabase-js";



export const runtime = "nodejs";



function detectFileType(mime: string, name: string) {

  if (mime.startsWith("image/")) return "image";

  if (mime === "application/pdf") return "pdf";

  if (mime.startsWith("text/")) return "text";

  const ext = name.split(".").pop()?.toLowerCase();

  if (ext && ["txt", "md"].includes(ext)) return "text";

  return "unsupported";

}



export async function POST(req: NextRequest) {

  try {

    const form = await req.formData();

    const file = form.get("file") as File | null;



    if (!file) {

      return NextResponse.json(

        { ok: false, error: "file missing" },

        { status: 400 }

      );

    }



    // ~5MB limit for now

    if (file.size > 5 * 1024 * 1024) {

      return NextResponse.json(

        { ok: false, error: "File too large (>5MB)" },

        { status: 400 }

      );

    }



    const source = (form.get("source") as string) || "manual";

    const lessonId = (form.get("lesson_id") as string) || crypto.randomUUID();

    const manualNotes = (form.get("manual_notes") as string) || "";



    const arrayBuffer = await file.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    const fileType = detectFileType(file.type, file.name);



    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

    const index = pc.index(

      process.env.PINECONE_INDEX!,

      process.env.PINECONE_HOST!

    );

    const supabase = createClient(

      process.env.SUPABASE_URL!,

      process.env.SUPABASE_SERVICE_ROLE_KEY!

    );



    let concept = "";

    let notes = "";

    let tags: string[] = [];



    // =============== IMAGE INGEST ===============

    if (fileType === "image") {

      const base64 = buffer.toString("base64");



      const systemPrompt =

        "You extract trading lessons from screenshots, charts, and notes. " +

        "Return ONLY valid JSON with keys: concept (string), notes (string), tags (string[]).";



      const userPrompt =

        "Analyze this image and extract the main trading lesson(s). " +

        "Return JSON ONLY: { \"concept\": \"...\", \"notes\": \"...\", \"tags\": [\"...\"] }";



      const vision = await openai.chat.completions.create({

        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",

        messages: [

          { role: "system", content: systemPrompt },

          {

            role: "user",

            content: [

              { type: "text", text: userPrompt },

              {

                type: "image_url",

                image_url: {

                  url: `data:${file.type};base64,${base64}`

                }

              }

            ] as any

          }

        ],

        temperature: 0.2

      });



      const raw = vision.choices[0]?.message?.content || "{}";



      let parsed: any = {};

      try {

        parsed = JSON.parse(raw as string);

      } catch {

        parsed = {};

      }



      concept = (parsed.concept ?? "Image Lesson").toString();

      const imageNotes = (parsed.notes ?? "").toString();

      if (Array.isArray(parsed.tags)) {

        tags = parsed.tags.map((t: any) => String(t));

      }



      notes = [imageNotes, manualNotes].filter(Boolean).join("\n\n");

    }



    // =============== PDF INGEST ===============

    else if (fileType === "pdf") {

      // Lazy require to avoid build-time evaluation issues
      const pdfParse = eval('require')("pdf-parse");

      const parsed = await pdfParse(buffer);

      const rawText = (parsed.text || "").slice(0, 16000); // token guard



      const systemPrompt =

        "You summarise large trading documents into key lessons. " +

        "Return ONLY JSON: { \"concept\": \"...\", \"notes\": \"...\", \"tags\": [\"...\"] }";



      const userPrompt = [

        "Turn this document into key trading lessons.",

        "Return JSON ONLY with keys: concept, notes, tags.",

        "",

        "Document:",

        rawText

      ].join("\n");



      const summary = await openai.chat.completions.create({

        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",

        messages: [

          { role: "system", content: systemPrompt },

          { role: "user", content: userPrompt }

        ],

        temperature: 0.2

      });



      const raw = summary.choices[0]?.message?.content || "{}";



      let parsedSummary: any = {};

      try {

        parsedSummary = JSON.parse(raw as string);

      } catch {

        parsedSummary = {};

      }



      concept = (parsedSummary.concept ?? "PDF Lesson").toString();

      const pdfNotes = (parsedSummary.notes ?? "").toString();

      if (Array.isArray(parsedSummary.tags)) {

        tags = parsedSummary.tags.map((t: any) => String(t));

      }



      notes = [pdfNotes, manualNotes].filter(Boolean).join("\n\n");

    }



    // =============== TEXT INGEST ===============

    else if (fileType === "text") {

      const text = buffer.toString("utf8");

      concept = text.slice(0, 80) || "Uploaded Note";

      notes = [text, manualNotes].filter(Boolean).join("\n\n");

      tags = [];

    }



    // =============== UNSUPPORTED TYPE ===============

    else {

      return NextResponse.json(

        { ok: false, error: "Unsupported file type" },

        { status: 400 }

      );

    }



    if (!notes.trim()) {

      return NextResponse.json(

        { ok: false, error: "No usable text extracted from file" },

        { status: 400 }

      );

    }



    // =============== EMBEDDING ===============

    const embedding = await openai.embeddings.create({

      model: "text-embedding-3-large",

      input: notes

    });



    const vector = embedding.data?.[0]?.embedding ?? [];

    if (!vector.length) {

      return NextResponse.json(

        { ok: false, error: "Embedding returned empty vector" },

        { status: 500 }

      );

    }



    const vectorId = `${lessonId}-${Date.now()}`;



    // =============== PINECONE ===============

    await index.upsert([

      {

        id: vectorId,

        values: vector,

        metadata: {

          lesson_id: lessonId,

          concept,

          notes,

          source,

          tags,

          image_url: ""

        }

      }

    ]);



    // =============== SUPABASE ===============

    const { error: sbError } = await supabase.from("lessons").insert([

      {

        lesson_id: lessonId,

        concept,

        notes,

        summary: concept,

        source,

        tags,

        image_url: ""

      }

    ]);



    const responseBody: any = {

      ok: true,

      lesson_id: lessonId,

      source,

      fileType,

      concept,

      notes,

      tags,

      pineconeVectorId: vectorId

    };



    if (sbError) {

      console.error("Supabase insert error (file ingest):", sbError);

      responseBody.supabaseWarning = "Vector stored; Supabase insert failed";

    }



    return NextResponse.json(responseBody);

  } catch (err: any) {

    console.error("UPLOAD ERROR /api/ingest/file:", err);

    return NextResponse.json(

      { ok: false, error: err?.message || "Server error" },

      { status: 500 }

    );

  }

}

