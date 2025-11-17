// src/app/api/agent/chat/route.ts

import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { Pinecone } from "@pinecone-database/pinecone";

import { AGENT_DEFAULT_SOURCES } from "../../../../lib/sources";



type AgentChatRequest = {

  message: string;

  history?: Array<{ role: "user" | "assistant"; content: string }>;

};



export const runtime = "nodejs";



export async function POST(req: NextRequest) {

  try {

    const body: AgentChatRequest = await req.json();

    const message = body.message?.trim();

    if (!message) return NextResponse.json({ ok: false, error: "message required" }, { status: 400 });



    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

    const index = pc.index(process.env.PINECONE_INDEX!, process.env.PINECONE_HOST!);



    // Embed message

    const embed = await openai.embeddings.create({

      model: "text-embedding-3-large",

      input: message

    });

    const vector = embed.data[0].embedding;



    // Query Pinecone (your data only)

    const results = await index.query({

      vector,

      topK: 5,

      includeMetadata: true,

      filter: { source: { $in: AGENT_DEFAULT_SOURCES } }

    });



    const matches = results.matches?.filter(m => m.score! > 0.7).map(m => ({

      id: m.id,

      score: m.score,

      metadata: m.metadata

    })) || [];



    // Synthesize with GPT (grounded in matches)

    const context = matches.map(m => `${m.metadata?.concept}: ${m.metadata?.notes}`).join('\n\n');

    const history = body.history || [];

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [

      { role: "system", content: "You are Liam's trading agent. Answer using ONLY the provided lessons. Be concise, actionable. Cite lesson IDs." },

      ...history.map(h => ({ role: h.role, content: h.content })),

      { role: "user", content: `Query: ${message}\n\nLessons:\n${context}` }

    ];



    const chat = await openai.chat.completions.create({

      model: process.env.OPENAI_AGENT_MODEL || "gpt-4o-mini",

      messages,

      temperature: 0.2

    });



    const response = chat.choices[0].message.content || "No insight found.";



    return NextResponse.json({ ok: true, response, sources: matches });

  } catch (err: any) {

    console.error(err);

    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });

  }

}

