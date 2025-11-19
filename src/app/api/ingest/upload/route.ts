import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { Pinecone } from "@pinecone-database/pinecone";

import { createClient } from "@supabase/supabase-js";

import { normalizeSource } from "@/lib/agentSources";



export const runtime = "nodejs";



function detectFileType(mime: string, name: string): "image" | "pdf" | "text" | "unsupported" {

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



    if (file.size > 5 * 1024 * 1024) {

      return NextResponse.json(

        { ok: false, error: "File too large (>5MB)" },

        { status: 400 }

      );

    }



    const source = form.get("source") as string;

    const normalizedSource = normalizeSource(source);

    const lessonId = (form.get("lesson_id") as string)?.trim() || crypto.randomUUID();

    const manualNotes = (form.get("manual_notes") as string)?.trim() || "";

    const tagsInput = (form.get("tags") as string)?.trim() || "";

    const tags = tagsInput

      .split(",")

      .map((t) => t.trim())

      .filter(Boolean);



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

    let extractedTags: string[] = [];



    if (fileType === "image") {

      const base64 = buffer.toString("base64");

      const dataUrl = `data:${file.type};base64,${base64}`;



      const systemPrompt = [

        "You are a trading lesson extractor.",

        "You look at trading screenshots, charts, and notes.",

        "You return STRICT JSON only with keys: concept (string), notes (string), tags (string[]).",

        "No prose, no markdown, only JSON."

      ].join(" ");



      const userContent = [

        { type: "text", text: "Extract the main trading lesson from this image." },

        { type: "image_url", image_url: { url: dataUrl } }

      ] as const;



      const chat = await openai.chat.completions.create({

        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",

        messages: [

          { role: "system", content: systemPrompt },

          { role: "user", content: userContent as any }

        ],

        temperature: 0.1

      });



      const rawContent = chat.choices[0]?.message?.content;

      let textContent: string;



      if (typeof rawContent === "string") {

        textContent = rawContent;

      } else if (Array.isArray(rawContent)) {

        textContent = (rawContent as any[])

          .map(part => (typeof part === "string" ? part : (part as any).text || ""))

          .join("\n");

      } else {

        textContent = JSON.stringify(rawContent ?? "");

      }



      const jsonMatch = textContent.match(/\{[\s\S]*\}/);

      const jsonString = jsonMatch ? jsonMatch[0] : textContent;



      let notesFromImage = "";



      try {

        const parsed = JSON.parse(jsonString) as {

          concept?: string;

          notes?: string;

          summary?: string;

          tags?: string[];

        };

        concept = (parsed.concept ?? "").trim();

        notesFromImage = (parsed.notes ?? parsed.summary ?? "").trim();

        if (Array.isArray(parsed.tags)) {

          extractedTags = parsed.tags.map(t => String(t));

        }

      } catch {

        concept = "Lesson from image";

        notesFromImage = textContent.trim();

      }



      notes = [notesFromImage, manualNotes].filter(Boolean).join("\n\n");

    } else if (fileType === "pdf") {

      // Lazy require to avoid build-time evaluation issues
      const pdfParse = eval('require')("pdf-parse");

      const parsed = await pdfParse(buffer);

      const rawText = (parsed.text || "").slice(0, 16000);

      const pdfSystem = [

        "You summarise PDF documents into concise trading lessons.",

        "Return STRICT JSON only: { \"concept\": string, \"notes\": string, \"tags\": string[] }."

      ].join(" ");

      const pdfChat = await openai.chat.completions.create({

        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",

        messages: [

          { role: "system", content: pdfSystem },

          {

            role: "user",

            content: `Turn this document into one main trading lesson.\nReturn JSON only.\n\nDocument:\n${rawText}`

          }

        ],

        temperature: 0.2

      });

      const raw = pdfChat.choices[0]?.message?.content || "{}";

      let parsedSummary: any = {};

      try {

        const jsonMatch = raw.match(/\{[\s\S]*\}/);

        const jsonString = jsonMatch ? jsonMatch[0] : raw;

        parsedSummary = JSON.parse(jsonString);

      } catch {

        parsedSummary = {};

      }

      concept = (parsedSummary.concept ?? "PDF Lesson").toString();

      const pdfNotes = (parsedSummary.notes ?? "").toString();

      if (Array.isArray(parsedSummary.tags)) {

        extractedTags = parsedSummary.tags.map((t: any) => String(t));

      }

      notes = [pdfNotes, manualNotes].filter(Boolean).join("\n\n");

    } else if (fileType === "text") {

      const text = buffer.toString("utf8");

      concept = text.trim().slice(0, 80) || "Uploaded Note";

      const notesFromText = text.trim();

      notes = [notesFromText, manualNotes].filter(Boolean).join("\n\n");

      extractedTags = [];

    } else {

      return NextResponse.json(

        { ok: false, error: "Unsupported file type" },

        { status: 400 }

      );

    }



    const embedContent = [concept, notes].filter(Boolean).join("\n");

    if (!embedContent) {

      return NextResponse.json(

        { ok: false, error: "No usable content extracted from file" },

        { status: 400 }

      );

    }



    const embedding = await openai.embeddings.create({

      model: "text-embedding-3-large",

      input: embedContent

    });

    const values = embedding.data[0]?.embedding ?? [];

    if (!values.length) {

      return NextResponse.json(

        { ok: false, error: "Embedding returned empty vector" },

        { status: 500 }

      );

    }



    const allTags = [...extractedTags, ...tags];

    const vectorId = `${lessonId}-${Date.now()}`;

    await index.upsert([

      {

        id: vectorId,

        values,

        metadata: {

          lesson_id: lessonId,

          concept,

          notes,

          source: normalizedSource,

          tags: allTags,

          image_url: fileType === "image" ? "upload://inline" : ""

        }

      }

    ]);



    const { error: sbError } = await supabase

      .from("lessons")

      .insert({

        lesson_id: lessonId,

        concept,

        notes,

        source: normalizedSource,

        tags: allTags,

        image_url: fileType === "image" ? "upload://inline" : ""

      });



    const responseBody: {

      ok: true;

      lesson_id: string;

      source: string;

      fileType: string;

      concept: string;

      notes: string;

      pineconeVectorId: string;

      supabaseWarning?: string;

    } = {

      ok: true,

      lesson_id: lessonId,

      source: normalizedSource,

      fileType,

      concept,

      notes,

      pineconeVectorId: vectorId

    };



    if (sbError) {

      console.error("Supabase insert error (upload):", sbError);

      responseBody.supabaseWarning = "Vector stored; Supabase insert failed";

    }



    return NextResponse.json(responseBody);

  } catch (err) {

    console.error("UPLOAD ERROR", err);

    const message = err instanceof Error ? err.message : "Server error in /api/ingest/upload";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });

  }

}

