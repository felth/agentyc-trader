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

  if (["txt", "md"].includes(ext || "")) return "text";

  return "unsupported";

}



function normalizeSource(raw?: string | null): string {

  const trimmed = (raw ?? "").trim();

  return trimmed.length > 0 ? trimmed : "manual";

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



    if (file.size > 5 * 1024 * 1024) {

      return NextResponse.json(

        { ok: false, error: "File too large (>5MB)" },

        { status: 400 }

      );

    }



    const source = normalizeSource(form.get("source") as string);

    const lessonId = (form.get("lesson_id") as string)?.trim() || `upload-${Date.now()}`;

    const manualNotes = (form.get("manual_notes") as string)?.trim() || "";



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



    if (fileType === "image") {

      const base64 = buffer.toString("base64");

      const mimeType = file.type || "image/png";

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

          image_url: { url: `data:${mimeType};base64,${base64}` },

        },

      ];



      const vision = await openai.chat.completions.create({

        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",

        messages: [

          { role: "system", content: systemPrompt },

          { role: "user", content: userContent as any },

        ],

        temperature: 0.2,

      });



      const rawContent = vision.choices[0]?.message?.content || "{}";

      let parsed: any = {};

      try {

        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

        const jsonString = jsonMatch ? jsonMatch[0] : rawContent;

        parsed = JSON.parse(jsonString);

      } catch (err) {

        console.warn("Failed to parse JSON from vision response:", err);

        parsed = { concept: "Image Lesson", notes: rawContent };

      }

      concept = parsed.concept || "Image Lesson";

      notes = (parsed.notes || "").trim();

      if (Array.isArray(parsed.tags)) {

        tags = parsed.tags.map((t: any) => String(t));

      }

      if (manualNotes) {

        notes = [notes, manualNotes].filter(Boolean).join("\n\n");

      }

    } else if (fileType === "pdf") {

      // Lazy require to avoid build-time evaluation issues
      const pdfParse = eval('require')("pdf-parse");

      const parsed = await pdfParse(buffer);

      const rawText = parsed.text.slice(0, 16000) || ""; // Limit tokens



      const summary = await openai.chat.completions.create({

        model: "gpt-4o-mini",

        messages: [

          {

            role: "system",

            content: "You summarise large documents into trading lessons. Return STRICT JSON only with keys: concept (string), notes (string), tags (string[]). Do NOT include any extra text outside the JSON.",

          },

          {

            role: "user",

            content: `Turn this document into key trading lessons. Return JSON: { "concept": "...", "notes": "...", "tags": ["tag1"] }\n\nDocument:\n${rawText}`,

          },

        ],

        temperature: 0.2,

      });



      const raw = summary.choices[0]?.message?.content || "{}";

      let parsedSummary: any = {};

      try {

        const jsonMatch = raw.match(/\{[\s\S]*\}/);

        const jsonString = jsonMatch ? jsonMatch[0] : raw;

        parsedSummary = JSON.parse(jsonString);

      } catch (err) {

        console.warn("Failed to parse JSON from PDF summary:", err);

        parsedSummary = { concept: "PDF Lesson", notes: raw };

      }

      concept = parsedSummary.concept || "PDF Lesson";

      notes = (parsedSummary.notes || "").trim();

      if (Array.isArray(parsedSummary.tags)) {

        tags = parsedSummary.tags.map((t: any) => String(t));

      }

      if (manualNotes) {

        notes = [notes, manualNotes].filter(Boolean).join("\n\n");

      }

    } else if (fileType === "text") {

      const text = buffer.toString("utf8");

      concept = text.slice(0, 80) || "Uploaded Note";

      notes = text;

      if (manualNotes) {

        notes = [notes, manualNotes].filter(Boolean).join("\n\n");

      }

    } else {

      return NextResponse.json(

        { ok: false, error: "Unsupported file type" },

        { status: 400 }

      );

    }



    const textForEmbed = [concept, notes].filter(Boolean).join("\n");

    if (!textForEmbed) {

      return NextResponse.json(

        { ok: false, error: "No usable content extracted from file" },

        { status: 400 }

      );

    }



    const embedding = await openai.embeddings.create({

      model: "text-embedding-3-large",

      input: textForEmbed,

    });



    const vector = embedding.data[0]?.embedding ?? [];

    if (!vector.length) {

      return NextResponse.json(

        { ok: false, error: "Embedding returned empty vector" },

        { status: 500 }

      );

    }



    const vectorId = `${lessonId}-${Date.now()}`;



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

          image_url: fileType === "image" ? `data:${file.type};base64,${buffer.toString("base64")}` : "",

        },

      },

    ]);



    const { error: sbError } = await supabase.from("lessons").insert([

      {

        lesson_id: lessonId,

        concept,

        notes,

        summary: concept,

        tags,

        image_url: fileType === "image" ? `data:${file.type};base64,${buffer.toString("base64")}` : "",

        source,

      },

    ]);



    const responseBody: any = {

      ok: true,

      lesson_id: lessonId,

      source,

      fileType,

      concept,

      notes: notes.slice(0, 500), // Truncate for response

      tags,

      pineconeVectorId: vectorId,

      dims: vector.length,

    };



    if (sbError) {

      console.error("Supabase insert error (/api/ingest/upload):", sbError);

      responseBody.supabaseWarning = "Vector stored; Supabase insert failed";

    }



    return NextResponse.json(responseBody);

  } catch (err: any) {

    console.error("UPLOAD ERROR", err);

    return NextResponse.json(

      { ok: false, error: err?.message ?? "Server error in /api/ingest/upload" },

      { status: 500 }

    );

  }

}

