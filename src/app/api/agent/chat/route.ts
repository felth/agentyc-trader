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

    // Existing playbook index (distilled lessons)

    const playbookIndex = pc.index(

      process.env.PINECONE_INDEX!,

      process.env.PINECONE_HOST!

    );

    // NEW corpus index (long-form chunks)

    const corpusIndex = pc.index(

      process.env.PINECONE_CORPUS_INDEX!,

      process.env.PINECONE_HOST!

    );



    // 1) Embed user question

    const embed = await openai.embeddings.create({

      model: "text-embedding-3-large",

      input: userMessage

    });



    const queryVector = embed.data[0]?.embedding;

    if (!queryVector || queryVector.length === 0) {

      return NextResponse.json(

        { ok: false, error: "Failed to create embedding for agent query" },

        { status: 500 }

      );

    }



    // Build filter for both indices

    const pineFilter =

      resolvedSources.length > 0

        ? {

            source: { $in: resolvedSources },

          }

        : undefined;



    // 2) Query playbook rules (distilled memory)

    const playbookResults = await playbookIndex.query({

      vector: queryVector,

      topK: 5,

      includeMetadata: true,

      ...(pineFilter && { filter: pineFilter })

    });



    // 3) Query deep corpus (long-form chunks)

    const corpusResults = await corpusIndex.query({

      vector: queryVector,

      topK: 10,

      includeMetadata: true,

      ...(pineFilter && { filter: pineFilter })

    });



    // 4) Build contexts

    const playbookMatches = playbookResults.matches || [];

    const corpusMatches = corpusResults.matches || [];



    const playbookContext = playbookMatches

      .map(m => {

        const md: any = m.metadata || {};

        return `Rule (${md.lesson_id ?? "unknown"}): ${md.concept ?? ""}\n${md.notes ?? ""}`.trim();

      })

      .filter(Boolean)

      .join("\n\n");



    const corpusContext = corpusMatches

      .map(m => {

        const md: any = m.metadata || {};

        return `Excerpt [chunk ${md.chunk_index ?? "?"}]: ${md.content ?? ""}`.trim();

      })

      .filter(Boolean)

      .join("\n\n");



    // 5) Compose system prompt

    const systemPrompt = `

You are Liam's trading agent.

You MUST:

- Use PLAYBOOK rules as the primary, authoritative source.

- Use DEEP CORPUS excerpts only as supporting detail and nuance.

When answering:

- Start by stating the key rule(s) from the playbook.

- Then explain and deepen using relevant excerpts from the corpus (if helpful).

- Be concise and actionable.

- Cite lesson IDs where possible (e.g., "lesson_id: playbook-xyz").

`;



    const history: HistoryItem[] = body.history ?? [];



    // 6) Call chat completion

    const completion = await openai.chat.completions.create({

      model: process.env.OPENAI_AGENT_MODEL || "gpt-4o-mini",

      temperature: 0.2,

      messages: [

        { role: "system", content: systemPrompt },

        ...history.map((h) => ({

          role: h.role,

          content: h.content,

        })),

        {

          role: "user",

          content: `

QUESTION:

${userMessage}

PLAYBOOK RULES:

${playbookContext || "None found"}

DEEP CORPUS EXCERPTS:

${corpusContext || "None found"}

`

        }

      ]

    });



    const reply = completion.choices[0]?.message?.content || "No insight found.";



    // Include both sets of matches for debugging/inspection

    return NextResponse.json({

      ok: true,

      response: reply,

      sources: {

        playbook: playbookMatches,

        corpus: corpusMatches

      },

      usedSources: resolvedSources

    });

  } catch (err) {

    const message =

      err instanceof Error ? err.message : "Unknown error in agent/chat";

    console.error("agent/chat error:", err);

    return NextResponse.json({ ok: false, error: message }, { status: 500 });

  }

}