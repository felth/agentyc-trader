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

const withTimeout = <T>(p: Promise<T>, ms = 3000): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });

async function isReachableImage(url: string): Promise<boolean> {
  try {
    const res = await withTimeout(
      fetch(url, {
        method: "HEAD",
        redirect: "follow",
        cache: "no-store",
      }),
      3000
    );
    if (!res.ok) {
      return false;
    }
    const ct = res.headers.get("content-type") || "";
    return ct.toLowerCase().startsWith("image/");
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query: string = (body?.query ?? "").toString().trim();
    const topK: number = Number(body?.topK ?? 5);
    const minScore = 0.79;
    const sources = Array.isArray(body.sources) && body.sources.length > 0
      ? body.sources
      : null;

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

    // 2) Pinecone similarity search (optionally filtered by source)
    const queryFilter = sources ? { source: { $in: sources } } : undefined;
    const results = await index.query({
      vector,
      topK,
      includeMetadata: true,
      ...(queryFilter && { filter: queryFilter }),
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
    const rawImages = usable
      .map((m) => m.metadata?.image_url as string | undefined)
      .filter(Boolean) as string[];

    const reachableImages: string[] = [];
    for (const u of rawImages) {
      if (reachableImages.length >= 3) break;
      const ok = await isReachableImage(u);
      if (ok) {
        reachableImages.push(u);
      } else {
        console.warn("Skipping unreachable image_url:", u);
      }
    }

    // 4) Typed chat messages (no function/tool messages → no 'name' needed)
    type ChatMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
    type ContentPart =
      OpenAI.Chat.Completions.ChatCompletionContentPart; // union of {type:'text'} | {type:'image_url'}

    const systemMessage: ChatMsg = {
      role: "system",
      content:
        "You are a precise trading assistant. Use ONLY the provided lessons. Be concise and actionable. If nothing is relevant, reply exactly: 'No relevant lessons — add more data.'",
    };

    const userContent: ContentPart[] =
      reachableImages.length > 0
        ? [
            { type: "text", text: `Query: ${query}\nUse lessons below to answer.` },
            ...reachableImages.map<ContentPart>((url) => ({
              type: "image_url",
              image_url: { url },
            })),
            { type: "text", text: `Lessons:\n${context}` },
          ]
        : [
            {
              type: "text",
              text: `Query: ${query}\n\nLessons:\n${context}`,
            },
          ];

    const userMessage: ChatMsg = {
      role: "user",
      content: userContent,
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

