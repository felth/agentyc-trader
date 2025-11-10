// app/api/query/route.ts
import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { Pinecone } from "@pinecone-database/pinecone";

type LessonMeta = {
  lesson_id?: string;
  concept?: string;
  notes?: string;
  image_url?: string;
  source?: string;
};

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

function preferredChatModel() {
  // Prefer fast, reasoning-capable model; allow override via env
  return process.env.OPENAI_CHAT_MODEL || "gpt-5-turbo";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = isNonEmptyString(body?.query) ? body.query.trim() : "";
    const topK = Math.min(Math.max(Number(body?.topK ?? 5), 1), 20);
    const threshold = Number(body?.threshold ?? 0.8);
    const filterSource = isNonEmptyString(body?.source) ? body.source.trim() : undefined;

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "Provide a non-empty 'query' string." },
        { status: 400 }
      );
    }

    // --- OpenAI embed (3072-dim) ---
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const embedRes = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: query,
    });
    const vector = embedRes.data?.[0]?.embedding;
    if (!vector || vector.length !== 3072) {
      return NextResponse.json(
        { ok: false, error: "Embedding failed or wrong dimensions." },
        { status: 500 }
      );
    }

    // --- Pinecone query (use HOST, not ENV) ---
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const index = pc.index(process.env.PINECONE_INDEX!, process.env.PINECONE_HOST!);

    const pineconeQuery: any = {
      vector,
      topK,
      includeValues: false,
      includeMetadata: true,
    };
    if (filterSource) pineconeQuery.filter = { source: filterSource };

    const results = await index.query(pineconeQuery);

    const scored =
      results?.matches?.map((m) => ({
        id: m.id,
        score: typeof m.score === "number" ? m.score : 0,
        metadata: (m.metadata || {}) as LessonMeta,
      })) || [];

    const above = scored.filter((m) => m.score >= threshold);
    const usedMatches = above.length > 0 ? above : scored.slice(0, topK);

    // --- If absolutely nothing, return helpful message ---
    if (!usedMatches || usedMatches.length === 0) {
      return NextResponse.json({
        ok: true,
        query,
        topK,
        threshold,
        matches: [],
        insights: "No relevant lessons — add more data.",
      });
    }

    // --- Build context for LLM ---
    const context = usedMatches
      .map((m, idx) => {
        const meta = m.metadata || {};
        return [
          `#${idx + 1}`,
          `lesson_id: ${meta.lesson_id ?? "n/a"}`,
          `concept: ${meta.concept ?? "n/a"}`,
          `notes: ${meta.notes ?? "n/a"}`,
          meta.image_url ? `image_url: ${meta.image_url}` : undefined,
          `score: ${m.score ?? "n/a"}`,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    // Prepare multimodal user content if images exist
    const imageUrls = usedMatches
      .map((m) => m.metadata?.image_url)
      .filter((u): u is string => isNonEmptyString(u))
      .slice(0, 3);

    const baseText = `User query:\n${query}\n\nLessons:\n${context}`;

    const buildUserMessage = (useImages: boolean) => {
      if (!useImages || imageUrls.length === 0) {
        return { role: "user", content: baseText };
      }

      const content: any[] = [{ type: "text", text: baseText }];
      for (const url of imageUrls) {
        content.push({ type: "image_url", image_url: { url } });
      }

      return { role: "user", content: content as any };
    };

    const systemMessage = {
      role: "system",
      content:
        "You are a precise assistant. Read the lesson snippets (and images if provided) and answer the user's query. " +
        "Return concise, actionable guidance with numbered bullets. Reference lesson_id when useful. " +
        "If lessons are weakly related, say so.",
    };

    const models = [preferredChatModel(), "gpt-4o"];
    const includeImagesOptions = imageUrls.length > 0 ? [true, false] : [false];

    let insights = "";
    let lastError: any = null;

    for (const model of models) {
      for (const includeImages of includeImagesOptions) {
        try {
          const chat = await openai.chat.completions.create({
            model,
            messages: [systemMessage, buildUserMessage(includeImages)],
            temperature: 0.2,
          });
          insights = chat.choices?.[0]?.message?.content?.trim() || "";
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          continue;
        }
      }
      if (insights) {
        break;
      }
    }

    if (!insights) {
      throw lastError || new Error("Assistant failed to generate insights.");
    }

    return NextResponse.json({
      ok: true,
      query,
      topK,
      threshold,
      matches: usedMatches,
      insights,
    });
  } catch (err: any) {
    console.error("Query route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

