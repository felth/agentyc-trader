import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { Pinecone } from "@pinecone-database/pinecone";

import { DEFAULT_AGENT_SOURCES } from "../../../../lib/agentSources";

type AgentChatRequest = {

  message: string;

  history?: Array<{ role: "user" | "assistant"; content: string }>;

  sources?: string[]; // optional override in future

};

export const runtime = "nodejs";

export async function POST(req: NextRequest) {

  try {

    const body = (await req.json()) as AgentChatRequest;

    const message = body.message?.trim();

    if (!message) {

      return NextResponse.json(

        { ok: false, error: "message required" },

        { status: 400 }

      );

    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

    const index = pc.index(

      process.env.PINECONE_INDEX!,

      process.env.PINECONE_HOST!

    );

    // Decide which sources to use (RAG scope)

    const sources =

      Array.isArray(body.sources) && body.sources.length > 0

        ? body.sources

        : DEFAULT_AGENT_SOURCES;

    // Embed user message

    const embed = await openai.embeddings.create({

      model: "text-embedding-3-large",

      input: message,

    });

    const vector = embed.data[0].embedding;

    // Query Pinecone using your data only (scoped by source)

    const results = await index.query({

      vector,

      topK: 5,

      includeMetadata: true,

      filter: {

        source: { $in: sources },

      },

    });

    const matches =

      results.matches

        ?.filter((m) => (m.score ?? 0) > 0.7)

        .map((m) => ({

          id: m.id,

          score: m.score,

          metadata: m.metadata,

        })) ?? [];

    const context = matches

      .map((m) => {

        const md: any = m.metadata ?? {};

        return `${md.lesson_id ?? ""} — ${md.concept ?? ""}\n${md.notes ?? ""}`;

      })

      .join("\n\n");

    const history = body.history || [];

    const messages = [

      {

        role: "system" as const,

        content:

          "You are Liam's trading agent. Answer using ONLY the provided lessons. Be concise, actionable, and cite lesson_ids where helpful.",

      },

      ...history,

      {

        role: "user" as const,

        content: `User query:\n${message}\n\nRelevant lessons:\n${context || "(none found in current scope)"}`,

      },

    ];

    const chat = await openai.chat.completions.create({

      model: process.env.OPENAI_AGENT_MODEL || "gpt-4o-mini",

      messages,

      temperature: 0.2,

    });

    const responseText = chat.choices[0].message.content || "No insight found.";

    return NextResponse.json({

      ok: true,

      response: responseText,

      sources: matches,

      usedSources: sources,

    });

  } catch (err: any) {

    console.error("Agent chat error:", err);

    return NextResponse.json(

      { ok: false, error: err?.message ?? "Server error in /api/agent/chat" },

      { status: 500 }

    );

  }

}
