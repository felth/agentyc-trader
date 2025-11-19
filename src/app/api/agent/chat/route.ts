// src/app/api/agent/chat/route.ts

import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { Pinecone } from "@pinecone-database/pinecone";

import { DEFAULT_AGENT_SOURCES } from "@/lib/agentSources";



export const runtime = "nodejs";



type Role = "user" | "assistant";



type HistoryItem = {

  role: Role;

  content: string;

};



interface AgentChatRequest {

  message: string;

  history?: HistoryItem[];

  sources?: string[];

}



export async function POST(req: NextRequest) {

  try {

    const body = (await req.json()) as AgentChatRequest;

    const userMessage = body.message?.trim();



    if (!userMessage) {

      return NextResponse.json(

        { ok: false, error: "message required" },

        { status: 400 }

      );

    }



    // Decide which sources to use (normalize/trim)

    const incomingSources = body.sources && body.sources.length > 0

      ? body.sources.map((s) => s.trim()).filter(Boolean)

      : null;

    const resolvedSources = incomingSources || DEFAULT_AGENT_SOURCES;

    // Debug logging to verify request body
    console.log("AGENT_REQUEST", {

      bodySources: body.sources,

      resolvedSources,

      message: body.message

    });



    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

    const index = pc.index(

      process.env.PINECONE_INDEX!,

      process.env.PINECONE_HOST!

    );



    // 1) Embed the user message

    const embed = await openai.embeddings.create({

      model: "text-embedding-3-large",

      input: userMessage,

    });



    const embedding = embed.data?.[0]?.embedding;

    if (!embedding || embedding.length === 0) {

      return NextResponse.json(

        { ok: false, error: "Failed to create embedding for agent query" },

        { status: 500 }

      );

    }



    // 2) Query Pinecone, filtered by sources if provided

    const pineFilter =

      resolvedSources.length > 0

        ? {

            source: { $in: resolvedSources },

          }

        : undefined;



    const pineRes = await index.query({

      vector: embedding,

      topK: 5,

      includeMetadata: true,

      ...(pineFilter && { filter: pineFilter }),

    });



    const rawMatches = pineRes.matches ?? [];

    const minScore = 0.6;



    const strongMatches = rawMatches.filter((m) => (m.score ?? 0) >= minScore);



    // Fallback: if nothing clears the bar, still use the best 1–2 matches

    const matchesToUse =

      strongMatches.length > 0 ? strongMatches : rawMatches.slice(0, 2);



    // 3) Build textual context from the matches

    const context = matchesToUse

      .map((m) => {

        const md = (m.metadata ?? {}) as Record<string, unknown>;

        const concept =

          typeof md.concept === "string" ? (md.concept as string) : "";

        const notes =

          typeof md.notes === "string" ? (md.notes as string) : "";

        const lessonId =

          typeof md.lesson_id === "string" ? (md.lesson_id as string) : "";

        const source =

          typeof md.source === "string" ? (md.source as string) : "";



        const headerParts = [

          lessonId && `Lesson ${lessonId}`,

          source && `(source: ${source})`,

        ].filter(Boolean);



        const header = headerParts.length > 0 ? headerParts.join(" ") : "";

        const conceptLine = concept ? `Concept: ${concept}` : "";

        const notesLine = notes ? `Notes: ${notes}` : "";



        return [header, conceptLine, notesLine].filter(Boolean).join("\n");

      })

      .filter(Boolean)

      .join("\n\n");



    const history: HistoryItem[] = body.history ?? [];



    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [

      {

        role: "system",

        content:

          "You are Liam's trading agent. Answer ONLY using the lessons in the 'Context' section. " +

          "If the context is empty or clearly unrelated, say you don't have a playbook rule yet and ask what he wants to add. " +

          "Be concise and actionable. When you use a lesson, mention its lesson_id.",

      },

      ...history.map((h) => ({

        role: h.role,

        content: h.content,

      })),

      {

        role: "user",

        content: `User question: ${userMessage}\n\nContext:\n${

          context || "(no matching lessons)"

        }`,

      },

    ];



    // 4) Call OpenAI chat completion

    const completion = await openai.chat.completions.create({

      model: process.env.OPENAI_AGENT_MODEL || "gpt-4o-mini",

      messages,

      temperature: 0.2,

    });



    const reply = completion.choices[0]?.message?.content ?? "";



    // 5) Shape the sources for the client

    const sourcesOut = matchesToUse.map((m) => ({

      id: m.id,

      score: m.score,

      metadata: m.metadata,

    }));



    return NextResponse.json({

      ok: true,

      response: reply,

      sources: sourcesOut,

      usedSources: resolvedSources,

    });

  } catch (err) {

    const message =

      err instanceof Error ? err.message : "Unknown error in agent/chat";

    console.error("agent/chat error:", err);

    return NextResponse.json({ ok: false, error: message }, { status: 500 });

  }

}