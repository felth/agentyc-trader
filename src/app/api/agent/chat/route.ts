// src/app/api/agent/chat/route.ts

import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { Pinecone } from "@pinecone-database/pinecone";

import { DEFAULT_AGENT_SOURCES } from "@/lib/agentSources";



export const runtime = "nodejs";



type HistoryItem = { role: "user" | "assistant"; content: string };



interface AgentChatRequest {

  message: string;

  history?: HistoryItem[];

  sources?: string[];

}



export async function POST(req: NextRequest) {

  try {

    const body: AgentChatRequest = await req.json();



    const userMessage = body.message?.trim();

    if (!userMessage) {

      return NextResponse.json(

        { ok: false, error: "message required" },

        { status: 400 }

      );

    }



    // Determine which sources to use

    const incoming = Array.isArray(body.sources) ? body.sources : [];

    const usedSources =

      incoming.length > 0 ? incoming : DEFAULT_AGENT_SOURCES;



    // Instantiate clients

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

    const index = pc.index(

      process.env.PINECONE_INDEX!,

      process.env.PINECONE_HOST!

    );



    // Embed the message

    const embed = await openai.embeddings.create({

      model: "text-embedding-3-large",

      input: userMessage

    });



    const vector = embed.data?.[0]?.embedding;

    if (!vector || vector.length === 0) {

      return NextResponse.json(

        { ok: false, error: "failed to generate embedding" },

        { status: 500 }

      );

    }



    // Query Pinecone using the allowed sources

    const results = await index.query({

      vector,

      topK: 5,

      includeMetadata: true,

      filter: {

        source: { $in: usedSources }

      }

    });



    const matches =

      results.matches

        ?.filter((m) => (m.score ?? 0) > 0.7)

        .map((m) => ({

          id: m.id,

          score: m.score,

          metadata: m.metadata

        })) ?? [];



    const context =

      matches

        .map((m) => `${m.metadata?.concept}: ${m.metadata?.notes}`)

        .join("\n\n") || "No lessons available.";



    // Build chat messages

    const history = body.history || [];

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [

      {

        role: "system",

        content:

          "You are Liam's trading agent. Only use the provided lessons. Do not invent facts. Be direct, actionable. Cite lesson IDs."

      },

      ...history.map(h => ({ role: h.role, content: h.content })),

      {

        role: "user",

        content: `User query: ${userMessage}\n\nLessons:\n${context}`

      }

    ];



    const completion = await openai.chat.completions.create({

      model: process.env.OPENAI_AGENT_MODEL || "gpt-4o-mini",

      messages,

      temperature: 0.2

    });



    const reply =

      completion.choices?.[0]?.message?.content ||

      "No insight found.";



    return NextResponse.json({

      ok: true,

      response: reply,

      sources: matches,

      usedSources

    });

  } catch (err: any) {

    console.error("agent/chat error:", err);

    return NextResponse.json(

      { ok: false, error: err.message },

      { status: 500 }

    );

  }

}
