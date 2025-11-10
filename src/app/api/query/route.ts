// app/api/query/route.ts
import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { Pinecone } from "@pinecone-database/pinecone";

// ---- Environment & clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index(
  process.env.PINECONE_INDEX!,         // e.g. "agentyc-trader"
  process.env.PINECONE_HOST!           // e.g. "https://agentyc-trader-....pinecone.io"
);

// Optional edge/runtime hints
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Match = {
  id?: string;
  score?: number;
  metadata?: {
    lesson_id?: string;
    concept?: string;
    notes?: string;
    image_url?: string;
    summary?: string;
    explanation?: string;
    tags?: string[];
    source?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query: string = (body?.query ?? "").toString().trim();
    const topK: number = Number(body?.topK ?? 5);
    const minScore = typeof body?.minScore === "number" ? body.minScore : 0.8;

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "Missing 'query'." },
        { status: 400 }
      );
    }

    // 1) Embed the query (3072 dims) with OpenAI
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: query,
    });
    const vector = emb.data?.[0]?.embedding;
    if (!vector?.length) {
      return NextResponse.json(
        { ok: false, error: "Failed to create embedding." },
        { status: 500 }
      );
    }

    // 2) Pinecone similarity search
    const results = await index.query({
      vector,
      topK,
      includeMetadata: true,
      // If you want to scope to your own rows only, uncomment:
      // filter: { source: "finelo" },
    });

    const matches: Match[] = (results.matches as any[])?.map((m) => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata,
    })) ?? [];

    // 3) Build concise “context” from top metadata for the LLM
    const usable = matches.filter((m) => (m.score ?? 0) >= minScore);
    const context = usable
      .slice(0, topK)
      .map((m) => {
        const md = m.metadata ?? {};
        return [
          `lesson_id: ${md.lesson_id ?? "—"}`,
          `concept: ${md.concept ?? "—"}`,
          `notes: ${md.notes ?? md.summary ?? md.explanation ?? "—"}`,
          md.tags ? `tags: ${(md.tags ?? []).join(", ")}` : undefined,
          md.image_url ? `image_url: ${md.image_url}` : undefined,
          `score: ${m.score?.toFixed(3) ?? "—"}`,
        ]
          .filter(Boolean)
          .join(" | ");
      })
      .join("\n");

    // Collect up to 3 images from the filtered matches
    const images = usable
      .map((m) => m.metadata?.image_url)
      .filter(Boolean)
      .slice(0, 3) as string[];

    // 4) Typed chat messages (no function/tool messages → no 'name' needed)
    type ChatMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
    type ContentPart =
      OpenAI.Chat.Completions.ChatCompletionContentPart; // union of {type:'text'} | {type:'image_url'}

    const systemMessage: ChatMsg = {
      role: "system",
      content:
        "You are a precise trading assistant. Use ONLY the provided lessons. Be concise and actionable. If nothing is relevant, reply exactly: 'No relevant lessons — add more data.'",
    };

    const parts: ContentPart[] = [
      {
        type: "text",
        text:
          `Query: ${query}\n\n` +
          `Top matches:\n${context || "(none)"}\n\n` +
          `Write succinct insights (bullets fine).`,
      },
    ];

    for (const url of images) {
      parts.push({
        type: "image_url",
        image_url: { url },
      });
    }

    const userMessage: ChatMsg = {
      role: "user",
      content: parts,
    };

    // 5) Call OpenAI (fallback if GPT-5 not available)
    const primaryModel = process.env.OPENAI_MODEL || "gpt-5-turbo";
    let chat = await openai.chat.completions.create({
      model: primaryModel,
      messages: [systemMessage, userMessage] as ChatMsg[],
      temperature: 0.2,
    }).catch(async () => {
      return openai.chat.completions.create({
        model: "gpt-4o",
        messages: [systemMessage, userMessage] as ChatMsg[],
        temperature: 0.2,
      });
    });

    let insights = chat.choices?.[0]?.message?.content?.trim() ?? "";

    if (!usable.length) {
      insights = "No relevant lessons — add more data.";
    }

    return NextResponse.json({
      ok: true,
      matches: usable,
      insights,
    });
  } catch (err: any) {
    console.error("query route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

